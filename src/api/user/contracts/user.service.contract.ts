import { User } from '@prisma/client';
import {
  UserRegistrationRequest,
  UserProfileUpdateRequest,
} from '../user.schema';

export abstract class IUserService {
  // Returns domain models + primitives, NOT API response shapes
  abstract registerUser(
    userData: UserRegistrationRequest
  ): Promise<{ user: User; token: string }>;
  abstract getUserProfile(userId: string): Promise<User>;
  abstract updateUserProfile(
    userId: string,
    updates: UserProfileUpdateRequest
  ): Promise<User>;

  // Validation services return primitive data structures
  abstract validateUsername(
    username: string
  ): Promise<{ available: boolean; suggestions?: string[] }>;
  abstract validateEmail(email: string): Promise<{ available: boolean }>;
  abstract suggestUsernames(baseUsername: string): Promise<string[]>;
}
