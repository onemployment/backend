import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { User } from '../../domain/user/user.entity';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(201)
  async register(@Body() dto: RegisterUserDto) {
    const { user, token } = await this.userService.registerUser(dto);
    return {
      message: 'User created successfully',
      token,
      user: this.transformUser(user),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: { user: JwtPayload }) {
    const user = await this.userService.getUserProfile(req.user.sub);
    return { user: this.transformUser(user) };
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @Request() req: { user: JwtPayload },
    @Body() dto: UpdateUserProfileDto
  ) {
    const user = await this.userService.updateUserProfile(req.user.sub, dto);
    return {
      message: 'Profile updated successfully',
      user: this.transformUser(user),
    };
  }

  @Get('validate/username')
  async validateUsername(@Query('username') username: string) {
    if (!username) {
      throw new BadRequestException('Username parameter is required');
    }
    const { available, suggestions } =
      await this.userService.validateUsername(username);
    return {
      available,
      message: available ? 'Username is available' : 'Username is taken',
      ...(suggestions && { suggestions }),
    };
  }

  @Get('validate/email')
  async validateEmail(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email parameter is required');
    }
    const { available } = await this.userService.validateEmail(email);
    return {
      available,
      message: available
        ? 'Email is available'
        : 'Email already registered. Please sign in instead',
    };
  }

  @Get('suggest-usernames')
  async suggestUsernames(@Query('username') username: string) {
    if (!username) {
      throw new BadRequestException('Username parameter is required');
    }
    const suggestions = await this.userService.suggestUsernames(username);
    return { suggestions };
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
      accountCreationMethod: user.accountCreationMethod,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
    };
  }
}
