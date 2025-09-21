import { User } from '@prisma/client';

export interface UserCreationData {
  email: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  accountCreationMethod: 'local' | 'google';
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
}

export abstract class IUserRepository {
  // User creation (returns domain model)
  abstract createUser(userData: UserCreationData): Promise<User>;

  // Profile management (returns domain models)
  abstract findById(id: string): Promise<User | null>;
  abstract updateProfile(id: string, updates: ProfileUpdateData): Promise<User>;

  // Validation queries (returns primitives)
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByUsername(username: string): Promise<User | null>;
  abstract isEmailTaken(email: string): Promise<boolean>;
  abstract isUsernameTaken(username: string): Promise<boolean>; // case-insensitive check

  // Username conflict resolution (returns domain models)
  abstract findUsersByUsernamePrefix(prefix: string): Promise<User[]>;
}
