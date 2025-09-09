import {
  loginSchema,
  loginResponseSchema,
  errorResponseSchema,
  LoginRequest,
  LoginResponse,
  ErrorResponse,
} from '../auth.schema';
import { z } from 'zod';

describe('Auth Schema', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validLoginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.parse(validLoginData);

      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('password123');
    });

    it('should transform email to lowercase', () => {
      const loginDataWithUppercase = {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      };

      const result = loginSchema.parse(loginDataWithUppercase);

      expect(result.email).toBe('test@example.com');
    });

    it('should validate mixed case email transformation', () => {
      const testCases = [
        { input: 'User@Domain.COM', expected: 'user@domain.com' },
        { input: 'CAPS@EXAMPLE.ORG', expected: 'caps@example.org' },
        { input: 'Mixed.Case@Test.Co.UK', expected: 'mixed.case@test.co.uk' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = loginSchema.parse({ email: input, password: 'test123' });
        expect(result.email).toBe(expected);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmailCases = [
        { email: 'not-an-email', password: 'password123' },
        { email: '@missinglocal.com', password: 'password123' },
        { email: 'missing@.com', password: 'password123' },
        { email: 'no-at-symbol.com', password: 'password123' },
        { email: 'spaces @domain.com', password: 'password123' },
        { email: '', password: 'password123' },
      ];

      invalidEmailCases.forEach((invalidData) => {
        expect(() => loginSchema.parse(invalidData)).toThrow();
      });
    });

    it('should reject missing or empty password', () => {
      const invalidPasswordCases = [
        { email: 'test@example.com', password: '' },
        { email: 'test@example.com' }, // missing password
      ];

      invalidPasswordCases.forEach((invalidData) => {
        expect(() => loginSchema.parse(invalidData)).toThrow();
      });
    });

    it('should accept any non-empty password', () => {
      const validPasswordCases = [
        'a', // single character
        'password',
        'Password123!',
        '   spaces   ',
        'very-long-password-with-lots-of-characters-123456789',
        '日本語パスワード',
        'password\nwith\nnewlines',
      ];

      validPasswordCases.forEach((password) => {
        const result = loginSchema.parse({
          email: 'test@example.com',
          password,
        });
        expect(result.password).toBe(password);
      });
    });

    it('should handle special email formats correctly', () => {
      const specialEmailCases = [
        'user.name+tag@example.com',
        'user_name@example.com',
        'user-name@sub-domain.example.com',
        '123@456.com',
        'a@b.co',
      ];

      specialEmailCases.forEach((email) => {
        const result = loginSchema.parse({
          email: email.toUpperCase(), // Test case transformation
          password: 'test123',
        });
        expect(result.email).toBe(email.toLowerCase());
      });
    });

    it('should provide helpful error messages', () => {
      const invalidEmail = { email: 'invalid-email', password: 'test123' };
      const emptyPassword = { email: 'test@example.com', password: '' };

      try {
        loginSchema.parse(invalidEmail);
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        const zodError = error as z.ZodError;
        // Current zod reports invalid_format for email
        expect(zodError.issues[0].path).toEqual(['email']);
        expect(['invalid_format', 'invalid_string']).toContain(
          zodError.issues[0].code
        );
      }

      try {
        loginSchema.parse(emptyPassword);
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        const zodError = error as z.ZodError;
        expect(zodError.issues[0].message).toBe('Password is required');
        expect(zodError.issues[0].path).toEqual(['password']);
      }
    });

    it('should handle safeParse correctly', () => {
      const validData = { email: 'TEST@EXAMPLE.COM', password: 'test123' };
      const invalidData = { email: 'invalid', password: '' };

      const validResult = loginSchema.safeParse(validData);
      const invalidResult = loginSchema.safeParse(invalidData);

      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.data.email).toBe('test@example.com');
        expect(validResult.data.password).toBe('test123');
      }

      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should ignore extra fields', () => {
      const dataWithExtraFields = {
        email: 'test@example.com',
        password: 'password123',
        extraField: 'should be ignored',
        anotherField: 123,
      };

      const result = loginSchema.parse(dataWithExtraFields);

      expect(result).toEqual({
        email: 'test@example.com',
        password: 'password123',
      });
      expect('extraField' in result).toBe(false);
      expect('anotherField' in result).toBe(false);
    });
  });

  describe('loginResponseSchema', () => {
    it('should validate correct login response', () => {
      const validResponse = {
        message: 'Login successful',
        token: 'jwt-token-12345',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          displayName: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          lastLoginAt: '2023-01-01T12:00:00.000Z',
        },
      };

      const result = loginResponseSchema.parse(validResponse);
      expect(result).toEqual(validResponse);
    });

    it('should validate response with null displayName and lastLoginAt', () => {
      const responseWithNulls = {
        message: 'Login successful',
        token: 'jwt-token-12345',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          displayName: null,
          emailVerified: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          lastLoginAt: null,
        },
      };

      const result = loginResponseSchema.parse(responseWithNulls);
      expect(result).toEqual(responseWithNulls);
      expect(result.user.displayName).toBeNull();
      expect(result.user.lastLoginAt).toBeNull();
    });

    it('should reject invalid response structure', () => {
      const invalidResponses = [
        // Missing required fields
        {
          message: 'Login successful',
          token: 'jwt-token',
        },
        // Missing user fields
        {
          message: 'Login successful',
          token: 'jwt-token',
          user: {
            id: 'user-123',
            // missing other required fields
          },
        },
        // Wrong types
        {
          message: 123,
          token: 'jwt-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            displayName: null,
            emailVerified: true,
            createdAt: '2023-01-01T00:00:00.000Z',
            lastLoginAt: null,
          },
        },
        // Invalid boolean type
        {
          message: 'Login successful',
          token: 'jwt-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            displayName: null,
            emailVerified: 'true', // string instead of boolean
            createdAt: '2023-01-01T00:00:00.000Z',
            lastLoginAt: null,
          },
        },
      ];

      invalidResponses.forEach((invalidResponse) => {
        expect(() => loginResponseSchema.parse(invalidResponse)).toThrow();
      });
    });

    it('should handle different date string formats', () => {
      const responseWithDifferentDates = {
        message: 'Login successful',
        token: 'jwt-token-12345',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          displayName: null,
          emailVerified: true,
          createdAt: '2023-12-25T23:59:59.999Z',
          lastLoginAt: '2023-12-26T00:00:01.001Z',
        },
      };

      const result = loginResponseSchema.parse(responseWithDifferentDates);
      expect(result.user.createdAt).toBe('2023-12-25T23:59:59.999Z');
      expect(result.user.lastLoginAt).toBe('2023-12-26T00:00:01.001Z');
    });

    it('should validate user object independently', () => {
      const userSchema = loginResponseSchema.shape.user;

      const validUser = {
        id: 'user-456',
        email: 'another@example.com',
        username: 'anotheruser',
        firstName: 'Another',
        lastName: 'User',
        displayName: 'Another User',
        emailVerified: false,
        createdAt: '2023-06-15T10:30:00.000Z',
        lastLoginAt: '2023-06-15T11:00:00.000Z',
      };

      const result = userSchema.parse(validUser);
      expect(result).toEqual(validUser);
    });
  });

  describe('errorResponseSchema', () => {
    it('should validate correct error response', () => {
      const validErrorResponse = {
        message: 'Authentication failed',
      };

      const result = errorResponseSchema.parse(validErrorResponse);
      expect(result).toEqual(validErrorResponse);
    });

    it('should handle various error messages', () => {
      const errorMessages = [
        'Invalid credentials',
        'User not found',
        'Account locked',
        'Server error occurred',
        '', // empty message should be allowed
        'Very long error message that contains detailed information about what went wrong',
      ];

      errorMessages.forEach((message) => {
        const errorResponse = { message };
        const result = errorResponseSchema.parse(errorResponse);
        expect(result.message).toBe(message);
      });
    });

    it('should reject non-string message', () => {
      const invalidErrorResponses = [
        { message: 123 },
        { message: null },
        { message: undefined },
        { message: { error: 'nested object' } },
        { message: ['array', 'message'] },
        {},
      ];

      invalidErrorResponses.forEach((invalidResponse) => {
        expect(() => errorResponseSchema.parse(invalidResponse)).toThrow();
      });
    });

    it('should ignore extra fields in error response', () => {
      const errorWithExtraFields = {
        message: 'Error occurred',
        code: 400,
        details: 'Extra details',
        timestamp: '2023-01-01T00:00:00.000Z',
      };

      const result = errorResponseSchema.parse(errorWithExtraFields);
      expect(result).toEqual({ message: 'Error occurred' });
    });
  });

  describe('TypeScript type exports', () => {
    it('should export correct LoginRequest type', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      // TypeScript compilation test
      expect(typeof loginRequest.email).toBe('string');
      expect(typeof loginRequest.password).toBe('string');
    });

    it('should export correct LoginResponse type', () => {
      const loginResponse: LoginResponse = {
        message: 'Login successful',
        token: 'jwt-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          displayName: null,
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          lastLoginAt: null,
        },
      };

      // TypeScript compilation test
      expect(typeof loginResponse.message).toBe('string');
      expect(typeof loginResponse.token).toBe('string');
      expect(typeof loginResponse.user).toBe('object');
    });

    it('should export correct ErrorResponse type', () => {
      const errorResponse: ErrorResponse = {
        message: 'Error occurred',
      };

      // TypeScript compilation test
      expect(typeof errorResponse.message).toBe('string');
    });

    it('should handle nullable fields in LoginResponse type', () => {
      const loginResponseWithNulls: LoginResponse = {
        message: 'Success',
        token: 'token',
        user: {
          id: 'user-id',
          email: 'email@test.com',
          username: 'username',
          firstName: 'First',
          lastName: 'Last',
          displayName: null, // nullable
          emailVerified: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          lastLoginAt: null, // nullable
        },
      };

      expect(loginResponseWithNulls.user.displayName).toBeNull();
      expect(loginResponseWithNulls.user.lastLoginAt).toBeNull();
    });
  });

  describe('schema integration', () => {
    it('should work with Zod refine for custom validation', () => {
      const extendedLoginSchema = loginSchema.refine(
        (data) => data.password.length >= 8,
        {
          message: 'Password must be at least 8 characters',
          path: ['password'],
        }
      );

      const validData = { email: 'test@example.com', password: 'password123' };
      const invalidData = { email: 'test@example.com', password: 'short' };

      expect(() => extendedLoginSchema.parse(validData)).not.toThrow();
      expect(() => extendedLoginSchema.parse(invalidData)).toThrow();
    });

    it('should support schema composition', () => {
      const loginDataSchema = loginSchema.extend({
        rememberMe: z.boolean().optional(),
      });

      const loginData = {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
        rememberMe: true,
      };

      const result = loginDataSchema.parse(loginData);
      expect(result.email).toBe('test@example.com'); // still transformed
      expect(result.rememberMe).toBe(true);
    });

    it('should work with partial schemas', () => {
      const partialLoginSchema = loginSchema.partial();

      const partialData = { email: 'test@example.com' }; // missing password

      const result = partialLoginSchema.parse(partialData);
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBeUndefined();
    });
  });
});
