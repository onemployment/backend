import { User } from '@prisma/client';
import { LoginRequest } from './auth.schema';
import { IAuthRepository } from './auth.repository';
import { IPasswordStrategy } from './strategies/password-strategy.interface';
import { JWTUtil } from './utils/jwt.util';
import { UnauthorizedError } from '../../common/error/http-errors';

export interface IAuthService {
  // Returns domain model + token, NOT API response shape
  loginUser(credentials: LoginRequest): Promise<{ user: User; token: string }>;
}

export class AuthService implements IAuthService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly passwordStrategy: IPasswordStrategy,
    private readonly jwtUtil: JWTUtil
  ) {}

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
