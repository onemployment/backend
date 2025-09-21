import { User } from '@prisma/client';
import { IUserRepository } from './contracts/user.repository.contract';
import { IPasswordStrategy } from '../auth/strategies/contracts/password-strategy.contract';
import { JWTUtil } from '../auth/utils/jwt.util';
import { UsernameSuggestionsUtil } from './utils/username-suggestions.util';
import { ValidationUtil } from './utils/validation.util';
import {
  UserRegistrationRequest,
  UserProfileUpdateRequest,
} from './user.schema';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../../common/error/http-errors';
import { IUserService } from './contracts/user.service.contract';

export class UserService extends IUserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordStrategy: IPasswordStrategy,
    private readonly jwtUtil: JWTUtil,
    private readonly usernameSuggestionsUtil: UsernameSuggestionsUtil
  ) {
    super();
  }

  async registerUser(
    userData: UserRegistrationRequest
  ): Promise<{ user: User; token: string }> {
    // 1. Additional validation beyond Zod schema
    if (ValidationUtil.isReservedUsername(userData.username)) {
      throw new BadRequestError('Username is reserved and cannot be used');
    }

    // 2. Validate email uniqueness
    if (await this.userRepository.isEmailTaken(userData.email)) {
      throw new ConflictError(
        'Email already registered. Please sign in instead'
      );
    }

    // 3. Validate username uniqueness (case-insensitive)
    if (await this.userRepository.isUsernameTaken(userData.username)) {
      throw new ConflictError('Username already taken');
    }

    // 4. Hash password
    const passwordHash = await this.passwordStrategy.hash(userData.password);

    // 5. Sanitize names
    const firstName = ValidationUtil.sanitizeName(userData.firstName);
    const lastName = ValidationUtil.sanitizeName(userData.lastName);

    // 6. Create user (returns domain model)
    const user = await this.userRepository.createUser({
      email: userData.email, // already transformed to lowercase by Zod
      username: userData.username,
      passwordHash,
      firstName,
      lastName,
      accountCreationMethod: 'local',
    });

    // 7. Generate JWT token
    const token = await this.jwtUtil.generateToken(user);

    // Return domain model + token (not API response shape)
    return { user, token };
  }

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user; // Return domain model
  }

  async updateUserProfile(
    userId: string,
    updates: UserProfileUpdateRequest
  ): Promise<User> {
    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Sanitize name fields if provided
    const sanitizedUpdates: typeof updates = {};
    if (updates.firstName !== undefined) {
      sanitizedUpdates.firstName = ValidationUtil.sanitizeName(
        updates.firstName
      );
    }
    if (updates.lastName !== undefined) {
      sanitizedUpdates.lastName = ValidationUtil.sanitizeName(updates.lastName);
    }
    if (updates.displayName !== undefined) {
      sanitizedUpdates.displayName = updates.displayName
        ? ValidationUtil.sanitizeName(updates.displayName)
        : updates.displayName;
    }

    // Update profile (returns domain model)
    return await this.userRepository.updateProfile(userId, sanitizedUpdates);
  }

  async validateUsername(
    username: string
  ): Promise<{ available: boolean; suggestions?: string[] }> {
    // Basic format validation
    if (!ValidationUtil.validateUsername(username)) {
      return {
        available: false,
        suggestions:
          await this.usernameSuggestionsUtil.generateSuggestions(username),
      };
    }

    // Check if reserved
    if (ValidationUtil.isReservedUsername(username)) {
      return {
        available: false,
        suggestions:
          await this.usernameSuggestionsUtil.generateSuggestions(username),
      };
    }

    // Check availability
    const available =
      await this.usernameSuggestionsUtil.isUsernameAvailable(username);

    if (!available) {
      const suggestions =
        await this.usernameSuggestionsUtil.generateSuggestions(username);
      return { available: false, suggestions };
    }

    return { available: true }; // No API response shaping here
  }

  async validateEmail(email: string): Promise<{ available: boolean }> {
    // Sanitize email
    const sanitizedEmail = ValidationUtil.sanitizeEmail(email);

    // Basic format validation
    if (!ValidationUtil.validateEmail(sanitizedEmail)) {
      return { available: false };
    }

    // Check availability
    const isTaken = await this.userRepository.isEmailTaken(sanitizedEmail);
    return { available: !isTaken };
  }

  async suggestUsernames(baseUsername: string): Promise<string[]> {
    // Generate suggestions even for invalid base usernames
    return await this.usernameSuggestionsUtil.generateSuggestions(
      baseUsername,
      5
    );
  }
}
