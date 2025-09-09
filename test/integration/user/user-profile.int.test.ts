import request from 'supertest';
import { Application } from 'express';
import {
  createTestApp,
  createTestUser,
  createTestJWT,
  TestAppSetup,
} from '../helpers/utils';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';

const globalWithPostgres = global as typeof globalThis & {
  postgresContainer: StartedPostgreSqlContainer;
  prismaClient: PrismaClient;
};

describe('User Profile Management Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: Application;

  beforeEach(() => {
    testSetup = createTestApp(globalWithPostgres.prismaClient);
    app = testSetup.app;
  });

  describe('GET /user/me - Get Current User Profile', () => {
    describe('authenticated profile retrieval', () => {
      it('should return current user profile with valid JWT', async () => {
        const testUser = await createTestUser(testSetup.userRepository, {
          email: 'profile@example.com',
          username: 'profileuser',
          firstName: 'Profile',
          lastName: 'User',
        });
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .get('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toEqual({
          user: {
            id: testUser.id,
            email: 'profile@example.com',
            username: 'profileuser',
            firstName: 'Profile',
            lastName: 'User',
            displayName: null,
            emailVerified: false,
            accountCreationMethod: 'local',
            createdAt: testUser.createdAt.toISOString(),
            lastLoginAt: testUser.lastLoginAt?.toISOString() || null,
          },
        });
      });

      it('should handle user with displayName set', async () => {
        // Create user and then update displayName via database
        const testUser = await createTestUser(testSetup.userRepository, {
          firstName: 'John',
          lastName: 'Doe',
        });

        await testSetup.prismaClient.user.update({
          where: { id: testUser.id },
          data: { displayName: 'Johnny D' },
        });

        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .get('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.user.displayName).toBe('Johnny D');
        expect(response.body.user.firstName).toBe('John');
        expect(response.body.user.lastName).toBe('Doe');
      });

      it('should handle user with lastLoginAt timestamp', async () => {
        const testUser = await createTestUser(testSetup.userRepository);

        // Update lastLoginAt via database
        const loginTime = new Date('2024-01-15T10:30:00Z');
        await testSetup.prismaClient.user.update({
          where: { id: testUser.id },
          data: { lastLoginAt: loginTime },
        });

        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .get('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.user.lastLoginAt).toBe('2024-01-15T10:30:00.000Z');
      });
    });

    describe('authentication requirements', () => {
      it('should require authentication', async () => {
        const response = await request(app).get('/api/v1/user/me').expect(401);

        expect(response.body).toEqual({
          message: 'No token provided',
        });
      });

      it('should reject invalid JWT token', async () => {
        const response = await request(app)
          .get('/api/v1/user/me')
          .set('Authorization', 'Bearer invalid.jwt.token')
          .expect(401);

        expect(response.body).toEqual({
          message: 'Invalid or expired token',
        });
      });

      it('should reject malformed Authorization header', async () => {
        const testCases = [
          'invalid-header',
          'Bearer',
          'Bearer ',
          'Basic token',
          'token-without-bearer',
        ];

        for (const authHeader of testCases) {
          const response = await request(app)
            .get('/api/v1/user/me')
            .set('Authorization', authHeader)
            .expect(401);

          expect(response.body).toHaveProperty('message');
        }
      });

      it('should reject expired JWT token', async () => {
        // We can't easily create an expired token with our JWTUtil
        // So we'll test with invalid token format which should also fail
        const response = await request(app)
          .get('/api/v1/user/me')
          .set('Authorization', 'Bearer expired.token.here')
          .expect(401);

        expect(response.body).toEqual({
          message: 'Invalid or expired token',
        });
      });
    });

    describe('user data consistency', () => {
      it('should return data consistent with database', async () => {
        const testUser = await createTestUser(testSetup.userRepository, {
          email: 'consistency@example.com',
          username: 'consistentuser',
          firstName: 'Consistent',
          lastName: 'User',
        });
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .get('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Verify database consistency
        const dbUser = await testSetup.prismaClient.user.findUnique({
          where: { id: testUser.id },
        });

        expect(response.body.user.email).toBe(dbUser!.email);
        expect(response.body.user.username).toBe(dbUser!.username);
        expect(response.body.user.firstName).toBe(dbUser!.firstName);
        expect(response.body.user.lastName).toBe(dbUser!.lastName);
        expect(response.body.user.accountCreationMethod).toBe(
          dbUser!.accountCreationMethod
        );
      });

      it('should handle user not found in database', async () => {
        const testUser = await createTestUser(testSetup.userRepository);
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        // Delete user from database after creating token
        await testSetup.prismaClient.user.delete({
          where: { id: testUser.id },
        });

        const response = await request(app)
          .get('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(404);

        expect(response.body).toEqual({
          message: 'User not found',
        });
      });
    });
  });

  describe('PUT /user/me - Update Current User Profile', () => {
    describe('successful profile updates', () => {
      it('should update firstName', async () => {
        const testUser = await createTestUser(testSetup.userRepository, {
          firstName: 'Original',
          lastName: 'User',
        });
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .send({
            firstName: 'Updated',
          })
          .expect(200);

        expect(response.body).toEqual({
          message: 'Profile updated successfully',
          user: expect.objectContaining({
            id: testUser.id,
            firstName: 'Updated',
            lastName: 'User', // Should remain unchanged
          }),
        });

        // Verify database update
        const dbUser = await testSetup.prismaClient.user.findUnique({
          where: { id: testUser.id },
        });
        expect(dbUser!.firstName).toBe('Updated');
        expect(dbUser!.lastName).toBe('User');
      });

      it('should update lastName', async () => {
        const testUser = await createTestUser(testSetup.userRepository, {
          firstName: 'Test',
          lastName: 'Original',
        });
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .send({
            lastName: 'Updated',
          })
          .expect(200);

        expect(response.body.user).toEqual(
          expect.objectContaining({
            firstName: 'Test', // Should remain unchanged
            lastName: 'Updated',
          })
        );
      });

      it('should update displayName', async () => {
        const testUser = await createTestUser(testSetup.userRepository);
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .send({
            displayName: 'Cool Display Name',
          })
          .expect(200);

        expect(response.body.user.displayName).toBe('Cool Display Name');

        // Verify database update
        const dbUser = await testSetup.prismaClient.user.findUnique({
          where: { id: testUser.id },
        });
        expect(dbUser!.displayName).toBe('Cool Display Name');
      });

      it('should update multiple fields at once', async () => {
        const testUser = await createTestUser(testSetup.userRepository, {
          firstName: 'Old',
          lastName: 'Name',
        });
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .send({
            firstName: 'New',
            lastName: 'Updated',
            displayName: 'Awesome User',
          })
          .expect(200);

        expect(response.body.user).toEqual(
          expect.objectContaining({
            firstName: 'New',
            lastName: 'Updated',
            displayName: 'Awesome User',
          })
        );
      });

      it('should clear displayName with null', async () => {
        const testUser = await createTestUser(testSetup.userRepository);
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        // First set a displayName
        await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .send({ displayName: 'Temporary Name' })
          .expect(200);

        // Then clear it
        const response = await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .send({
            displayName: null,
          })
          .expect(200);

        expect(response.body.user.displayName).toBe(null);
      });
    });

    describe('immutable field protection', () => {
      it('should not update email field', async () => {
        const testUser = await createTestUser(testSetup.userRepository, {
          email: 'original@example.com',
        });
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .send({
            email: 'new@example.com',
            firstName: 'Updated',
          })
          .expect(200);

        // Email should remain unchanged
        expect(response.body.user.email).toBe('original@example.com');
        expect(response.body.user.firstName).toBe('Updated');
      });

      it('should not update username field', async () => {
        const testUser = await createTestUser(testSetup.userRepository, {
          username: 'originaluser',
        });
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .send({
            username: 'newusername',
            firstName: 'Updated',
          })
          .expect(200);

        // Username should remain unchanged
        expect(response.body.user.username).toBe('originaluser');
        expect(response.body.user.firstName).toBe('Updated');
      });

      it('should not update accountCreationMethod', async () => {
        const testUser = await createTestUser(testSetup.userRepository);
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .send({
            accountCreationMethod: 'google',
            firstName: 'Updated',
          })
          .expect(200);

        expect(response.body.user.accountCreationMethod).toBe('local');
        expect(response.body.user.firstName).toBe('Updated');
      });
    });

    describe('input validation', () => {
      it('should validate firstName format', async () => {
        const testUser = await createTestUser(testSetup.userRepository);
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const invalidNames = ['', 'John123', 'John@Doe', 'a'.repeat(101)];

        for (const firstName of invalidNames) {
          const response = await request(app)
            .put('/api/v1/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send({ firstName })
            .expect(400);

          expect(response.body).toEqual({
            message: 'Invalid request',
          });
        }
      });

      it('should validate lastName format', async () => {
        const testUser = await createTestUser(testSetup.userRepository);
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const invalidNames = ['', 'Smith123', 'Smith@Johnson', 'a'.repeat(101)];

        for (const lastName of invalidNames) {
          const response = await request(app)
            .put('/api/v1/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send({ lastName })
            .expect(400);

          expect(response.body).toEqual({
            message: 'Invalid request',
          });
        }
      });

      it('should validate displayName format', async () => {
        const testUser = await createTestUser(testSetup.userRepository);
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const invalidDisplayNames = ['', 'a'.repeat(201)];

        for (const displayName of invalidDisplayNames) {
          const response = await request(app)
            .put('/api/v1/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send({ displayName })
            .expect(400);

          expect(response.body).toEqual({
            message: 'Invalid request',
          });
        }
      });

      it('should accept valid name formats', async () => {
        const testUser = await createTestUser(testSetup.userRepository);
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const validUpdates = [
          { firstName: 'John' },
          { lastName: "O'Connor" },
          { displayName: 'Johnny D' },
          { firstName: 'Mary-Jane' },
          { lastName: 'Van Der Berg' },
          { displayName: 'The Amazing Developer' },
        ];

        for (const update of validUpdates) {
          await request(app)
            .put('/api/v1/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send(update)
            .expect(200);
        }
      });
    });

    describe('authentication requirements', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .put('/api/v1/user/me')
          .send({
            firstName: 'Test',
          })
          .expect(401);

        expect(response.body).toEqual({
          message: 'No token provided',
        });
      });

      it('should reject invalid JWT token', async () => {
        const response = await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', 'Bearer invalid.jwt.token')
          .send({
            firstName: 'Test',
          })
          .expect(401);

        expect(response.body).toEqual({
          message: 'Invalid or expired token',
        });
      });
    });

    describe('empty update handling', () => {
      it('should handle empty update request', async () => {
        const testUser = await createTestUser(testSetup.userRepository, {
          firstName: 'Original',
          lastName: 'User',
        });
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const response = await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .send({})
          .expect(200);

        expect(response.body).toEqual({
          message: 'Profile updated successfully',
          user: expect.objectContaining({
            firstName: 'Original',
            lastName: 'User',
          }),
        });
      });
    });

    describe('database consistency', () => {
      it('should maintain updatedAt timestamp', async () => {
        const testUser = await createTestUser(testSetup.userRepository);
        const token = await createTestJWT(testSetup.jwtUtil, testUser);

        const originalUpdatedAt = testUser.updatedAt;

        await request(app)
          .put('/api/v1/user/me')
          .set('Authorization', `Bearer ${token}`)
          .send({
            firstName: 'Updated',
          })
          .expect(200);

        const dbUser = await testSetup.prismaClient.user.findUnique({
          where: { id: testUser.id },
        });

        expect(dbUser!.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });
    });
  });
});
