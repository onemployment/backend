import request from 'supertest';
import { Application } from 'express';
import { createTestApp, createTestUser, TestAppSetup } from '../helpers/utils';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';

const globalWithPostgres = global as typeof globalThis & {
  postgresContainer: StartedPostgreSqlContainer;
  prismaClient: PrismaClient;
};

describe('Local Authentication Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: Application;

  beforeEach(() => {
    testSetup = createTestApp(globalWithPostgres.prismaClient);
    app = testSetup.app;
  });

  describe('POST /auth/login - Local User Authentication', () => {
    describe('successful login scenarios', () => {
      it('should authenticate user with valid email and password', async () => {
        // Create a test user first
        const testUser = await createTestUser(testSetup.userRepository, {
          email: 'auth@test.com',
          username: 'authuser',
          password: 'AuthPass123!',
          firstName: 'Auth',
          lastName: 'User',
        });

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'auth@test.com',
            password: 'AuthPass123!',
          })
          .expect(200);

        // Verify response structure
        expect(response.body).toHaveProperty('message', 'Login successful');
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');

        // Verify JWT token
        expect(typeof response.body.token).toBe('string');
        expect(response.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // Basic JWT format

        // Verify user data
        expect(response.body.user).toEqual({
          id: testUser.id,
          email: 'auth@test.com',
          username: 'authuser',
          firstName: 'Auth',
          lastName: 'User',
          displayName: null,
          emailVerified: false,
          createdAt: testUser.createdAt.toISOString(),
          lastLoginAt: expect.any(String), // Should be updated
        });

        // Verify JWT token contains proper claims
        const payload = await testSetup.jwtUtil.validateToken(
          response.body.token
        );
        expect(payload.sub).toBe(testUser.id);
        expect(payload.email).toBe('auth@test.com');
        expect(payload.username).toBe('authuser');
        expect(payload.iss).toBe('onemployment-auth');
        expect(payload.aud).toBe('onemployment-api');
      });

      it('should update lastLoginAt timestamp on successful login', async () => {
        const testUser = await createTestUser(testSetup.userRepository, {
          email: 'timestamp@test.com',
          password: 'TimestampPass123!',
        });

        const originalLoginTime = testUser.lastLoginAt;

        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'timestamp@test.com',
            password: 'TimestampPass123!',
          })
          .expect(200);

        // Verify lastLoginAt was updated in database
        const updatedUser =
          await testSetup.userRepository.findByEmail('timestamp@test.com');
        expect(updatedUser).toBeTruthy();
        expect(updatedUser!.lastLoginAt).not.toEqual(originalLoginTime);
        expect(updatedUser!.lastLoginAt).toBeInstanceOf(Date);
        expect(updatedUser!.lastLoginAt!.getTime()).toBeGreaterThan(
          Date.now() - 5000
        ); // Within last 5 seconds
      });
    });

    describe('authentication failure scenarios', () => {
      it('should reject login with non-existent email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'SomePassword123!',
          })
          .expect(401);

        expect(response.body).toEqual({
          message: 'Invalid email or password',
        });
      });

      it('should reject login with incorrect password', async () => {
        await createTestUser(testSetup.userRepository, {
          email: 'wrong@test.com',
          password: 'CorrectPass123!',
        });

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'wrong@test.com',
            password: 'WrongPassword123!',
          })
          .expect(401);

        expect(response.body).toEqual({
          message: 'Invalid email or password',
        });
      });

      it('should handle case-insensitive email lookup', async () => {
        await createTestUser(testSetup.userRepository, {
          email: 'case@test.com',
          password: 'CasePass123!',
        });

        // Test with different case variations
        const testCases = ['CASE@TEST.COM', 'Case@Test.Com', 'cAsE@tEsT.cOm'];

        for (const emailCase of testCases) {
          const response = await request(app)
            .post('/api/v1/auth/login')
            .send({
              email: emailCase,
              password: 'CasePass123!',
            })
            .expect(200);

          expect(response.body).toHaveProperty('message', 'Login successful');
          expect(response.body).toHaveProperty('token');
        }
      });
    });

    describe('input validation', () => {
      it('should require email field', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            password: 'Password123!',
          })
          .expect(400);

        expect(response.body).toEqual({
          message: 'Invalid request',
        });
      });

      it('should require password field', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
          })
          .expect(400);

        expect(response.body).toEqual({
          message: 'Invalid request',
        });
      });

      it('should validate email format', async () => {
        const invalidEmails = [
          'invalid-email',
          'test@',
          '@example.com',
          'test.example.com',
        ];

        for (const email of invalidEmails) {
          const response = await request(app)
            .post('/api/v1/auth/login')
            .send({
              email,
              password: 'Password123!',
            })
            .expect(400);

          expect(response.body).toEqual({
            message: 'Invalid request',
          });
        }
      });

      it('should require non-empty password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: '',
          })
          .expect(400);

        expect(response.body).toEqual({
          message: 'Invalid request',
        });
      });
    });
  });

  describe('POST /auth/logout - User Logout', () => {
    it('should handle logout request (JWT stateless)', async () => {
      const testUser = await createTestUser(testSetup.userRepository);
      const token = await testSetup.jwtUtil.generateToken(testUser);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logout successful',
      });
    });

    it('should require authentication for logout', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body).toEqual({
        message: 'No token provided',
      });
    });

    it('should reject invalid JWT token for logout', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body).toEqual({
        message: 'Invalid or expired token',
      });
    });
  });

  describe('JWT token validation', () => {
    it('should generate JWT with 8-hour expiry', async () => {
      const testUser = await createTestUser(testSetup.userRepository);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.plainPassword,
        })
        .expect(200);

      const payload = await testSetup.jwtUtil.validateToken(
        response.body.token
      );

      // Verify 8-hour expiry (28800 seconds)
      const expectedExpiry = payload.iat + 28800;
      expect(payload.exp).toBe(expectedExpiry);

      // Verify expiry is approximately 8 hours from now
      const expiryDate = new Date(payload.exp * 1000);
      const now = new Date();
      const hoursUntilExpiry =
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(hoursUntilExpiry).toBeGreaterThan(7.9);
      expect(hoursUntilExpiry).toBeLessThan(8.1);
    });

    it('should include all required JWT claims', async () => {
      const testUser = await createTestUser(testSetup.userRepository, {
        email: 'jwt@test.com',
        username: 'jwtuser',
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'jwt@test.com',
          password: testUser.plainPassword,
        })
        .expect(200);

      const payload = await testSetup.jwtUtil.validateToken(
        response.body.token
      );

      // Verify all required claims are present
      expect(payload).toHaveProperty('sub', testUser.id);
      expect(payload).toHaveProperty('email', 'jwt@test.com');
      expect(payload).toHaveProperty('username', 'jwtuser');
      expect(payload).toHaveProperty('iss', 'onemployment-auth');
      expect(payload).toHaveProperty('aud', 'onemployment-api');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');

      // Verify no sensitive data in JWT
      expect(payload).not.toHaveProperty('password');
      expect(payload).not.toHaveProperty('passwordHash');
    });
  });

  describe('database integration', () => {
    it('should persist login activity tracking', async () => {
      const testUser = await createTestUser(testSetup.userRepository);

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.plainPassword,
        })
        .expect(200);

      // Verify database state
      const dbUser = await testSetup.prismaClient.user.findUnique({
        where: { email: testUser.email },
      });

      expect(dbUser).toBeTruthy();
      expect(dbUser!.lastLoginAt).toBeInstanceOf(Date);
      expect(dbUser!.lastLoginAt!.getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    it('should handle concurrent login attempts', async () => {
      const testUser = await createTestUser(testSetup.userRepository);

      const loginPromises = Array(5)
        .fill(null)
        .map(() =>
          request(app).post('/api/v1/auth/login').send({
            email: testUser.email,
            password: testUser.plainPassword,
          })
        );

      const responses = await Promise.all(loginPromises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
      });
    });
  });
});
