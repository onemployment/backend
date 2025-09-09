import { JWTPayload } from '../api/auth/utils/jwt.util';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
