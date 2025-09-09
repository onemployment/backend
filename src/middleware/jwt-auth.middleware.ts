import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../common/error/http-errors';
import { JWTUtil } from '../api/auth/utils/jwt.util';

// Consistent middleware pattern used by both domains
export const createJwtAuthMiddleware = (jwtUtil: JWTUtil) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError('No token provided');
      }

      const token = authHeader.substring(7);
      const payload = await jwtUtil.validateToken(token);

      // Attach user info to request - used consistently by both domains
      req.user = payload;
      next();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        next(error);
      } else {
        next(new UnauthorizedError('Invalid token'));
      }
    }
  };
};

// Export singleton for consistent usage
export let jwtAuthMiddleware: ReturnType<typeof createJwtAuthMiddleware>;

export const initializeJwtMiddleware = (jwtUtil: JWTUtil) => {
  jwtAuthMiddleware = createJwtAuthMiddleware(jwtUtil);
};
