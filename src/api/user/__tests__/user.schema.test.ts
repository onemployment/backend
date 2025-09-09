import {
  userRegistrationSchema,
  userProfileUpdateSchema,
  userRegistrationResponseSchema,
  usernameValidationResponseSchema,
  userProfileResponseSchema,
} from '../user.schema';
import { z } from 'zod';

describe('User Schema', () => {
  describe('userRegistrationSchema', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'Password123',
      username: 'testuser',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should validate correct registration data', () => {
      const result = userRegistrationSchema.parse(validRegistrationData);

      expect(result).toEqual({
        email: 'test@example.com',
        password: 'Password123',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should transform email to lowercase', () => {
      const dataWithUppercaseEmail = {
        ...validRegistrationData,
        email: 'TEST@EXAMPLE.COM',
      };

      const result = userRegistrationSchema.parse(dataWithUppercaseEmail);
      expect(result.email).toBe('test@example.com');
    });

    describe('email validation', () => {
      it('should validate correct email formats', () => {
        const validEmails = [
          'user@example.com',
          'user.name@example.co.uk',
          'user+tag@example.org',
          'test123@domain-name.com',
        ];

        validEmails.forEach((email) => {
          const data = { ...validRegistrationData, email: email.toUpperCase() };
          const result = userRegistrationSchema.parse(data);
          expect(result.email).toBe(email.toLowerCase());
        });
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          'not-an-email',
          '@missinglocal.com',
          'missing@.com',
          'no-at-symbol.com',
          'spaces @domain.com',
          '',
        ];

        invalidEmails.forEach((email) => {
          const data = { ...validRegistrationData, email };
          expect(() => userRegistrationSchema.parse(data)).toThrow();
        });
      });

      it('should reject emails longer than 255 characters', () => {
        const longEmail = 'a'.repeat(250) + '@example.com'; // > 255 chars
        const data = { ...validRegistrationData, email: longEmail };

        expect(() => userRegistrationSchema.parse(data)).toThrow();
      });

      it('should accept emails at 255 character limit', () => {
        const maxLengthEmail = 'a'.repeat(243) + '@example.com'; // exactly 255
        const data = {
          ...validRegistrationData,
          email: maxLengthEmail.toUpperCase(),
        };

        const result = userRegistrationSchema.parse(data);
        expect(result.email).toBe(maxLengthEmail.toLowerCase());
      });
    });

    describe('password validation', () => {
      it('should validate strong passwords', () => {
        const validPasswords = [
          'Password123',
          'MySecure1Password',
          'Complex9Pass',
          'Aa1bcdefgh',
          'StrongP@ss1',
        ];

        validPasswords.forEach((password) => {
          const data = { ...validRegistrationData, password };
          const result = userRegistrationSchema.parse(data);
          expect(result.password).toBe(password);
        });
      });

      it('should reject passwords without complexity requirements', () => {
        const invalidPasswords = [
          'password', // no uppercase or digit
          'PASSWORD', // no lowercase or digit
          '12345678', // no letters
          'Password', // no digit
          'password1', // no uppercase
          'PASSWORD1', // no lowercase
        ];

        invalidPasswords.forEach((password) => {
          const data = { ...validRegistrationData, password };
          expect(() => userRegistrationSchema.parse(data)).toThrow();
        });
      });

      it('should reject passwords that are too short or too long', () => {
        const data1 = { ...validRegistrationData, password: 'Short1' }; // < 8 chars
        const data2 = {
          ...validRegistrationData,
          password: 'A1' + 'a'.repeat(99),
        }; // > 100 chars

        expect(() => userRegistrationSchema.parse(data1)).toThrow();
        expect(() => userRegistrationSchema.parse(data2)).toThrow();
      });

      it('should accept passwords at length limits', () => {
        const minPassword = 'Aa1bcd78'; // exactly 8 chars
        const maxPassword = 'A1' + 'a'.repeat(98); // exactly 100 chars

        const data1 = { ...validRegistrationData, password: minPassword };
        const data2 = { ...validRegistrationData, password: maxPassword };

        expect(userRegistrationSchema.parse(data1).password).toBe(minPassword);
        expect(userRegistrationSchema.parse(data2).password).toBe(maxPassword);
      });

      it('should provide helpful password error messages', () => {
        const data = { ...validRegistrationData, password: 'weak' };

        try {
          userRegistrationSchema.parse(data);
        } catch (error) {
          expect(error).toBeInstanceOf(z.ZodError);
          const zodError = error as z.ZodError;
          expect(
            zodError.issues.some(
              (issue) =>
                issue.message.includes('lowercase') &&
                issue.message.includes('uppercase') &&
                issue.message.includes('digit')
            )
          ).toBe(true);
        }
      });
    });

    describe('username validation', () => {
      it('should validate correct usernames', () => {
        const validUsernames = [
          'a', // single char
          'user123',
          'test-user',
          'user-name-with-dashes',
          'Username123',
          'a'.repeat(39), // max length
        ];

        validUsernames.forEach((username) => {
          const data = { ...validRegistrationData, username };
          const result = userRegistrationSchema.parse(data);
          expect(result.username).toBe(username);
        });
      });

      it('should reject usernames with invalid characters', () => {
        const invalidUsernames = [
          'user.name', // dots
          'user_name', // underscores
          'user name', // spaces
          'user@name', // special chars
          'user#name',
          'user$name',
        ];

        invalidUsernames.forEach((username) => {
          const data = { ...validRegistrationData, username };
          expect(() => userRegistrationSchema.parse(data)).toThrow();
        });
      });

      it('should reject usernames starting or ending with hyphens', () => {
        const invalidUsernames = ['-username', 'username-', '-', '--username'];

        invalidUsernames.forEach((username) => {
          const data = { ...validRegistrationData, username };
          expect(() => userRegistrationSchema.parse(data)).toThrow();
        });
      });

      it('should reject usernames that are too long', () => {
        const tooLongUsername = 'a'.repeat(40); // > 39 chars
        const data = { ...validRegistrationData, username: tooLongUsername };

        expect(() => userRegistrationSchema.parse(data)).toThrow();
      });

      it('should reject empty username', () => {
        const data = { ...validRegistrationData, username: '' };
        expect(() => userRegistrationSchema.parse(data)).toThrow();
      });

      it('should provide helpful username error messages', () => {
        const data = { ...validRegistrationData, username: 'user.name' };

        try {
          userRegistrationSchema.parse(data);
        } catch (error) {
          expect(error).toBeInstanceOf(z.ZodError);
          const zodError = error as z.ZodError;
          expect(zodError.issues[0].message).toContain('1-39 characters');
        }
      });
    });

    describe('name validation', () => {
      it('should validate correct first and last names (ASCII only)', () => {
        const validNames = [
          'John',
          'Mary Jane',
          "O'Connor",
          'Jean-Pierre',
          'Dr. Smith',
        ];

        validNames.forEach((name) => {
          const data1 = { ...validRegistrationData, firstName: name };
          const data2 = { ...validRegistrationData, lastName: name };

          expect(userRegistrationSchema.parse(data1).firstName).toBe(name);
          expect(userRegistrationSchema.parse(data2).lastName).toBe(name);
        });
      });

      it('should reject names with invalid characters', () => {
        const invalidNames = [
          'John123',
          'Mary@Smith',
          'User_Name',
          'Name#Test',
          'John$Doe',
        ];

        invalidNames.forEach((name) => {
          const data1 = { ...validRegistrationData, firstName: name };
          const data2 = { ...validRegistrationData, lastName: name };

          expect(() => userRegistrationSchema.parse(data1)).toThrow();
          expect(() => userRegistrationSchema.parse(data2)).toThrow();
        });
      });

      it('should reject names that are too short or too long', () => {
        const emptyName = '';
        const tooLongName = 'A'.repeat(101);

        const data1 = { ...validRegistrationData, firstName: emptyName };
        const data2 = { ...validRegistrationData, firstName: tooLongName };
        const data3 = { ...validRegistrationData, lastName: emptyName };
        const data4 = { ...validRegistrationData, lastName: tooLongName };

        [data1, data2, data3, data4].forEach((data) => {
          expect(() => userRegistrationSchema.parse(data)).toThrow();
        });
      });

      it('should accept names at length limits', () => {
        const minName = 'A'; // 1 char
        const maxName = 'A'.repeat(100); // 100 chars

        const data1 = {
          ...validRegistrationData,
          firstName: minName,
          lastName: maxName,
        };
        const result = userRegistrationSchema.parse(data1);

        expect(result.firstName).toBe(minName);
        expect(result.lastName).toBe(maxName);
      });

      it('should provide helpful name error messages', () => {
        const data = { ...validRegistrationData, firstName: 'John123' };

        try {
          userRegistrationSchema.parse(data);
        } catch (error) {
          expect(error).toBeInstanceOf(z.ZodError);
          const zodError = error as z.ZodError;
          expect(zodError.issues[0].message).toContain(
            'letters, spaces, hyphens, apostrophes'
          );
        }
      });
    });
  });

  describe('userProfileUpdateSchema', () => {
    it('should validate partial updates with optional fields', () => {
      const partialUpdates = [
        { firstName: 'UpdatedFirst' },
        { lastName: 'UpdatedLast' },
        { displayName: 'Updated Display Name' },
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'John', displayName: null },
        {},
      ];

      partialUpdates.forEach((update) => {
        const result = userProfileUpdateSchema.parse(update);
        expect(result).toEqual(update);
      });
    });

    it('should validate displayName as nullable', () => {
      const updates = [
        { displayName: 'Valid Display Name' },
        { displayName: null },
        { firstName: 'John', displayName: null },
      ];

      updates.forEach((update) => {
        const result = userProfileUpdateSchema.parse(update);
        expect(result).toEqual(update);
      });
    });

    it('should reject invalid firstName and lastName', () => {
      const invalidUpdates = [
        { firstName: 'John123' },
        { lastName: 'Doe@Email' },
        { firstName: '' },
        { lastName: 'A'.repeat(101) },
      ];

      invalidUpdates.forEach((update) => {
        expect(() => userProfileUpdateSchema.parse(update)).toThrow();
      });
    });

    it('should validate displayName length constraints', () => {
      const validDisplayName = 'A'.repeat(200); // max length
      const tooLongDisplayName = 'A'.repeat(201); // too long
      const emptyDisplayName = ''; // too short

      expect(
        userProfileUpdateSchema.parse({ displayName: validDisplayName })
          .displayName
      ).toBe(validDisplayName);
      expect(() =>
        userProfileUpdateSchema.parse({ displayName: tooLongDisplayName })
      ).toThrow();
      expect(() =>
        userProfileUpdateSchema.parse({ displayName: emptyDisplayName })
      ).toThrow();
    });

    it('should allow optional fields to be undefined', () => {
      const update = {
        firstName: undefined,
        lastName: undefined,
        displayName: undefined,
      };

      const result = userProfileUpdateSchema.parse(update);
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
      expect(result.displayName).toBeUndefined();
    });
  });

  describe('userRegistrationResponseSchema', () => {
    const validResponse = {
      message: 'User created successfully',
      token: 'jwt-token-123',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        emailVerified: false,
        accountCreationMethod: 'local',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastLoginAt: null,
      },
    };

    it('should validate correct registration response', () => {
      const result = userRegistrationResponseSchema.parse(validResponse);
      expect(result).toEqual(validResponse);
    });

    it('should validate response with null displayName and lastLoginAt', () => {
      const responseWithNulls = {
        ...validResponse,
        user: {
          ...validResponse.user,
          displayName: null,
          lastLoginAt: null,
        },
      };

      const result = userRegistrationResponseSchema.parse(responseWithNulls);
      expect(result.user.displayName).toBeNull();
      expect(result.user.lastLoginAt).toBeNull();
    });

    it('should reject missing required fields', () => {
      const invalidResponses = [
        { ...validResponse, message: undefined },
        { ...validResponse, token: undefined },
        { ...validResponse, user: undefined },
        { ...validResponse, user: { ...validResponse.user, id: undefined } },
      ];

      invalidResponses.forEach((response) => {
        expect(() => userRegistrationResponseSchema.parse(response)).toThrow();
      });
    });
  });

  describe('usernameValidationResponseSchema', () => {
    it('should validate available username response', () => {
      const availableResponse = {
        available: true,
        message: 'Username is available',
      };

      const result = usernameValidationResponseSchema.parse(availableResponse);
      expect(result).toEqual(availableResponse);
    });

    it('should validate unavailable username response with suggestions', () => {
      const unavailableResponse = {
        available: false,
        message: 'Username is taken',
        suggestions: ['username2', 'username3', 'username4'],
      };

      const result =
        usernameValidationResponseSchema.parse(unavailableResponse);
      expect(result).toEqual(unavailableResponse);
    });

    it('should allow optional suggestions field', () => {
      const responseWithoutSuggestions = {
        available: false,
        message: 'Username is taken',
      };

      const result = usernameValidationResponseSchema.parse(
        responseWithoutSuggestions
      );
      expect(result.suggestions).toBeUndefined();
    });

    it('should validate empty suggestions array', () => {
      const responseWithEmptySuggestions = {
        available: false,
        message: 'Username is taken',
        suggestions: [],
      };

      const result = usernameValidationResponseSchema.parse(
        responseWithEmptySuggestions
      );
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('userProfileResponseSchema', () => {
    const validProfileResponse = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        emailVerified: true,
        accountCreationMethod: 'local',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastLoginAt: '2023-01-02T00:00:00.000Z',
      },
    };

    it('should validate correct profile response', () => {
      const result = userProfileResponseSchema.parse(validProfileResponse);
      expect(result).toEqual(validProfileResponse);
    });

    it('should validate response with null fields', () => {
      const responseWithNulls = {
        user: {
          ...validProfileResponse.user,
          displayName: null,
          lastLoginAt: null,
        },
      };

      const result = userProfileResponseSchema.parse(responseWithNulls);
      expect(result.user.displayName).toBeNull();
      expect(result.user.lastLoginAt).toBeNull();
    });
  });

  // Removed over-test: TypeScript type export runtime checks

  describe('schema integration and edge cases', () => {
    it('should work with safeParse for error handling', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
        username: '',
        firstName: '',
        lastName: '',
      };

      const result = userRegistrationSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(
          result.error.issues.some((issue) => issue.path.includes('email'))
        ).toBe(true);
        expect(
          result.error.issues.some((issue) => issue.path.includes('password'))
        ).toBe(true);
      }
    });

    it('should handle schema composition with extend', () => {
      const extendedSchema = userRegistrationSchema.extend({
        acceptTerms: z.boolean(),
      });

      const data = {
        email: 'test@example.com',
        password: 'Password123',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true,
      };

      const result = extendedSchema.parse(data);
      expect(result.acceptTerms).toBe(true);
    });

    it('should work with partial schemas', () => {
      const partialRegistrationSchema = userRegistrationSchema.partial();

      const partialData = {
        email: 'test@example.com',
        username: 'testuser',
        // Other fields are optional in partial schema
      };

      const result = partialRegistrationSchema.parse(partialData);
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBeUndefined();
    });

    it('should handle transform functions correctly', () => {
      const dataWithMixedCase = {
        email: 'Test.User+Tag@Example.COM',
        password: 'Password123',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = userRegistrationSchema.parse(dataWithMixedCase);
      expect(result.email).toBe('test.user+tag@example.com');
    });

    it('should reject international characters in names (ASCII only supported)', () => {
      const internationalData = {
        email: 'test@example.com',
        password: 'Password123',
        username: 'testuser',
        firstName: 'José',
        lastName: 'François',
      };

      expect(() => userRegistrationSchema.parse(internationalData)).toThrow();
    });
  });
});
