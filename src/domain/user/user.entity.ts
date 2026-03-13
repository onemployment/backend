// src/domain/user/user.entity.ts

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string | null;
  firstName: string;
  lastName: string;
  displayName: string | null;
  googleId: string | null;
  emailVerified: boolean;
  isActive: boolean;
  accountCreationMethod: string;
  lastPasswordChange: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}
