import { User } from '@prisma/client';

export abstract class IAuthRepository {
  // Returns domain models, not API response shapes
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByGoogleId(googleId: string): Promise<User | null>;

  // Activity tracking (returns updated user)
  abstract updateLastLogin(userId: string): Promise<User>;

  // Account linking (returns domain model)
  abstract linkGoogleAccount(userId: string, googleId: string): Promise<User>;
}
