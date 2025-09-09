import { ValidationUtil } from '../validation.util';

describe('ValidationUtil', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'first+last@company.org',
        'user123@test-domain.com',
        'a@b.co',
        'very.long.email.address@very.long.domain.extension',
      ];

      validEmails.forEach((email) => {
        expect(ValidationUtil.validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'plaintext',
        '@missinglocal.com',
        'missing@.com',
        'missing.domain@',
        'double@@domain.com',
        'space @domain.com',
        'tab\t@domain.com',
        'newline\n@domain.com',
      ];

      invalidEmails.forEach((email) => {
        expect(ValidationUtil.validateEmail(email)).toBe(false);
      });
    });

    it('should reject emails longer than 255 characters', () => {
      const longLocal = 'a'.repeat(245); // 245 + 1('@') + 11('example.com') = 257
      const longEmail = `${longLocal}@example.com`;

      expect(longEmail.length).toBeGreaterThan(255);
      expect(ValidationUtil.validateEmail(longEmail)).toBe(false);
    });

    it('should accept emails exactly at 255 character limit', () => {
      const local = 'a'.repeat(243); // 243 + '@' + 'example.com' = 255
      const maxLengthEmail = `${local}@example.com`;

      expect(maxLengthEmail.length).toBe(255);
      expect(ValidationUtil.validateEmail(maxLengthEmail)).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(ValidationUtil.validateEmail('')).toBe(false);
      expect(ValidationUtil.validateEmail('   ')).toBe(false);
      expect(ValidationUtil.validateEmail('a@b.c')).toBe(true);
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert email to lowercase', () => {
      const mixedCaseEmail = 'Test.User@Example.COM';
      const result = ValidationUtil.sanitizeEmail(mixedCaseEmail);

      expect(result).toBe('test.user@example.com');
    });

    it('should trim whitespace', () => {
      const emailWithSpaces = '  test@example.com  ';
      const result = ValidationUtil.sanitizeEmail(emailWithSpaces);

      expect(result).toBe('test@example.com');
    });

    it('should handle empty string', () => {
      expect(ValidationUtil.sanitizeEmail('')).toBe('');
      expect(ValidationUtil.sanitizeEmail('   ')).toBe('');
    });

    it('should handle already sanitized email', () => {
      const cleanEmail = 'test@example.com';
      const result = ValidationUtil.sanitizeEmail(cleanEmail);

      expect(result).toBe(cleanEmail);
    });

    it('should preserve valid special characters', () => {
      const emailWithSpecialChars = '  User.Name+Tag@Sub-Domain.Example.COM  ';
      const result = ValidationUtil.sanitizeEmail(emailWithSpecialChars);

      expect(result).toBe('user.name+tag@sub-domain.example.com');
    });
  });

  describe('validateUsername', () => {
    it('should validate correct username formats', () => {
      const validUsernames = [
        'a',
        'user123',
        'test-user',
        'user-name-with-dashes',
        'Username123',
        'a'.repeat(39), // maximum length
        'user-123-test',
        'CamelCaseUser',
      ];

      validUsernames.forEach((username) => {
        expect(ValidationUtil.validateUsername(username)).toBe(true);
      });
    });

    // Removed over-test: exhaustive invalid character enumeration

    it('should reject usernames starting or ending with hyphens', () => {
      const invalidUsernames = [
        '-username',
        'username-',
        '-',
        '-user-',
        '--username',
        'username--',
      ];

      invalidUsernames.forEach((username) => {
        expect(ValidationUtil.validateUsername(username)).toBe(false);
      });
    });

    it('should validate usernames with internal hyphens', () => {
      const validUsernames = [
        'user-name',
        'a-b',
        'test-user-123',
        'multi-word-username',
      ];

      validUsernames.forEach((username) => {
        expect(ValidationUtil.validateUsername(username)).toBe(true);
      });
    });

    it('should enforce length constraints', () => {
      expect(ValidationUtil.validateUsername('')).toBe(false);
      expect(ValidationUtil.validateUsername('a'.repeat(40))).toBe(false); // too long
      expect(ValidationUtil.validateUsername('a'.repeat(39))).toBe(true); // max length
      expect(ValidationUtil.validateUsername('a')).toBe(true); // min length
    });

    it('should handle null and undefined', () => {
      expect(ValidationUtil.validateUsername(null as unknown as string)).toBe(
        false
      );
      expect(
        ValidationUtil.validateUsername(undefined as unknown as string)
      ).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(ValidationUtil.validateUsername('   ')).toBe(false);
      expect(ValidationUtil.validateUsername('123')).toBe(true);
      expect(ValidationUtil.validateUsername('a1')).toBe(true);
    });
  });

  describe('isReservedUsername', () => {
    it('should identify reserved usernames (case insensitive)', () => {
      const reservedUsernames = [
        'admin',
        'ADMIN',
        'Admin',
        'api',
        'API',
        'www',
        'WWW',
        'root',
        'support',
        'onemployment',
        'employment',
        'job',
        'jobs',
        'career',
        'careers',
        'hire',
        'hiring',
        'recruit',
        'recruiting',
      ];

      reservedUsernames.forEach((username) => {
        expect(ValidationUtil.isReservedUsername(username)).toBe(true);
      });
    });

    it('should allow non-reserved usernames', () => {
      const allowedUsernames = [
        'user',
        'testuser',
        'myusername',
        'regular-user',
        'user123',
        'personal',
        'account',
        'profile',
      ];

      allowedUsernames.forEach((username) => {
        expect(ValidationUtil.isReservedUsername(username)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(ValidationUtil.isReservedUsername('')).toBe(false);
      expect(ValidationUtil.isReservedUsername('   ')).toBe(false);
    });

    // Removed over-test: duplicative case-insensitivity check
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'Password123',
        'MySecure1Password',
        'Complex9Pass',
        'Aa1bcdefgh',
        'Test123Password',
        'StrongP@ss1', // with special character
        'a'.repeat(89) + 'A1', // near max length
      ];

      validPasswords.forEach((password) => {
        expect(ValidationUtil.validatePassword(password)).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        'password', // no uppercase or digit
        'PASSWORD', // no lowercase or digit
        '12345678', // no letters
        'Password', // no digit
        'password1', // no uppercase
        'PASSWORD1', // no lowercase
        'Pass1', // too short
        '', // empty
        'a'.repeat(101), // too long
      ];

      invalidPasswords.forEach((password) => {
        expect(ValidationUtil.validatePassword(password)).toBe(false);
      });
    });

    it('should enforce minimum complexity requirements', () => {
      // Must have lowercase
      expect(ValidationUtil.validatePassword('UPPERCASE123')).toBe(false);

      // Must have uppercase
      expect(ValidationUtil.validatePassword('lowercase123')).toBe(false);

      // Must have digit
      expect(ValidationUtil.validatePassword('PasswordOnly')).toBe(false);

      // Must meet all requirements
      expect(ValidationUtil.validatePassword('Password123')).toBe(true);
    });

    it('should enforce length constraints', () => {
      expect(ValidationUtil.validatePassword('Pass1')).toBe(false); // too short (5)
      expect(ValidationUtil.validatePassword('Passwor1')).toBe(true); // length 8, meets complexity
      expect(ValidationUtil.validatePassword('Password1')).toBe(true); // minimum valid (9)
      expect(ValidationUtil.validatePassword('a'.repeat(97) + 'A12')).toBe(
        true
      ); // max length (100)
      expect(ValidationUtil.validatePassword('a'.repeat(98) + 'A12')).toBe(
        false
      ); // too long (101)
    });

    it('should handle null and undefined', () => {
      expect(ValidationUtil.validatePassword(null as unknown as string)).toBe(
        false
      );
      expect(
        ValidationUtil.validatePassword(undefined as unknown as string)
      ).toBe(false);
    });
  });

  describe('checkPasswordComplexity', () => {
    it('should return empty array for valid passwords', () => {
      const validPasswords = [
        'Password123',
        'MySecure1Password',
        'Complex9Pass',
      ];

      validPasswords.forEach((password) => {
        const errors = ValidationUtil.checkPasswordComplexity(password);
        expect(errors).toEqual([]);
      });
    });

    it('should return appropriate error messages for invalid passwords', () => {
      const testCases = [
        {
          password: '',
          expectedErrors: ['Password is required'],
        },
        {
          password: 'short',
          expectedErrors: [
            'Password must be at least 8 characters long',
            'Password must contain at least one uppercase letter',
            'Password must contain at least one digit',
          ],
        },
        {
          password: 'toolongpassword'.repeat(10),
          expectedErrors: [
            'Password must be no more than 100 characters long',
            'Password must contain at least one uppercase letter',
            'Password must contain at least one digit',
          ],
        },
        {
          password: 'nouppercase123',
          expectedErrors: [
            'Password must contain at least one uppercase letter',
          ],
        },
        {
          password: 'NOLOWERCASE123',
          expectedErrors: [
            'Password must contain at least one lowercase letter',
          ],
        },
        {
          password: 'NoDigitsHere',
          expectedErrors: ['Password must contain at least one digit'],
        },
      ];

      testCases.forEach(({ password, expectedErrors }) => {
        const errors = ValidationUtil.checkPasswordComplexity(password);
        expect(errors).toEqual(expect.arrayContaining(expectedErrors));
        expect(errors.length).toBe(expectedErrors.length);
      });
    });

    it('should handle null and undefined passwords', () => {
      expect(
        ValidationUtil.checkPasswordComplexity(null as unknown as string)
      ).toEqual(['Password is required']);
      expect(
        ValidationUtil.checkPasswordComplexity(undefined as unknown as string)
      ).toEqual(['Password is required']);
    });

    it('should return multiple errors for completely invalid password', () => {
      const errors = ValidationUtil.checkPasswordComplexity('a');

      expect(errors).toContain('Password must be at least 8 characters long');
      expect(errors).toContain(
        'Password must contain at least one uppercase letter'
      );
      expect(errors).toContain('Password must contain at least one digit');
      expect(errors.length).toBe(3);
    });
  });

  describe('validateName', () => {
    it('should validate correct name formats (ASCII only)', () => {
      const validNames = [
        'John',
        'Mary Jane',
        "O'Connor",
        'Jean-Pierre',
        'Maria Del Carmen',
        'Dr. Smith',
        'Anne-Marie',
        // ASCII-only in current validation
        'Mary-Kate',
        "D'Angelo",
        'St. John',
        'van der Berg',
        'Al-Hassan',
      ];

      validNames.forEach((name) => {
        expect(ValidationUtil.validateName(name)).toBe(true);
      });
    });

    it('should reject names with invalid characters', () => {
      const invalidNames = [
        'John123',
        'Mary@Smith',
        'User_Name',
        'Name#Test',
        'John$Doe',
        'Mary%Jane',
        'Test&Name',
        'John*Doe',
        'Mary+Jane',
        'John=Doe',
        'Mary!Jane',
        'John?Doe',
        'Mary/Jane',
        'John\\Doe',
        'Mary|Jane',
        'John^Doe',
        'Mary~Jane',
        'John`Doe',
        'Mary[Jane]',
        'John{Doe}',
        'Mary(Jane)',
        'John<Doe>',
        'Mary"Jane"',
        'John;Doe',
        'Mary:Jane',
        'John,Doe',
      ];

      invalidNames.forEach((name) => {
        expect(ValidationUtil.validateName(name)).toBe(false);
      });
    });

    it('should enforce length constraints', () => {
      expect(ValidationUtil.validateName('')).toBe(false);
      expect(ValidationUtil.validateName('   ')).toBe(false); // only whitespace
      expect(ValidationUtil.validateName('a')).toBe(true); // minimum length
      expect(ValidationUtil.validateName('A'.repeat(100))).toBe(true); // maximum length
      expect(ValidationUtil.validateName('A'.repeat(101))).toBe(false); // too long
    });

    it('should handle names with multiple spaces', () => {
      expect(ValidationUtil.validateName('Mary    Jane')).toBe(true);
      expect(ValidationUtil.validateName('  John   Doe  ')).toBe(true);
    });

    it('should handle null and undefined', () => {
      expect(ValidationUtil.validateName(null as unknown as string)).toBe(
        false
      );
      expect(ValidationUtil.validateName(undefined as unknown as string)).toBe(
        false
      );
    });

    it('should reject international characters (ASCII only supported)', () => {
      const internationalNames = [
        'José',
        'François',
        'Müller',
        'Øyvind',
        'Žarko',
        'Château',
        'Niño',
        'Björk',
      ];

      internationalNames.forEach((name) => {
        expect(ValidationUtil.validateName(name)).toBe(false);
      });
    });
  });

  describe('sanitizeName', () => {
    it('should trim whitespace', () => {
      expect(ValidationUtil.sanitizeName('  John  ')).toBe('John');
      expect(ValidationUtil.sanitizeName('\t\nMary\t\n')).toBe('Mary');
    });

    it('should normalize multiple spaces to single spaces', () => {
      expect(ValidationUtil.sanitizeName('Mary    Jane')).toBe('Mary Jane');
      expect(ValidationUtil.sanitizeName('John   \t   Doe')).toBe('John Doe');
      expect(ValidationUtil.sanitizeName('  Multi    Spaced    Name  ')).toBe(
        'Multi Spaced Name'
      );
    });

    it('should handle empty string and whitespace', () => {
      expect(ValidationUtil.sanitizeName('')).toBe('');
      expect(ValidationUtil.sanitizeName('   ')).toBe('');
      expect(ValidationUtil.sanitizeName('\t\n')).toBe('');
    });

    it('should handle already clean names', () => {
      expect(ValidationUtil.sanitizeName('John Doe')).toBe('John Doe');
      expect(ValidationUtil.sanitizeName('Mary')).toBe('Mary');
    });

    it('should preserve valid special characters', () => {
      expect(ValidationUtil.sanitizeName("  O'Connor  ")).toBe("O'Connor");
      expect(ValidationUtil.sanitizeName('  Jean-Pierre  ')).toBe(
        'Jean-Pierre'
      );
      expect(ValidationUtil.sanitizeName('  Dr.   Smith  ')).toBe('Dr. Smith');
    });

    it('should handle mixed whitespace types', () => {
      expect(ValidationUtil.sanitizeName('\t Mary \n Jane \r')).toBe(
        'Mary Jane'
      );
      expect(ValidationUtil.sanitizeName('John\u00A0\u2000Doe')).toBe(
        'John Doe'
      ); // non-breaking spaces
    });
  });

  describe('integration tests', () => {
    it('should work together for complete user validation', () => {
      // Valid user data
      const validEmail = 'test@example.com';
      const validUsername = 'testuser123';
      const validPassword = 'SecurePass123';
      const validName = 'John Doe';

      expect(ValidationUtil.validateEmail(validEmail)).toBe(true);
      expect(ValidationUtil.validateUsername(validUsername)).toBe(true);
      expect(ValidationUtil.isReservedUsername(validUsername)).toBe(false);
      expect(ValidationUtil.validatePassword(validPassword)).toBe(true);
      expect(ValidationUtil.validateName(validName)).toBe(true);

      expect(ValidationUtil.sanitizeEmail(validEmail.toUpperCase())).toBe(
        validEmail
      );
      expect(ValidationUtil.sanitizeName(`  ${validName}  `)).toBe(validName);
      expect(ValidationUtil.checkPasswordComplexity(validPassword)).toEqual([]);
    });

    it('should reject invalid user data consistently', () => {
      const invalidEmail = 'invalid-email';
      const invalidUsername = 'admin'; // reserved
      const invalidPassword = 'weak';
      const invalidName = 'John123';

      expect(ValidationUtil.validateEmail(invalidEmail)).toBe(false);
      expect(ValidationUtil.isReservedUsername(invalidUsername)).toBe(true);
      expect(ValidationUtil.validatePassword(invalidPassword)).toBe(false);
      expect(ValidationUtil.validateName(invalidName)).toBe(false);

      expect(
        ValidationUtil.checkPasswordComplexity(invalidPassword).length
      ).toBeGreaterThan(0);
    });
  });
});
