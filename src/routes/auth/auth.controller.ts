import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    const { user, token } = await this.authService.loginUser(loginDto);
    return {
      message: 'Login successful',
      token,
      user: this.transformUser(user),
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  logout() {
    return { message: 'Logout successful' };
  }

  private transformUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
    };
  }
}
