import { User as PrismaUser } from '@prisma/client';
import { User } from '../../../../domain/user/user.entity';

export class UserMapper {
  static toDomain(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      username: prismaUser.username,
      passwordHash: prismaUser.passwordHash,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      displayName: prismaUser.displayName,
      googleId: prismaUser.googleId,
      emailVerified: prismaUser.emailVerified,
      isActive: prismaUser.isActive,
      accountCreationMethod: prismaUser.accountCreationMethod,
      lastPasswordChange: prismaUser.lastPasswordChange,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      lastLoginAt: prismaUser.lastLoginAt,
    };
  }
}
