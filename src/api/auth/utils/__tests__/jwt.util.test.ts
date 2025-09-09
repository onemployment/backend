import jwt from 'jsonwebtoken';
import { JWTUtil, JWTPayload } from '../jwt.util';
import { User } from '@prisma/client';
import { UnauthorizedError } from '../../../../common/error/http-errors';

describe('JWTUtil', () => {
  let jwtUtil: JWTUtil;
  const originalEnv = process.env;

  const mockUser: User = {
    id: 'test-uuid-123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashedpassword123',
    firstName: 'Test',
    lastName: 'User',
    displayName: null,
    googleId: null,
    emailVerified: false,
    isActive: true,
    accountCreationMethod: 'local',
    lastPasswordChange: new Date('2023-01-01T00:00:00.000Z'),
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    lastLoginAt: null,
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key';
    jwtUtil = new JWTUtil();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use JWT_SECRET from environment', () => {
      process.env.JWT_SECRET = 'custom-secret';
      const customJwtUtil = new JWTUtil();
      expect(customJwtUtil).toBeInstanceOf(JWTUtil);
    });

    it('should use default secret in development', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';
      const devJwtUtil = new JWTUtil();
      expect(devJwtUtil).toBeInstanceOf(JWTUtil);
    });

    it('should throw error when JWT_SECRET is missing in production', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'production';

      expect(() => new JWTUtil()).toThrow(
        'JWT_SECRET must be set in production'
      );
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', async () => {
      const token = await jwtUtil.generateToken(mockUser);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      const payload = jwt.decode(token) as JWTPayload;
      expect(payload.sub).toBe('test-uuid-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.username).toBe('testuser');
      expect(payload.iss).toBe('onemployment-auth');
      expect(payload.aud).toBe('onemployment-api');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('should generate token that expires in 8 hours', async () => {
      const beforeGeneration = Math.floor(Date.now() / 1000);
      const token = await jwtUtil.generateToken(mockUser);
      const afterGeneration = Math.floor(Date.now() / 1000);

      const payload = jwt.decode(token) as JWTPayload;
      const expectedExpiry = beforeGeneration + 8 * 60 * 60; // 8 hours
      const maxExpectedExpiry = afterGeneration + 8 * 60 * 60;

      expect(payload.exp).toBeGreaterThanOrEqual(expectedExpiry);
      expect(payload.exp).toBeLessThanOrEqual(maxExpectedExpiry);
    });

    it('should reject when jwt.sign fails', async () => {
      const originalSign = jwt.sign;
      jest
        .spyOn(jwt, 'sign')
        .mockImplementation((payload, secret, options, callback) => {
          if (typeof callback === 'function') {
            callback(new Error('JWT signing failed'), undefined);
          }
        });

      await expect(jwtUtil.generateToken(mockUser)).rejects.toThrow(
        'Failed to generate JWT token'
      );

      jwt.sign = originalSign;
    });

    it('should reject when jwt.sign returns no token', async () => {
      const originalSign = jwt.sign;
      jest
        .spyOn(jwt, 'sign')
        .mockImplementation((payload, secret, options, callback) => {
          if (typeof callback === 'function') {
            callback(null, undefined);
          }
        });

      await expect(jwtUtil.generateToken(mockUser)).rejects.toThrow(
        'Failed to generate JWT token'
      );

      jwt.sign = originalSign;
    });
  });

  describe('validateToken', () => {
    it('should validate valid token successfully', async () => {
      const token = await jwtUtil.generateToken(mockUser);

      const payload = await jwtUtil.validateToken(token);

      expect(payload.sub).toBe('test-uuid-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.username).toBe('testuser');
      expect(payload.iss).toBe('onemployment-auth');
      expect(payload.aud).toBe('onemployment-api');
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid.jwt.token';

      await expect(jwtUtil.validateToken(invalidToken)).rejects.toThrow(
        UnauthorizedError
      );
      await expect(jwtUtil.validateToken(invalidToken)).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should reject expired token', async () => {
      const expiredPayload = {
        sub: 'test-uuid-123',
        email: 'test@example.com',
        username: 'testuser',
      };

      const expiredToken = jwt.sign(expiredPayload, 'test-secret-key', {
        expiresIn: '-1h',
        issuer: 'onemployment-auth',
        audience: 'onemployment-api',
      });

      await expect(jwtUtil.validateToken(expiredToken)).rejects.toThrow(
        UnauthorizedError
      );
      await expect(jwtUtil.validateToken(expiredToken)).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should reject token with wrong issuer', async () => {
      const wrongIssuerToken = jwt.sign(
        {
          sub: 'test-uuid-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        'test-secret-key',
        {
          expiresIn: '8h',
          issuer: 'wrong-issuer',
          audience: 'onemployment-api',
        }
      );

      await expect(jwtUtil.validateToken(wrongIssuerToken)).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('should reject token with wrong audience', async () => {
      const wrongAudienceToken = jwt.sign(
        {
          sub: 'test-uuid-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        'test-secret-key',
        {
          expiresIn: '8h',
          issuer: 'onemployment-auth',
          audience: 'wrong-audience',
        }
      );

      await expect(jwtUtil.validateToken(wrongAudienceToken)).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('should reject token signed with different secret', async () => {
      const differentSecretToken = jwt.sign(
        {
          sub: 'test-uuid-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        'different-secret',
        {
          expiresIn: '8h',
          issuer: 'onemployment-auth',
          audience: 'onemployment-api',
        }
      );

      await expect(jwtUtil.validateToken(differentSecretToken)).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe('extractPayload', () => {
    it('should extract payload from valid token without verification', async () => {
      const token = await jwtUtil.generateToken(mockUser);

      const payload = jwtUtil.extractPayload(token);

      expect(payload).toBeDefined();
      expect(payload?.sub).toBe('test-uuid-123');
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.username).toBe('testuser');
      expect(payload?.iss).toBe('onemployment-auth');
      expect(payload?.aud).toBe('onemployment-api');
    });

    it('should extract payload from expired token', () => {
      const expiredToken = jwt.sign(
        {
          sub: 'test-uuid-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        'test-secret-key',
        {
          expiresIn: '-1h',
          issuer: 'onemployment-auth',
          audience: 'onemployment-api',
        }
      );

      const payload = jwtUtil.extractPayload(expiredToken);

      expect(payload).toBeDefined();
      expect(payload?.sub).toBe('test-uuid-123');
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'not.a.valid.jwt.token.structure';

      const payload = jwtUtil.extractPayload(malformedToken);

      expect(payload).toBeNull();
    });

    it('should return null for invalid token format', () => {
      const invalidToken = 'invalid-token';

      const payload = jwtUtil.extractPayload(invalidToken);

      expect(payload).toBeNull();
    });

    it('should return null for empty token', () => {
      const payload = jwtUtil.extractPayload('');

      expect(payload).toBeNull();
    });

    it('should handle jwt.decode throwing error', () => {
      const originalDecode = jwt.decode;
      jest.spyOn(jwt, 'decode').mockImplementation(() => {
        throw new Error('Decode error');
      });

      const payload = jwtUtil.extractPayload('some-token');

      expect(payload).toBeNull();

      jwt.decode = originalDecode;
    });

    it('should return null when decoded payload is not an object', () => {
      const originalDecode = jwt.decode;
      jest
        .spyOn(jwt, 'decode')
        .mockReturnValue('not-an-object' as unknown as JWTPayload);

      const payload = jwtUtil.extractPayload('some-token');

      expect(payload).toBeNull();

      jwt.decode = originalDecode;
    });
  });

  describe('integration with different environments', () => {
    it('should work in test environment with test secret', async () => {
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'test-secret';
      const testJwtUtil = new JWTUtil();

      const token = await testJwtUtil.generateToken(mockUser);
      const payload = await testJwtUtil.validateToken(token);

      expect(payload.sub).toBe('test-uuid-123');
    });

    it('should work in development environment with default secret', async () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';
      const devJwtUtil = new JWTUtil();

      const token = await devJwtUtil.generateToken(mockUser);
      const payload = await devJwtUtil.validateToken(token);

      expect(payload.sub).toBe('test-uuid-123');
    });
  });
});
