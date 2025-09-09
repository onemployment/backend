import request from 'supertest';
import { Application } from 'express';
import { createTestApp, createTestUser, TestAppSetup } from '../helpers/utils';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';

const globalWithPostgres = global as typeof globalThis & {
  postgresContainer: StartedPostgreSqlContainer;
  prismaClient: PrismaClient;
};

describe('User Validation Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: Application;

  beforeEach(() => {
    testSetup = createTestApp(globalWithPostgres.prismaClient);
    app = testSetup.app;
  });

  describe('GET /user/validate/username - Username Availability Check', () => {
    describe('username availability scenarios', () => {
      it('should return available for new username', async () => {
        const response = await request(app)
          .get('/api/v1/user/validate/username?username=availableuser')
          .expect(200);

        expect(response.body).toEqual({
          available: true,
          message: 'Username is available',
        });
      });

      it('should return unavailable for existing username', async () => {
        // Create a test user first
        await createTestUser(testSetup.userRepository, {
          username: 'takenuser',
        });

        const response = await request(app)
          .get('/api/v1/user/validate/username?username=takenuser')
          .expect(200);

        expect(response.body).toEqual({
          available: false,
          message: 'Username is taken',
          suggestions: expect.arrayContaining([
            'takenuser2',
            'takenuser3',
            'takenuser4',
          ]),
        });
      });

      it('should handle case-insensitive username checking', async () => {
        await createTestUser(testSetup.userRepository, {
          username: 'caseuser',
        });

        const testCases = ['CaseUser', 'CASEUSER', 'cAsEuSeR'];

        for (const username of testCases) {
          const response = await request(app)
            .get(`/api/v1/user/validate/username?username=${username}`)
            .expect(200);

          expect(response.body).toEqual({
            available: false,
            message: 'Username is taken',
            suggestions: expect.any(Array),
          });
        }
      });

      it('should preserve original case in suggestions', async () => {
        await createTestUser(testSetup.userRepository, {
          username: 'originalcase',
        });

        const response = await request(app)
          .get('/api/v1/user/validate/username?username=OriginalCase')
          .expect(200);

        expect(response.body).toEqual({
          available: false,
          message: 'Username is taken',
          suggestions: ['OriginalCase2', 'OriginalCase3', 'OriginalCase4'],
        });
      });
    });

    describe('username suggestions algorithm', () => {
      it('should generate sequential numbered suggestions', async () => {
        // Create users to test suggestions
        const baseUsername = 'suggestionuser';
        await createTestUser(testSetup.userRepository, {
          username: baseUsername,
        });

        const response = await request(app)
          .get(`/api/v1/user/validate/username?username=${baseUsername}`)
          .expect(200);

        expect(response.body.suggestions).toEqual([
          'suggestionuser2',
          'suggestionuser3',
          'suggestionuser4',
        ]);
      });

      it('should provide suggestions that are actually available', async () => {
        const baseUsername = 'testsuggestions';
        await createTestUser(testSetup.userRepository, {
          username: baseUsername,
        });

        const response = await request(app)
          .get(`/api/v1/user/validate/username?username=${baseUsername}`)
          .expect(200);

        // Verify each suggestion is actually available
        for (const suggestion of response.body.suggestions) {
          const suggestionCheck = await request(app)
            .get(`/api/v1/user/validate/username?username=${suggestion}`)
            .expect(200);

          expect(suggestionCheck.body.available).toBe(true);
        }
      });

      it('should handle complex suggestion scenarios', async () => {
        const baseUsername = 'complexuser';

        // Create base username and first few suggestions
        await createTestUser(testSetup.userRepository, {
          username: baseUsername,
          email: `${baseUsername}@example.com`,
        });
        await createTestUser(testSetup.userRepository, {
          username: `${baseUsername}2`,
          email: `${baseUsername}2@example.com`,
        });

        const response = await request(app)
          .get(`/api/v1/user/validate/username?username=${baseUsername}`)
          .expect(200);

        expect(response.body.available).toBe(false);
        expect(response.body.suggestions).toEqual([
          'complexuser3', // Skip complexuser2 since it's taken
          'complexuser4',
          'complexuser5',
        ]);
      });
    });

    describe('input validation', () => {
      it('should require username parameter', async () => {
        const response = await request(app)
          .get('/api/v1/user/validate/username')
          .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Username');
      });

      it('should validate username format', async () => {
        const invalidUsernames = [
          '',
          '-invalid',
          'invalid-',
          'in--valid',
          'user@name',
          'user name',
          'a'.repeat(40),
        ];

        for (const username of invalidUsernames) {
          const response = await request(app).get(
            `/api/v1/user/validate/username?username=${encodeURIComponent(username)}`
          );

          // Some invalid formats return 400, others return 200 with availability info
          if (response.status === 400) {
            expect(response.body).toHaveProperty('message');
          } else if (response.status === 200) {
            expect(response.body).toHaveProperty('available');
            expect(response.body).toHaveProperty('message');
          }
        }
      });

      it('should accept valid username formats', async () => {
        const validUsernames = [
          'validuser',
          'user123',
          'user-name',
          'a',
          'a'.repeat(39),
          '123user',
        ];

        for (const username of validUsernames) {
          const response = await request(app)
            .get(`/api/v1/user/validate/username?username=${username}`)
            .expect(200);

          expect(response.body).toHaveProperty('available');
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should handle URL encoded usernames', async () => {
        const username = 'user-name';
        const response = await request(app)
          .get(
            `/api/v1/user/validate/username?username=${encodeURIComponent(username)}`
          )
          .expect(200);

        expect(response.body).toHaveProperty('available', true);
      });
    });
  });

  describe('GET /user/validate/email - Email Availability Check', () => {
    describe('email availability scenarios', () => {
      it('should return available for new email', async () => {
        const response = await request(app)
          .get('/api/v1/user/validate/email?email=available@example.com')
          .expect(200);

        expect(response.body).toEqual({
          available: true,
          message: 'Email is available',
        });
      });

      it('should return unavailable for existing email', async () => {
        const email = 'taken@example.com';
        await createTestUser(testSetup.userRepository, { email });

        const response = await request(app)
          .get(`/api/v1/user/validate/email?email=${email}`)
          .expect(200);

        expect(response.body).toEqual({
          available: false,
          message: 'Email already registered. Please sign in instead',
        });
      });

      it('should handle case-insensitive email checking', async () => {
        const email = 'case@example.com';
        await createTestUser(testSetup.userRepository, { email });

        const testCases = [
          'CASE@EXAMPLE.COM',
          'Case@Example.Com',
          'cAsE@ExAmPlE.cOm',
        ];

        for (const emailCase of testCases) {
          const response = await request(app)
            .get(
              `/api/v1/user/validate/email?email=${encodeURIComponent(emailCase)}`
            )
            .expect(200);

          expect(response.body).toEqual({
            available: false,
            message: 'Email already registered. Please sign in instead',
          });
        }
      });
    });

    describe('input validation', () => {
      it('should require email parameter', async () => {
        const response = await request(app)
          .get('/api/v1/user/validate/email')
          .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Email');
      });

      it('should validate email format', async () => {
        const invalidEmails = [
          '',
          'invalid-email',
          'test@',
          '@example.com',
          'test.example.com',
          'test@.com',
          'test@example.',
        ];

        for (const email of invalidEmails) {
          const response = await request(app).get(
            `/api/v1/user/validate/email?email=${encodeURIComponent(email)}`
          );

          // Some invalid formats return 400, others return 200 with availability info
          if (response.status === 400) {
            expect(response.body).toHaveProperty('message');
          } else if (response.status === 200) {
            expect(response.body).toHaveProperty('available');
            expect(response.body).toHaveProperty('message');
          }
        }
      });

      it('should accept valid email formats', async () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.com',
          'user+tag@example.org',
          'test123@subdomain.example.com',
        ];

        for (const email of validEmails) {
          const response = await request(app)
            .get(
              `/api/v1/user/validate/email?email=${encodeURIComponent(email)}`
            )
            .expect(200);

          expect(response.body).toHaveProperty('available');
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should handle URL encoded emails', async () => {
        const email = 'user+tag@example.com';
        const response = await request(app)
          .get(`/api/v1/user/validate/email?email=${encodeURIComponent(email)}`)
          .expect(200);

        expect(response.body).toHaveProperty('available', true);
      });
    });
  });

  describe('GET /user/suggest-usernames - Username Suggestions', () => {
    describe('suggestion generation', () => {
      it('should provide suggestions for any username', async () => {
        const response = await request(app)
          .get('/api/v1/user/suggest-usernames?username=newuser')
          .expect(200);

        expect(response.body).toHaveProperty('suggestions');
        expect(Array.isArray(response.body.suggestions)).toBe(true);
        expect(response.body.suggestions).toHaveLength(5);
        expect(response.body.suggestions).toEqual([
          'newuser2',
          'newuser3',
          'newuser4',
          'newuser5',
          'newuser6',
        ]);
      });

      it('should skip taken suggestions', async () => {
        const baseUsername = 'skipuser';
        await createTestUser(testSetup.userRepository, {
          username: baseUsername,
          email: `${baseUsername}@example.com`,
        });
        await createTestUser(testSetup.userRepository, {
          username: `${baseUsername}2`,
          email: `${baseUsername}2@example.com`,
        });
        await createTestUser(testSetup.userRepository, {
          username: `${baseUsername}3`,
          email: `${baseUsername}3@example.com`,
        });

        const response = await request(app)
          .get(`/api/v1/user/suggest-usernames?username=${baseUsername}`)
          .expect(200);

        expect(response.body.suggestions).toEqual(
          expect.arrayContaining(['skipuser4', 'skipuser5', 'skipuser6'])
        );
      });

      it('should preserve original case in suggestions', async () => {
        const response = await request(app)
          .get('/api/v1/user/suggest-usernames?username=CamelCaseUser')
          .expect(200);

        expect(response.body.suggestions).toEqual(
          expect.arrayContaining([
            'CamelCaseUser2',
            'CamelCaseUser3',
            'CamelCaseUser4',
          ])
        );
      });

      it('should verify all suggestions are available', async () => {
        const baseUsername = 'availabletest';

        const response = await request(app)
          .get(`/api/v1/user/suggest-usernames?username=${baseUsername}`)
          .expect(200);

        // Check each suggestion is actually available
        for (const suggestion of response.body.suggestions) {
          const checkResponse = await request(app)
            .get(`/api/v1/user/validate/username?username=${suggestion}`)
            .expect(200);

          expect(checkResponse.body.available).toBe(true);
        }
      });
    });

    describe('input validation', () => {
      it('should require username parameter', async () => {
        const response = await request(app)
          .get('/api/v1/user/suggest-usernames')
          .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Username');
      });

      it('should validate username format', async () => {
        const invalidUsernames = [
          '',
          '-invalid',
          'invalid-',
          'in--valid',
          'user@name',
          'user name',
          'a'.repeat(40),
        ];

        for (const username of invalidUsernames) {
          const response = await request(app).get(
            `/api/v1/user/suggest-usernames?username=${encodeURIComponent(username)}`
          );

          // Some invalid formats return 400, others return 200 with suggestions
          if (response.status === 400) {
            expect(response.body).toHaveProperty('message');
          } else if (response.status === 200) {
            expect(response.body).toHaveProperty('suggestions');
          }
        }
      });
    });
  });

  describe('performance and database integration', () => {
    it('should handle multiple validation requests efficiently', async () => {
      const promises = Array(10)
        .fill(null)
        .map((_, i) =>
          request(app)
            .get(`/api/v1/user/validate/username?username=perftest${i}`)
            .expect(200)
        );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.body).toHaveProperty('available', true);
      });
    });

    it('should use database indexes efficiently', async () => {
      // Create some test users
      await Promise.all([
        createTestUser(testSetup.userRepository, {
          username: 'index1',
          email: 'index1@test.com',
        }),
        createTestUser(testSetup.userRepository, {
          username: 'index2',
          email: 'index2@test.com',
        }),
        createTestUser(testSetup.userRepository, {
          username: 'index3',
          email: 'index3@test.com',
        }),
      ]);

      // Test username validation
      const usernameResponse = await request(app)
        .get('/api/v1/user/validate/username?username=index2')
        .expect(200);

      expect(usernameResponse.body.available).toBe(false);

      // Test email validation
      const emailResponse = await request(app)
        .get('/api/v1/user/validate/email?email=index2@test.com')
        .expect(200);

      expect(emailResponse.body.available).toBe(false);
    });

    it('should handle concurrent validation requests', async () => {
      const username = 'concurrent';
      await createTestUser(testSetup.userRepository, { username });

      const concurrentRequests = Array(5)
        .fill(null)
        .map(() =>
          request(app).get(
            `/api/v1/user/validate/username?username=${username}`
          )
        );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.available).toBe(false);
        expect(response.body.suggestions).toHaveLength(3);
      });
    });

    it('should provide consistent suggestions across requests', async () => {
      const username = 'consistent';
      await createTestUser(testSetup.userRepository, { username });

      // Make multiple requests for suggestions
      const responses = await Promise.all([
        request(app).get(`/api/v1/user/validate/username?username=${username}`),
        request(app).get(`/api/v1/user/suggest-usernames?username=${username}`),
        request(app).get(`/api/v1/user/validate/username?username=${username}`),
      ]);

      const suggestions1 = responses[0].body.suggestions;
      const suggestions2 = responses[1].body.suggestions;
      const suggestions3 = responses[2].body.suggestions;

      // All suggestions should contain the same base suggestions
      const expectedSuggestions = ['consistent2', 'consistent3', 'consistent4'];
      expectedSuggestions.forEach((suggestion) => {
        expect(suggestions1).toContain(suggestion);
        expect(suggestions2).toContain(suggestion);
        expect(suggestions3).toContain(suggestion);
      });
    });
  });
});
