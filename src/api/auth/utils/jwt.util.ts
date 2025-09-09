import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { UnauthorizedError } from '../../../common/error/http-errors';

export interface JWTPayload {
  sub: string; // user.id
  email: string;
  username: string;
  iss: string; // "onemployment-auth"
  aud: string; // "onemployment-api"
  iat: number;
  exp: number;
}

export class JWTUtil {
  private readonly secret: string;
  private readonly issuer = 'onemployment-auth';
  private readonly audience = 'onemployment-api';
  private readonly expiresIn = '8h';

  constructor() {
    this.secret = process.env.JWT_SECRET || 'development-secret-key';
    if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
  }

  async generateToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    return new Promise((resolve, reject) => {
      jwt.sign(
        payload,
        this.secret,
        {
          expiresIn: this.expiresIn,
          issuer: this.issuer,
          audience: this.audience,
        },
        (err, token) => {
          if (err || !token) {
            reject(new Error('Failed to generate JWT token'));
          } else {
            resolve(token);
          }
        }
      );
    });
  }

  async validateToken(token: string): Promise<JWTPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.secret,
        {
          issuer: this.issuer,
          audience: this.audience,
        },
        (err, decoded) => {
          if (err) {
            reject(new UnauthorizedError('Invalid or expired token'));
          } else {
            resolve(decoded as JWTPayload);
          }
        }
      );
    });
  }

  extractPayload(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded && typeof decoded === 'object' ? decoded : null;
    } catch {
      return null;
    }
  }
}
