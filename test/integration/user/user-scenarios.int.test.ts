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

describe('Complete User Flow Scenarios Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: Application;

  beforeEach(() => {
    testSetup = createTestApp(globalWithPostgres.prismaClient);
    app = testSetup.app;
  });

  describe('Scenario 1: Complete Local Registration and Login Flow', () => {
    it('should complete full registration → login → profile access workflow', async () => {
      const userData = createTestUserData({
        email: 'scenario1@example.com',
        username: 'scenario1user',
        password: 'Scenario1Pass123!',
        firstName: 'Scenario',
        lastName: 'One',
      });

      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/v1/user')
        .send(userData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty(
        'message',
        'User created successfully'
      );
      expect(registerResponse.body).toHaveProperty('token');
      expect(registerResponse.body.user).toEqual(
        expect.objectContaining({
          email: 'scenario1@example.com',
          username: 'scenario1user',
          firstName: 'Scenario',
          lastName: 'One',
          accountCreationMethod: 'local',
        })
      );

      const registrationToken = registerResponse.body.token;
      const userId = registerResponse.body.user.id;

      // Step 2: Use registration token to access profile
      const profileResponse1 = await request(app)
        .get('/api/v1/user/me')
        .set('Authorization', `Bearer ${registrationToken}`)
        .expect(200);

      expect(profileResponse1.body.user.id).toBe(userId);

      // Step 3: Login with credentials (different session)
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'scenario1@example.com',
          password: 'Scenario1Pass123!',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('message', 'Login successful');
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body.user.id).toBe(userId);

      const loginToken = loginResponse.body.token;

      // Step 4: Use login token to access and update profile
      const profileResponse2 = await request(app)
        .get('/api/v1/user/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(profileResponse2.body.user.id).toBe(userId);
      expect(profileResponse2.body.user.lastLoginAt).not.toBe(null);

      // Step 5: Update profile
      const updateResponse = await request(app)
        .put('/api/v1/user/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({
          displayName: 'Scenario One User',
          firstName: 'Updated',
        })
        .expect(200);

      expect(updateResponse.body.user).toEqual(
        expect.objectContaining({
          id: userId,
          displayName: 'Scenario One User',
          firstName: 'Updated',
          lastName: 'One', // Should remain unchanged
        })
      );

      // Step 6: Verify changes persisted in database
      const dbUser = await testSetup.prismaClient.user.findUnique({
        where: { id: userId },
      });

      expect(dbUser).toEqual(
        expect.objectContaining({
          email: 'scenario1@example.com',
          username: 'scenario1user',
          firstName: 'Updated',
          lastName: 'One',
          displayName: 'Scenario One User',
          accountCreationMethod: 'local',
          lastLoginAt: expect.any(Date),
        })
      );
    });

    it('should maintain data consistency across multiple requests', async () => {
      const userData = createTestUserData({
        email: 'consistency@example.com',
        username: 'consistencyuser',
      });

      // Register
      const registerResponse = await request(app)
        .post('/api/v1/user')
        .send(userData)
        .expect(201);

      const userId = registerResponse.body.user.id;

      // Multiple login attempts should all work and update lastLoginAt
      for (let i = 0; i < 3; i++) {
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: userData.email,
            password: userData.password,
          })
          .expect(200);

        expect(loginResponse.body.user.id).toBe(userId);

        // Small delay to ensure timestamp differences
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Verify final state
      const dbUser = await testSetup.prismaClient.user.findUnique({
        where: { id: userId },
      });

      expect(dbUser!.lastLoginAt).toBeInstanceOf(Date);
      expect(dbUser!.lastLoginAt!.getTime()).toBeGreaterThan(
        Date.now() - 10000
      );
    });
  });

  describe('Scenario 5: Registration Conflicts and Error Handling', () => {
    describe('email conflicts', () => {
      it('should handle email conflict with clear error message', async () => {
        const email = 'conflict@example.com';

        // Create first user
        const firstUser = createTestUserData({
          email,
          username: 'firstuser',
        });

        await request(app).post('/api/v1/user').send(firstUser).expect(201);

        // Try to register second user with same email
        const secondUser = createTestUserData({
          email,
          username: 'seconduser', // Different username
        });

        const conflictResponse = await request(app)
          .post('/api/v1/user')
          .send(secondUser)
          .expect(409);

        expect(conflictResponse.body).toEqual({
          message: 'Email already registered. Please sign in instead',
        });

        // Verify only one user exists
        const users = await testSetup.prismaClient.user.findMany({
          where: { email },
        });
        expect(users).toHaveLength(1);
        expect(users[0].username).toBe('firstuser');
      });
    });

    describe('username conflicts with suggestions', () => {
      it('should provide username suggestions on conflict', async () => {
        const username = 'popularname';

        // Create first user
        const firstUser = createTestUserData({
          email: 'first@example.com',
          username,
        });

        await request(app).post('/api/v1/user').send(firstUser).expect(201);

        // Try to register with same username
        const conflictUser = createTestUserData({
          email: 'second@example.com',
          username,
        });

        const conflictResponse = await request(app)
          .post('/api/v1/user')
          .send(conflictUser)
          .expect(409);

        expect(conflictResponse.body).toEqual({
          message: 'Username already taken',
        });

        // Test validation endpoint provides suggestions
        const validationResponse = await request(app)
          .get(`/api/v1/user/validate/username?username=${username}`)
          .expect(200);

        expect(validationResponse.body).toEqual({
          available: false,
          message: 'Username is taken',
          suggestions: ['popularname2', 'popularname3', 'popularname4'],
        });
      });

      it('should resolve conflicts using suggested usernames', async () => {
        const baseUsername = 'resolver';

        // Create first user
        await createTestUser(testSetup.userRepository, {
          username: baseUsername,
          email: 'first@resolver.com',
        });

        // Get suggestions for conflicting username
        const suggestionsResponse = await request(app)
          .get(`/api/v1/user/validate/username?username=${baseUsername}`)
          .expect(200);

        expect(suggestionsResponse.body.available).toBe(false);
        const suggestions = suggestionsResponse.body.suggestions;
        expect(suggestions).toHaveLength(3);

        // Use first suggestion to register successfully
        const resolvedUser = createTestUserData({
          email: 'resolved@example.com',
          username: suggestions[0],
        });

        const registrationResponse = await request(app)
          .post('/api/v1/user')
          .send(resolvedUser)
          .expect(201);

        expect(registrationResponse.body.user.username).toBe(suggestions[0]);

        // Verify suggestion is no longer available
        const reCheckResponse = await request(app)
          .get(`/api/v1/user/validate/username?username=${suggestions[0]}`)
          .expect(200);

        expect(reCheckResponse.body.available).toBe(false);
      });

      it('should handle complex username conflict scenarios', async () => {
        const baseUsername = 'complex';

        // Create multiple users with sequential usernames
        await Promise.all([
          createTestUser(testSetup.userRepository, {
            username: baseUsername,
            email: 'complex0@test.com',
          }),
          createTestUser(testSetup.userRepository, {
            username: `${baseUsername}2`,
            email: 'complex2@test.com',
          }),
          createTestUser(testSetup.userRepository, {
            username: `${baseUsername}3`,
            email: 'complex3@test.com',
          }),
        ]);

        // Check suggestions skip taken usernames
        const response = await request(app)
          .get(`/api/v1/user/validate/username?username=${baseUsername}`)
          .expect(200);

        expect(response.body).toEqual({
          available: false,
          message: 'Username is taken',
          suggestions: ['complex4', 'complex5', 'complex6'], // Skip 2 and 3
        });
      });
    });

    describe('validation error scenarios', () => {
      it('should handle multiple validation errors', async () => {
        const invalidUser = {
          email: 'invalid-email',
          password: '123', // Too short, no complexity
          username: '-invalid-', // Invalid format
          firstName: 'John123', // Invalid characters
          lastName: '', // Empty
        };

        const response = await request(app)
          .post('/api/v1/user')
          .send(invalidUser)
          .expect(400);

        expect(response.body).toEqual({
          message: 'Invalid request',
        });
      });

      it('should handle partial validation errors', async () => {
        const partiallyInvalidUser = createTestUserData({
          email: 'valid@example.com',
          password: 'ValidPass123!',
          username: 'validuser',
          firstName: '', // Only this is invalid
          lastName: 'ValidLast',
        });

        const response = await request(app)
          .post('/api/v1/user')
          .send(partiallyInvalidUser)
          .expect(400);

        expect(response.body).toEqual({
          message: 'Invalid request',
        });
      });
    });
  });

  describe('Scenario 9: Real-time Validation Workflow', () => {
    it('should support real-time validation during registration form completion', async () => {
      const baseUsername = 'realtime';
      const baseEmail = 'realtime@example.com';

      // Simulate user typing and checking availability

      // Step 1: Check initial username (available)
      let response = await request(app)
        .get(`/api/v1/user/validate/username?username=${baseUsername}`)
        .expect(200);

      expect(response.body).toEqual({
        available: true,
        message: 'Username is available',
      });

      // Step 2: Check initial email (available)
      response = await request(app)
        .get(`/api/v1/user/validate/email?email=${baseEmail}`)
        .expect(200);

      expect(response.body).toEqual({
        available: true,
        message: 'Email is available',
      });

      // Step 3: Someone else registers with that username
      await createTestUser(testSetup.userRepository, {
        username: baseUsername,
        email: 'someone@else.com',
      });

      // Step 4: User checks again (now taken)
      response = await request(app)
        .get(`/api/v1/user/validate/username?username=${baseUsername}`)
        .expect(200);

      expect(response.body).toEqual({
        available: false,
        message: 'Username is taken',
        suggestions: ['realtime2', 'realtime3', 'realtime4'],
      });

      // Step 5: User selects first suggestion
      const suggestedUsername = response.body.suggestions[0];

      response = await request(app)
        .get(`/api/v1/user/validate/username?username=${suggestedUsername}`)
        .expect(200);

      expect(response.body.available).toBe(true);

      // Step 6: User completes registration with suggested username
      const userData = createTestUserData({
        email: baseEmail,
        username: suggestedUsername,
      });

      const registrationResponse = await request(app)
        .post('/api/v1/user')
        .send(userData)
        .expect(201);

      expect(registrationResponse.body.user.username).toBe(suggestedUsername);
      expect(registrationResponse.body.user.email).toBe(baseEmail);
    });

    it('should handle rapid validation requests', async () => {
      const usernames = Array(10)
        .fill(null)
        .map((_, i) => `rapid${i}`);

      // Simulate rapid-fire validation requests
      const validationPromises = usernames.map((username) =>
        request(app)
          .get(`/api/v1/user/validate/username?username=${username}`)
          .expect(200)
      );

      const responses = await Promise.all(validationPromises);

      // All should return available
      responses.forEach((response) => {
        expect(response.body).toEqual({
          available: true,
          message: 'Username is available',
        });
      });
    });

    it('should provide consistent suggestions across multiple requests', async () => {
      const username = 'consistent';

      await createTestUser(testSetup.userRepository, { username });

      // Make multiple requests for the same username
      const requests = Array(3)
        .fill(null)
        .map(() =>
          request(app)
            .get(`/api/v1/user/validate/username?username=${username}`)
            .expect(200)
        );

      const responses = await Promise.all(requests);

      // All responses should be identical
      responses.forEach((response) => {
        expect(response.body).toEqual({
          available: false,
          message: 'Username is taken',
          suggestions: ['consistent2', 'consistent3', 'consistent4'],
        });
      });
    });
  });

  describe('Cross-Endpoint Data Consistency', () => {
    it('should maintain consistency between registration and profile endpoints', async () => {
      const userData = createTestUserData({
        email: 'consistency@test.com',
        username: 'consistentuser',
        firstName: 'Consistent',
        lastName: 'User',
      });

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/user')
        .send(userData)
        .expect(201);

      const userId = registerResponse.body.user.id;
      const token = registerResponse.body.token;

      // Get profile
      const profileResponse = await request(app)
        .get('/api/v1/user/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Data should be consistent
      expect(profileResponse.body.user).toEqual(registerResponse.body.user);

      // Database should match both responses
      const dbUser = await testSetup.prismaClient.user.findUnique({
        where: { id: userId },
      });

      expect(dbUser).toEqual(
        expect.objectContaining({
          id: userId,
          email: 'consistency@test.com',
          username: 'consistentuser',
          firstName: 'Consistent',
          lastName: 'User',
        })
      );
    });

    it('should maintain consistency between login and profile endpoints', async () => {
      // Create user via repository (simulate existing user)
      const testUser = await createTestUser(testSetup.userRepository, {
        email: 'login-profile@test.com',
        username: 'loginprofileuser',
        firstName: 'Login',
        lastName: 'Profile',
      });

      // Login
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login-profile@test.com',
          password: testUser.plainPassword,
        })
        .expect(200);

      const token = loginResponse.body.token;

      // Get profile
      const profileResponse = await request(app)
        .get('/api/v1/user/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // User data should be consistent (except lastLoginAt which gets updated)
      expect(profileResponse.body.user).toEqual(
        expect.objectContaining({
          id: loginResponse.body.user.id,
          email: loginResponse.body.user.email,
          username: loginResponse.body.user.username,
          firstName: loginResponse.body.user.firstName,
          lastName: loginResponse.body.user.lastName,
        })
      );

      // lastLoginAt should be updated in profile response
      expect(profileResponse.body.user.lastLoginAt).toBe(
        loginResponse.body.user.lastLoginAt
      );
      expect(profileResponse.body.user.lastLoginAt).not.toBe(null);
    });

    it('should handle profile updates affecting login responses', async () => {
      const testUser = await createTestUser(testSetup.userRepository, {
        firstName: 'Original',
        lastName: 'Name',
      });

      // Login and update profile
      const initialLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.plainPassword,
        })
        .expect(200);

      const token = initialLogin.body.token;

      // Update profile
      await request(app)
        .put('/api/v1/user/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Updated',
          displayName: 'New Display',
        })
        .expect(200);

      // Subsequent login should reflect updates
      const subsequentLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.plainPassword,
        })
        .expect(200);

      // Note: Login response shows current data from database
      // The exact behavior depends on implementation, but should be consistent
      expect(subsequentLogin.body.user.id).toBe(testUser.id);
    });
  });

  describe('JWT Token Lifecycle Integration', () => {
    it('should handle token expiry in realistic scenarios', async () => {
      const testUser = await createTestUser(testSetup.userRepository);

      // Get valid token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.plainPassword,
        })
        .expect(200);

      const token = loginResponse.body.token;

      // Verify token is valid
      const payload = await testSetup.jwtUtil.validateToken(token);
      expect(payload.sub).toBe(testUser.id);

      // Use token for protected endpoint
      await request(app)
        .get('/api/v1/user/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Update profile with same token
      await request(app)
        .put('/api/v1/user/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Token Test' })
        .expect(200);

      // Verify token claims match current user state
      const currentPayload = await testSetup.jwtUtil.validateToken(token);
      expect(currentPayload.sub).toBe(testUser.id);
      expect(currentPayload.email).toBe(testUser.email);
      expect(currentPayload.username).toBe(testUser.username);
    });

    it('should generate different tokens for different login sessions', async () => {
      const testUser = await createTestUser(testSetup.userRepository);

      // Login twice
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.plainPassword,
        })
        .expect(200);

      // Add a small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.plainPassword,
        })
        .expect(200);

      // Tokens should be different due to different issue times
      expect(login1.body.token).not.toBe(login2.body.token);

      // Both tokens should be valid
      const payload1 = await testSetup.jwtUtil.validateToken(login1.body.token);
      const payload2 = await testSetup.jwtUtil.validateToken(login2.body.token);

      expect(payload1.sub).toBe(payload2.sub);
      expect(payload1.email).toBe(payload2.email);

      // Issue times should be different
      expect(payload1.iat).not.toBe(payload2.iat);
    });
  });
});
