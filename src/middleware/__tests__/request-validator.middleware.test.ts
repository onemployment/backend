import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requestValidationHandler } from '../request-validator.middleware';
import { RequestValidationError } from '../../common/error/http-errors';
import { logger } from '../../common/logger/logger';

jest.mock('../../common/logger/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('requestValidationHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const testSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
  });

  beforeEach(() => {
    mockReq = {
      path: '/test',
      method: 'POST',
      get: jest.fn().mockReturnValue('application/json'),
      body: {},
    };
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('successful validation', () => {
    it('should validate valid request body and call next', () => {
      const validBody = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };
      mockReq.body = validBody;

      const middleware = requestValidationHandler(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual(validBody);
      expect(logger.info).toHaveBeenCalledWith('Validating request', {
        path: '/test',
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: '[REDACTED]',
          name: 'Test User',
        },
        contentType: 'application/json',
      });
      expect(logger.info).toHaveBeenCalledWith('Validation passed', {
        data: {
          email: 'test@example.com',
          password: '[REDACTED]',
          name: 'Test User',
        },
      });
    });

    it('should handle optional fields correctly', () => {
      const validBodyWithoutOptional = {
        email: 'test@example.com',
        password: 'password123',
      };
      mockReq.body = validBodyWithoutOptional;

      const middleware = requestValidationHandler(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual(validBodyWithoutOptional);
    });

    it('should transform and clean data through Zod schema', () => {
      const transformSchema = z.object({
        email: z.string().email().toLowerCase(),
        count: z.string().transform((val) => parseInt(val, 10)),
      });

      mockReq.body = {
        email: 'TEST@EXAMPLE.COM',
        count: '42',
      };

      const middleware = requestValidationHandler(transformSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({
        email: 'test@example.com',
        count: 42,
      });
    });
  });

  describe('validation failures', () => {
    it('should throw RequestValidationError for invalid data', () => {
      const invalidBody = {
        email: 'invalid-email',
        password: '123', // too short
      };
      mockReq.body = invalidBody;

      const middleware = requestValidationHandler(testSchema);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(RequestValidationError);

      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Validation failed', {
        err: expect.any(Object),
        originalBody: {
          email: 'invalid-email',
          password: '[REDACTED]',
        },
      });
    });

    it('should throw RequestValidationError for missing required fields', () => {
      mockReq.body = {
        email: 'test@example.com',
        // missing password
      };

      const middleware = requestValidationHandler(testSchema);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(RequestValidationError);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw RequestValidationError for empty body when schema requires fields', () => {
      mockReq.body = {};

      const middleware = requestValidationHandler(testSchema);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(RequestValidationError);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('sensitive field sanitization', () => {
    it('should sanitize password field in logs', () => {
      const bodyWithPassword = {
        email: 'test@example.com',
        password: 'secretpassword123',
      };
      mockReq.body = bodyWithPassword;

      const middleware = requestValidationHandler(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Validating request', {
        path: '/test',
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: '[REDACTED]',
        },
        contentType: 'application/json',
      });
    });

    it('should sanitize multiple sensitive fields', () => {
      const sensitiveSchema = z.object({
        email: z.string().email(),
        password: z.string(),
        confirmPassword: z.string(),
        token: z.string(),
        secret: z.string(),
        apiKey: z.string(),
        normalField: z.string(),
      });

      mockReq.body = {
        email: 'test@example.com',
        password: 'secret1',
        confirmPassword: 'secret1',
        token: 'jwt-token',
        secret: 'api-secret',
        apiKey: 'key123',
        normalField: 'visible',
      };

      const middleware = requestValidationHandler(sensitiveSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Validating request', {
        path: '/test',
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: '[REDACTED]',
          confirmPassword: '[REDACTED]',
          token: '[REDACTED]',
          secret: '[REDACTED]',
          apiKey: '[REDACTED]',
          normalField: 'visible',
        },
        contentType: 'application/json',
      });
    });

    it('should handle non-object body types', () => {
      mockReq.body = 'string body';

      const stringSchema = z.string();
      const middleware = requestValidationHandler(stringSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Validating request', {
        path: '/test',
        method: 'POST',
        body: 'string body',
        contentType: 'application/json',
      });
    });

    it('should handle null body', () => {
      mockReq.body = null;

      const nullSchema = z.null();
      const middleware = requestValidationHandler(nullSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Validating request', {
        path: '/test',
        method: 'POST',
        body: null,
        contentType: 'application/json',
      });
    });

    it('should handle undefined body', () => {
      mockReq.body = undefined;

      const undefinedSchema = z.undefined();
      const middleware = requestValidationHandler(undefinedSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Validating request', {
        path: '/test',
        method: 'POST',
        body: undefined,
        contentType: 'application/json',
      });
    });
  });

  describe('logging behavior', () => {
    it('should log request details with correct format', () => {
      mockReq = {
        ...(mockReq as Request),
        path: '/api/auth/login',
        method: 'POST',
        body: { email: 'test@example.com', password: 'password123' },
      } as unknown as Partial<Request>;

      const middleware = requestValidationHandler(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Validating request', {
        path: '/api/auth/login',
        method: 'POST',
        body: { email: 'test@example.com', password: '[REDACTED]' },
        contentType: 'application/json',
      });
    });

    it('should handle missing Content-Type header', () => {
      mockReq.body = { email: 'test@example.com', password: 'password123' };
      (mockReq.get as jest.Mock).mockReturnValue(undefined);

      const middleware = requestValidationHandler(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Validating request', {
        path: '/test',
        method: 'POST',
        body: { email: 'test@example.com', password: '[REDACTED]' },
        contentType: undefined,
      });
    });
  });
});
