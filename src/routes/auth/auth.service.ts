import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import { BcryptStrategy } from './strategies/bcrypt.strategy';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly bcryptStrategy: BcryptStrategy,
    private readonly jwtService: JwtService,
  ) {}

  async loginUser(credentials: LoginDto): Promise<{ user: User; token: string }> {
    const user = await this.authRepository.findByEmail(credentials.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await this.bcryptStrategy.verify(credentials.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const updatedUser = await this.authRepository.updateLastLogin(user.id);

    const token = this.jwtService.sign({
      sub: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
    });

    return { user: updatedUser, token };
  }
}
