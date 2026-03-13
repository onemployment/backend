// src/domain/user/user.repository.port.ts
import { User } from './user.entity';

export const USER_REPOSITORY = Symbol('IUserRepository');

export interface UserCreationData {
  email: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  accountCreationMethod: string;
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  createUser(data: UserCreationData): Promise<User>;
  updateProfile(id: string, updates: ProfileUpdateData): Promise<User>;
  updateLastLogin(userId: string): Promise<User>;
  linkGoogleAccount(userId: string, googleId: string): Promise<User>;
  isEmailTaken(email: string): Promise<boolean>;
  isUsernameTaken(username: string): Promise<boolean>;
  findUsersByUsernamePrefix(prefix: string): Promise<User[]>;
}
