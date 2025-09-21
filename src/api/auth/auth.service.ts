import { User } from '@prisma/client';
import { LoginRequest } from './auth.schema';
import { IAuthRepository } from './contracts/auth.repository.contract';
import { IPasswordStrategy } from './strategies/contracts/password-strategy.contract';
import { JWTUtil } from './utils/jwt.util';
import { UnauthorizedError } from '../../common/error/http-errors';
import { IAuthService } from './contracts/auth.service.contract';

export class AuthService extends IAuthService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly passwordStrategy: IPasswordStrategy,
    private readonly jwtUtil: JWTUtil
  ) {
    super();
  }

  async loginUser(
    credentials: LoginRequest
  ): Promise<{ user: User; token: string }> {
    // 1. Find user by email (case-insensitive)
    const user = await this.authRepository.findByEmail(credentials.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 2. Check if user has passwordHash (not OAuth-only account)
    if (!user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 3. Verify password
    const isValid = await this.passwordStrategy.verify(
      credentials.password,
      user.passwordHash
    );
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 4. Update lastLoginAt and get updated user
    const updatedUser = await this.authRepository.updateLastLogin(user.id);

    // 5. Generate JWT token
    const token = await this.jwtUtil.generateToken(updatedUser);

    // Return updated user with current lastLoginAt timestamp
    return { user: updatedUser, token };
  }
}
