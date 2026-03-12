import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser, info: Error | null): TUser {
    if (err) throw err;

    if (!user) {
      const message =
        info?.name === 'JsonWebTokenError' ||
        info?.name === 'TokenExpiredError' ||
        info?.name === 'NotBeforeError'
          ? 'Invalid or expired token'
          : 'No token provided';
      throw new UnauthorizedException(message);
    }

    return user;
  }
}
