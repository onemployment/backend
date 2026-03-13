import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
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
} from '../auth/ports/password-hash-strategy.port';
import { UsernameSuggestionsUtil } from './utils/username-suggestions.util';
import { ValidationUtil } from './utils/validation.util';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_STRATEGY)
    private readonly passwordStrategy: IPasswordHashStrategy,
    private readonly jwtService: JwtService,
    private readonly usernameSuggestionsUtil: UsernameSuggestionsUtil
  ) {}

  async registerUser(
    data: RegisterUserDto
  ): Promise<{ user: User; token: string }> {
    if (ValidationUtil.isReservedUsername(data.username)) {
      throw new BadRequestException('Username is reserved and cannot be used');
    }

    if (await this.userRepository.isEmailTaken(data.email)) {
      throw new ConflictException(
        'Email already registered. Please sign in instead'
      );
    }

    if (await this.userRepository.isUsernameTaken(data.username)) {
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await this.passwordStrategy.hash(data.password);
    const firstName = ValidationUtil.sanitizeName(data.firstName);
    const lastName = ValidationUtil.sanitizeName(data.lastName);

    const user = await this.userRepository.createUser({
      email: data.email,
      username: data.username,
      passwordHash,
      firstName,
      lastName,
      accountCreationMethod: 'local',
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      username: user.username,
    });

    return { user, token };
  }

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserProfile(
    userId: string,
    updates: UpdateUserProfileDto
  ): Promise<User> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) throw new NotFoundException('User not found');

    const sanitized: UpdateUserProfileDto = {};
    if (updates.firstName !== undefined)
      sanitized.firstName = ValidationUtil.sanitizeName(updates.firstName);
    if (updates.lastName !== undefined)
      sanitized.lastName = ValidationUtil.sanitizeName(updates.lastName);
    if (updates.displayName !== undefined) {
      sanitized.displayName = updates.displayName
        ? ValidationUtil.sanitizeName(updates.displayName)
        : updates.displayName;
    }

    return this.userRepository.updateProfile(userId, sanitized);
  }

  async validateUsername(
    username: string
  ): Promise<{ available: boolean; suggestions?: string[] }> {
    if (
      !ValidationUtil.validateUsername(username) ||
      ValidationUtil.isReservedUsername(username)
    ) {
      return {
        available: false,
        suggestions:
          await this.usernameSuggestionsUtil.generateSuggestions(username),
      };
    }

    const available =
      await this.usernameSuggestionsUtil.isUsernameAvailable(username);
    if (!available) {
      return {
        available: false,
        suggestions:
          await this.usernameSuggestionsUtil.generateSuggestions(username),
      };
    }

    return { available: true };
  }

  async validateEmail(email: string): Promise<{ available: boolean }> {
    const sanitized = ValidationUtil.sanitizeEmail(email);
    if (!ValidationUtil.validateEmail(sanitized)) return { available: false };
    const isTaken = await this.userRepository.isEmailTaken(sanitized);
    return { available: !isTaken };
  }

  async suggestUsernames(baseUsername: string): Promise<string[]> {
    return this.usernameSuggestionsUtil.generateSuggestions(baseUsername, 5);
  }
}
