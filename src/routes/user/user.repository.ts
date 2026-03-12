import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

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

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: UserCreationData): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        accountCreationMethod: data.accountCreationMethod,
        lastPasswordChange: new Date(),
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
  }

  async updateProfile(id: string, updates: ProfileUpdateData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: updates });
  }

  async isEmailTaken(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    return user !== null;
  }

  async isUsernameTaken(username: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true },
    });
    return user !== null;
  }

  async findUsersByUsernamePrefix(prefix: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { username: { startsWith: prefix, mode: 'insensitive' } },
      orderBy: { username: 'asc' },
    });
  }
}
