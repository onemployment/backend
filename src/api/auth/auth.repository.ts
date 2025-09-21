import { User } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { IAuthRepository } from './contracts/auth.repository.contract';

export class AuthRepository extends IAuthRepository {
  constructor(private readonly prisma: PrismaClient) {
    super();
  }

  public async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  public async findByGoogleId(googleId: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  public async updateLastLogin(userId: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  public async linkGoogleAccount(
    userId: string,
    googleId: string
  ): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
  }

  // All methods return domain models or primitives, no API shapes
}
