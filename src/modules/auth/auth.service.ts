import {
  Injectable,
  UnauthorizedException,
  Inject,
  LoggerService as ILoggerService,
} from '@nestjs/common';
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
import { LOGGER } from '../../shared/logger/logger.port';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_STRATEGY)
    private readonly passwordStrategy: IPasswordHashStrategy,
    private readonly jwtService: JwtService,
    @Inject(LOGGER) private readonly logger: ILoggerService
  ) {}

  async loginUser(
    credentials: LoginDto
  ): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      this.logger.log(
        `Login failed — user not found for email=${credentials.email}`,
        'AuthService'
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      this.logger.log(
        `Login failed — no password set for userId=${user.id}`,
        'AuthService'
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await this.passwordStrategy.verify(
      credentials.password,
      user.passwordHash
    );
    if (!isValid) {
      this.logger.log(
        `Login failed — invalid password for userId=${user.id}`,
        'AuthService'
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    const updatedUser = await this.userRepository.updateLastLogin(user.id);

    const token = this.jwtService.sign({
      sub: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
    });

    this.logger.log(
      `Login successful for userId=${updatedUser.id}`,
      'AuthService'
    );
    return { user: updatedUser, token };
  }
}
