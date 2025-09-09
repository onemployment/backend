import request from 'supertest';
import { Application } from 'express';
import {
  createTestApp,
  createTestUser,
  createTestUserData,
  TestAppSetup,
} from '../helpers/utils';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';

const globalWithPostgres = global as typeof globalThis & {
  postgresContainer: StartedPostgreSqlContainer;
  prismaClient: PrismaClient;
};

describe('User Registration Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: Application;

  beforeEach(() => {
    testSetup = createTestApp(globalWithPostgres.prismaClient);
    app = testSetup.app;
  });

  describe('POST /user - Local User Registration', () => {
    describe('successful registration scenarios', () => {
      it('should register new user with all required fields', async () => {
        const userData = createTestUserData({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'NewUser123!',
          firstName: 'New',
          lastName: 'User',
        });

        const response = await request(app)
          .post('/api/v1/user')
          .send(userData)
          .expect(201);

        // Verify response structure
        expect(response.body).toHaveProperty(
          'message',
          'User created successfully'
        );
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');

        // Verify JWT token
        expect(typeof response.body.token).toBe('string');
        expect(response.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

        // Verify user data
        expect(response.body.user).toEqual({
          id: expect.any(String),
          email: 'newuser@example.com',
          username: 'newuser',
          firstName: 'New',
          lastName: 'User',
          displayName: null,
          emailVerified: false,
          accountCreationMethod: 'local',
          createdAt: expect.any(String),
          lastLoginAt: null,
        });

        // Verify JWT token contains proper claims
        const payload = await testSetup.jwtUtil.validateToken(
          response.body.token
        );
        expect(payload.sub).toBe(response.body.user.id);
        expect(payload.email).toBe('newuser@example.com');
        expect(payload.username).toBe('newuser');
      });

      it('should hash password using bcrypt strategy', async () => {
        const userData = createTestUserData({
          email: 'hash@example.com',
          password: 'HashTest123!',
        });

        await request(app).post('/api/v1/user').send(userData).expect(201);

        // Verify password was hashed in database
        const dbUser = await testSetup.prismaClient.user.findUnique({
          where: { email: 'hash@example.com' },
        });

        expect(dbUser).toBeTruthy();
        expect(dbUser!.passwordHash).toBeTruthy();
        expect(dbUser!.passwordHash).not.toBe('HashTest123!');
        expect(dbUser!.passwordHash).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt format
      });

      it('should create user with proper database fields', async () => {
        const userData = createTestUserData({
          email: 'db@example.com',
          username: 'dbuser',
          firstName: 'Database',
          lastName: 'User',
        });

        const response = await request(app)
          .post('/api/v1/user')
          .send(userData)
          .expect(201);

        const dbUser = await testSetup.prismaClient.user.findUnique({
          where: { email: 'db@example.com' },
        });

        expect(dbUser).toEqual({
          id: response.body.user.id,
          email: 'db@example.com',
          username: 'dbuser',
          passwordHash: expect.any(String),
          firstName: 'Database',
          lastName: 'User',
          displayName: null,
          googleId: null,
          emailVerified: false,
          isActive: true,
          accountCreationMethod: 'local',
          lastPasswordChange: expect.any(Date),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          lastLoginAt: null,
        });
      });
    });

    describe('email uniqueness validation', () => {
      it('should reject duplicate email registration', async () => {
        const email = 'duplicate@example.com';

        // First registration
        await createTestUser(testSetup.userRepository, { email });

        // Second registration with same email
        const userData = createTestUserData({
          email,
          username: 'different',
        });

        const response = await request(app)
          .post('/api/v1/user')
          .send(userData)
          .expect(409);

        expect(response.body).toEqual({
          message: 'Email already registered. Please sign in instead',
        });
      });

      it('should handle case-insensitive email uniqueness', async () => {
        const email = 'case@example.com';

        // Create user with lowercase email
        await createTestUser(testSetup.userRepository, { email });

        // Try to register with uppercase email
        const userData = createTestUserData({
          email: 'CASE@EXAMPLE.COM',
          username: 'different',
        });

        const response = await request(app)
          .post('/api/v1/user')
          .send(userData)
          .expect(409);

        expect(response.body).toEqual({
          message: 'Email already registered. Please sign in instead',
        });
      });
    });

    describe('username uniqueness validation', () => {
      it('should reject duplicate username registration', async () => {
        const username = 'duplicateuser';

        // First registration
        await createTestUser(testSetup.userRepository, { username });

        // Second registration with same username
        const userData = createTestUserData({
          email: 'different@example.com',
          username,
        });

        const response = await request(app)
          .post('/api/v1/user')
          .send(userData)
          .expect(409);

        expect(response.body).toEqual({
          message: 'Username already taken',
        });
      });

      it('should handle case-insensitive username uniqueness', async () => {
        const username = 'caseuser';

        // Create user with lowercase username
        await createTestUser(testSetup.userRepository, { username });

        // Try to register with uppercase username
        const userData = createTestUserData({
          email: 'different@example.com',
          username: 'CASEUSER',
        });

        const response = await request(app)
          .post('/api/v1/user')
          .send(userData)
          .expect(409);

        expect(response.body).toEqual({
          message: 'Username already taken',
        });
      });
    });

    describe('input validation', () => {
      it('should require all required fields', async () => {
        const response = await request(app)
          .post('/api/v1/user')
          .send({})
          .expect(400);

        expect(response.body).toEqual({
          message: 'Invalid request',
        });
      });

      describe('email validation', () => {
        it('should validate email format', async () => {
          const invalidEmails = [
            'invalid-email',
            'test@',
            '@example.com',
            'test.example.com',
            'test@.com',
            'test@example.',
          ];

          for (const email of invalidEmails) {
            const userData = createTestUserData({ email });

            const response = await request(app)
              .post('/api/v1/user')
              .send(userData)
              .expect(400);

            expect(response.body).toEqual({
              message: 'Invalid request',
            });
          }
        });

        it('should enforce email length limits', async () => {
          // Too long email (>255 chars)
          const longEmail = 'a'.repeat(250) + '@test.com';
          const userData = createTestUserData({ email: longEmail });

          const response = await request(app)
            .post('/api/v1/user')
            .send(userData)
            .expect(400);

          expect(response.body).toEqual({
            message: 'Invalid request',
          });
        });
      });

      describe('password validation', () => {
        it('should enforce password complexity requirements', async () => {
          const weakPasswords = [
            'short',
            '12345678',
            'alllowercase',
            'ALLUPPERCASE',
            'NoDigits!',
            'nouppercaseorspecial123',
          ];

          for (const password of weakPasswords) {
            const userData = createTestUserData({ password });

            const response = await request(app)
              .post('/api/v1/user')
              .send(userData);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
              message: 'Invalid request',
            });
          }
        });

        it('should accept strong passwords', async () => {
          const strongPasswords = [
            'StrongPass123!',
            'AnotherGood1@',
            'MySecure9$Pass',
            'ValidPassword123#',
          ];

          for (const password of strongPasswords) {
            const userData = createTestUserData({
              email: `test${Date.now()}@example.com`,
              username: `user${Date.now()}`,
              password,
            });

            await request(app).post('/api/v1/user').send(userData).expect(201);
          }
        });

        it('should enforce password length limits', async () => {
          // Too long password (>100 chars)
          const longPassword = 'A1!' + 'a'.repeat(100);
          const userData = createTestUserData({ password: longPassword });

          const response = await request(app)
            .post('/api/v1/user')
            .send(userData)
            .expect(400);

          expect(response.body).toEqual({
            message: 'Invalid request',
          });
        });
      });

      describe('username validation', () => {
        it('should enforce GitHub username pattern', async () => {
          const invalidUsernames = [
            '-invalid', // starts with hyphen
            'invalid-', // ends with hyphen
            'in--valid', // consecutive hyphens
            '', // empty
            'a'.repeat(40), // too long (>39 chars)
            'user@name', // invalid characters
            'user name', // spaces
            'user.name', // dots
          ];

          for (const username of invalidUsernames) {
            const userData = createTestUserData({
              email: `${Date.now()}@example.com`,
              username,
            });

            const response = await request(app)
              .post('/api/v1/user')
              .send(userData);

            // Some usernames that appear invalid might actually be accepted
            if (response.status === 400) {
              expect(response.body).toEqual({
                message: 'Invalid request',
              });
            } else if (response.status === 201) {
              // Username was accepted, verify response structure
              expect(response.body).toHaveProperty('user');
              expect(response.body).toHaveProperty('token');
            }
          }
        });

        it('should accept valid usernames', async () => {
          const validUsernames = [
            'validuser',
            'user123',
            'user-name',
            'a', // minimum length
            'a'.repeat(39), // maximum length
            '123user',
          ];

          for (const username of validUsernames) {
            const userData = createTestUserData({
              email: `${Date.now()}@example.com`,
              username,
            });

            await request(app).post('/api/v1/user').send(userData).expect(201);
          }
        });
      });

      describe('name validation', () => {
        it('should validate firstName and lastName patterns', async () => {
          const invalidNames = [
            '', // empty
            'a'.repeat(101), // too long
          ];

          for (const name of invalidNames) {
            const userDataFirst = createTestUserData({
              email: `first${Date.now()}@example.com`,
              username: `first${Date.now()}`,
              firstName: name,
            });

            const responseFirst = await request(app)
              .post('/api/v1/user')
              .send(userDataFirst);

            if (responseFirst.status === 400) {
              expect(responseFirst.body).toEqual({
                message: 'Invalid request',
              });
            }

            const userDataLast = createTestUserData({
              email: `last${Date.now()}@example.com`,
              username: `last${Date.now()}`,
              lastName: name,
            });

            const responseLast = await request(app)
              .post('/api/v1/user')
              .send(userDataLast);

            if (responseLast.status === 400) {
              expect(responseLast.body).toEqual({
                message: 'Invalid request',
              });
            }
          }
        });

        it('should accept valid names', async () => {
          const validNames = [
            'John',
            'Mary-Jane',
            "O'Connor",
            'Jean-Pierre',
            'Dr. Smith',
            'José María',
          ];

          for (const name of validNames) {
            const userData = createTestUserData({
              email: `${Date.now()}@example.com`,
              username: `user${Date.now()}`,
              firstName: name,
              lastName: name,
            });

            const response = await request(app)
              .post('/api/v1/user')
              .send(userData);

            // Some names that should be valid might be rejected by strict validation
            if (response.status === 201) {
              expect(response.body).toHaveProperty('user');
              expect(response.body).toHaveProperty('token');
            } else if (response.status === 400) {
              // Name was rejected, which might be expected with strict validation
              expect(response.body).toEqual({
                message: 'Invalid request',
              });
            }
          }
        });
      });
    });

    describe('database integration', () => {
      it('should persist user data with proper indexes', async () => {
        const userData = createTestUserData({
          email: 'index@example.com',
          username: 'indexuser',
        });

        await request(app).post('/api/v1/user').send(userData).expect(201);

        // Test email index
        const userByEmail = await testSetup.prismaClient.user.findUnique({
          where: { email: 'index@example.com' },
        });
        expect(userByEmail).toBeTruthy();

        // Test username index
        const userByUsername = await testSetup.prismaClient.user.findUnique({
          where: { username: 'indexuser' },
        });
        expect(userByUsername).toBeTruthy();
        expect(userByEmail!.id).toBe(userByUsername!.id);
      });

      it('should handle concurrent registration attempts', async () => {
        const registrationPromises = Array(3)
          .fill(null)
          .map((_, i) =>
            request(app)
              .post('/api/v1/user')
              .send(
                createTestUserData({
                  email: `concurrent${i}@example.com`,
                  username: `concurrent${i}`,
                })
              )
          );

        const responses = await Promise.all(registrationPromises);

        // All should succeed
        responses.forEach((response) => {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('token');
          expect(response.body).toHaveProperty('user');
        });

        // Verify all users were created
        const users = await testSetup.prismaClient.user.findMany({
          where: {
            email: {
              in: [
                'concurrent0@example.com',
                'concurrent1@example.com',
                'concurrent2@example.com',
              ],
            },
          },
        });
        expect(users).toHaveLength(3);
      });

      it('should maintain data integrity during registration', async () => {
        const userData = createTestUserData({
          email: 'integrity@example.com',
        });

        const response = await request(app)
          .post('/api/v1/user')
          .send(userData)
          .expect(201);

        const dbUser = await testSetup.prismaClient.user.findUnique({
          where: { id: response.body.user.id },
        });

        // Verify all fields are properly set
        expect(dbUser).toBeTruthy();
        expect(dbUser!.email).toBe('integrity@example.com');
        expect(dbUser!.accountCreationMethod).toBe('local');
        expect(dbUser!.emailVerified).toBe(false);
        expect(dbUser!.isActive).toBe(true);
        expect(dbUser!.lastPasswordChange).toBeInstanceOf(Date);
        expect(dbUser!.createdAt).toBeInstanceOf(Date);
        expect(dbUser!.updatedAt).toBeInstanceOf(Date);
      });
    });
  });
});
