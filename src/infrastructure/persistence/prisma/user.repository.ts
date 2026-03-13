import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  IUserRepository,
  UserCreationData,
  ProfileUpdateData,
} from '../../../domain/user/user.repository.port';
import { User } from '../../../domain/user/user.entity';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { googleId } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async createUser(data: UserCreationData): Promise<User> {
    const user = await this.prisma.user.create({
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
    return UserMapper.toDomain(user);
  }

  async updateProfile(id: string, updates: ProfileUpdateData): Promise<User> {
    const user = await this.prisma.user.update({ where: { id }, data: updates });
    return UserMapper.toDomain(user);
  }

  async updateLastLogin(userId: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    return UserMapper.toDomain(user);
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
    return UserMapper.toDomain(user);
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
    const users = await this.prisma.user.findMany({
      where: { username: { startsWith: prefix, mode: 'insensitive' } },
      orderBy: { username: 'asc' },
    });
    return users.map(UserMapper.toDomain);
  }
}
