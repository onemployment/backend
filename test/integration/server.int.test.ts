import request from 'supertest';
import { Application } from 'express';
import { createTestApp, createTestUser, TestAppSetup } from './helpers/utils';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';

const globalWithPostgres = global as typeof globalThis & {
  postgresContainer: StartedPostgreSqlContainer;
  prismaClient: PrismaClient;
};

describe('Server Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: Application;

  beforeEach(() => {
    testSetup = createTestApp(globalWithPostgres.prismaClient);
    app = testSetup.app;
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('Authentication Endpoints - Full Integration', () => {
    describe('User Registration', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          username: 'newuser',
          password: 'securepassword123',
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body).toHaveProperty(
          'message',
          'User registered successfully'
        );
        expect(response.body).toHaveProperty('username');
        expect(typeof response.body.username).toBe('string');

        const storedUser = await testSetup.authRepository.findByUsername(
          userData.username
        );
        expect(storedUser).toBeTruthy();
        expect(storedUser!.username).toBe(userData.username);
        expect(storedUser!.username).toBe(response.body.username);
      });

      it('should reject duplicate username registration', async () => {
        const userData = {
          username: 'duplicateuser',
          password: 'password123',
        };

        await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(201);

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(409);

        expect(response.body).toHaveProperty(
          'message',
          'Username already exists'
        );
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({ username: 'onlyusername' })
          .expect(400);

        expect(response.body).toHaveProperty('message', 'Invalid request');
      });

      it('should enforce minimum password length', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            username: 'testuser',
            password: '123',
          })
          .expect(400);

        expect(response.body).toHaveProperty('message', 'Invalid request');
      });
    });

    describe('User Login', () => {
      let existingUser: {
        id: string;
        username: string;
        passwordHash: string;
        createdAt: Date;
        updatedAt: Date;
        plainPassword: string;
      };

      beforeEach(async () => {
        existingUser = await createTestUser(testSetup.authRepository, {
          username: 'loginuser',
          password: 'correctpassword123',
        });
      });

      it('should login with correct credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: existingUser.username,
            password: existingUser.plainPassword,
          })
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Login successful');
        expect(response.body).toHaveProperty('username', existingUser.username);
      });

      it('should reject incorrect password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: existingUser.username,
            password: 'wrongpassword',
          })
          .expect(401);

        expect(response.body).toHaveProperty('message', 'Invalid credentials');
      });

      it('should reject non-existent username', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: 'nonexistentuser',
            password: 'somepassword',
          })
          .expect(401);

        expect(response.body).toHaveProperty('message', 'Invalid credentials');
      });

      it('should validate required login fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ username: 'onlyusername' })
          .expect(400);

        expect(response.body).toHaveProperty('message', 'Invalid request');
      });
    });

    describe('Full User Flow', () => {
      it('should complete register -> login workflow', async () => {
        const userData = {
          username: 'flowuser',
          password: 'flowpassword123',
        };

        const registerResponse = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(201);

        const username = registerResponse.body.username;

        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send(userData)
          .expect(200);

        expect(loginResponse.body.username).toBe(username);
        expect(loginResponse.body.message).toBe('Login successful');

        const storedUser = await testSetup.authRepository.findByUsername(
          userData.username
        );
        expect(storedUser).toBeTruthy();
        expect(storedUser!.username).toBe(userData.username);
      });
    });
  });

  describe('Database Integration', () => {
    it('should persist user data across requests', async () => {
      const userData = {
        username: 'persistentuser',
        password: 'persistent123',
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const storedUser = await testSetup.authRepository.findByUsername(
        userData.username
      );
      expect(storedUser).toBeTruthy();
      expect(storedUser!.username).toBe(userData.username);

      // Verify data exists in database
      const dbUser = await testSetup.prismaClient.user.findUnique({
        where: { username: userData.username },
      });
      expect(dbUser).toBeTruthy();
      expect(dbUser!.username).toBe(userData.username);
    });

    it('should handle database connection gracefully', async () => {
      // Verify Prisma client is connected
      await expect(
        testSetup.prismaClient.$queryRaw`SELECT 1`
      ).resolves.toBeDefined();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'dbuser',
          password: 'dbpassword123',
        })
        .expect(201);

      expect(response.body).toHaveProperty(
        'message',
        'User registered successfully'
      );
      expect(response.body).toHaveProperty('username');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-JSON content type with proper error message', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/xml')
        .send('<xml></xml>');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Invalid request' });
    });

    it('should handle missing content-type with proper error message', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send('some text data');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Invalid request' });
    });

    it('should return 404 for non-existent endpoints', async () => {
      await request(app).get('/api/v1/nonexistent').expect(404);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Invalid request');
    });
  });
});
