import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/user/user.entity';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/user/user.repository.port';
import {
  IPasswordHashStrategy,
  PASSWORD_STRATEGY,
} from './ports/password-hash-strategy.port';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_STRATEGY)
    private readonly passwordStrategy: IPasswordHashStrategy,
    private readonly jwtService: JwtService
  ) {}

  async loginUser(
    credentials: LoginDto
  ): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await this.passwordStrategy.verify(
      credentials.password,
      user.passwordHash
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const updatedUser = await this.userRepository.updateLastLogin(user.id);

    const token = this.jwtService.sign({
      sub: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
    });

    return { user: updatedUser, token };
  }
}
