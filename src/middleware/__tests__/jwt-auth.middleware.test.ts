import { Request, Response, NextFunction } from 'express';
import {
  createJwtAuthMiddleware,
  initializeJwtMiddleware,
  jwtAuthMiddleware,
} from '../jwt-auth.middleware';
import { JWTUtil, JWTPayload } from '../../api/auth/utils/jwt.util';
import { UnauthorizedError } from '../../common/error/http-errors';

describe('JWT Auth Middleware', () => {
  let jwtUtil: JWTUtil;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockPayload: JWTPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    iat: 1234567890,
    exp: 1234567890 + 8 * 60 * 60, // 8 hours later
    iss: 'onemployment-auth',
    aud: 'onemployment-api',
  };

  beforeEach(() => {
    jwtUtil = new JWTUtil();

    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('createJwtAuthMiddleware', () => {
    it('should successfully validate token and attach user to request', async () => {
      const token = 'valid-jwt-token';
      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };
      jest.spyOn(jwtUtil, 'validateToken').mockResolvedValue(mockPayload);

      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(jwtUtil.validateToken).toHaveBeenCalledWith(token);
      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject request without authorization header', async () => {
      mockReq.headers = {};

      const validateSpy = jest.spyOn(jwtUtil, 'validateToken');
      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(validateSpy).not.toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toBe(
        'No token provided'
      );
    });

    it('should reject request with malformed authorization header', async () => {
      mockReq.headers = {
        authorization: 'InvalidFormat token',
      };

      const validateSpy = jest.spyOn(jwtUtil, 'validateToken');
      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(validateSpy).not.toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toBe(
        'No token provided'
      );
    });

    it('should reject request with empty Bearer token', async () => {
      mockReq.headers = {
        authorization: 'Bearer ',
      };

      const validateSpy = jest.spyOn(jwtUtil, 'validateToken');
      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(validateSpy).toHaveBeenCalledWith('');
      expect(mockReq.user).toBeUndefined();
    });

    it('should handle JWT validation errors', async () => {
      const token = 'invalid-jwt-token';
      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };
      jest
        .spyOn(jwtUtil, 'validateToken')
        .mockRejectedValue(new UnauthorizedError('Token expired'));

      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(jwtUtil.validateToken).toHaveBeenCalledWith(token);
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toBe(
        'Token expired'
      );
    });

    it('should handle generic validation errors as unauthorized', async () => {
      const token = 'malformed-token';
      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };
      jest
        .spyOn(jwtUtil, 'validateToken')
        .mockRejectedValue(new Error('Generic JWT error'));

      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(jwtUtil.validateToken).toHaveBeenCalledWith(token);
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toBe(
        'Invalid token'
      );
    });

    it('should handle authorization header with extra spaces', async () => {
      const token = 'valid-jwt-token';
      mockReq.headers = {
        authorization: `Bearer  ${token}  `,
      };
      jest.spyOn(jwtUtil, 'validateToken').mockResolvedValue(mockPayload);

      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(jwtUtil.validateToken).toHaveBeenCalledWith(` ${token}  `);
      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle case sensitive Bearer keyword', async () => {
      mockReq.headers = {
        authorization: 'bearer valid-jwt-token',
      };

      const validateSpy = jest.spyOn(jwtUtil, 'validateToken');
      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(validateSpy).not.toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toBe(
        'No token provided'
      );
    });

    it('should preserve request context when successful', async () => {
      const token = 'valid-jwt-token';
      mockReq = {
        headers: { authorization: `Bearer ${token}` },
        path: '/protected',
        method: 'GET',
        body: { data: 'test' },
      };
      jest.spyOn(jwtUtil, 'validateToken').mockResolvedValue(mockPayload);

      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockPayload);
      expect(mockReq.path).toBe('/protected');
      expect(mockReq.method).toBe('GET');
      expect(mockReq.body).toEqual({ data: 'test' });
    });
  });

  describe('initializeJwtMiddleware', () => {
    it('should initialize global middleware instance', () => {
      initializeJwtMiddleware(jwtUtil);

      expect(jwtAuthMiddleware).toBeDefined();
      expect(typeof jwtAuthMiddleware).toBe('function');
    });

    it('should create working middleware instance', async () => {
      initializeJwtMiddleware(jwtUtil);

      const token = 'test-token';
      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };
      jest.spyOn(jwtUtil, 'validateToken').mockResolvedValue(mockPayload);

      await jwtAuthMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(jwtUtil.validateToken).toHaveBeenCalledWith(token);
      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should replace existing middleware instance when called again', async () => {
      const firstJwtUtil = new JWTUtil();
      const secondJwtUtil = new JWTUtil();
      jest.spyOn(secondJwtUtil, 'validateToken').mockResolvedValue({
        ...mockPayload,
        sub: 'different-user',
      } as JWTPayload);

      // Initialize with first util
      initializeJwtMiddleware(firstJwtUtil);

      // Initialize with second util
      initializeJwtMiddleware(secondJwtUtil);

      const token = 'test-token';
      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      await jwtAuthMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Ensure original instance method exists (not a Jest mock)
      expect(typeof firstJwtUtil.validateToken).toBe('function');
      expect(secondJwtUtil.validateToken).toHaveBeenCalledWith(token);
      expect(mockReq.user?.sub).toBe('different-user');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle null authorization header', async () => {
      mockReq.headers = {
        authorization: null as unknown as string,
      };

      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should handle undefined authorization header value', async () => {
      mockReq.headers = {
        authorization: undefined,
      };

      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should handle JWT util throwing synchronous errors', async () => {
      const token = 'sync-error-token';
      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };
      jest.spyOn(jwtUtil, 'validateToken').mockImplementation(() => {
        throw new Error('Synchronous JWT error');
      });

      const middleware = createJwtAuthMiddleware(jwtUtil);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toBe(
        'Invalid token'
      );
    });
  });
});
