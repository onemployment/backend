import { PrismaClient, User } from '@prisma/client';
import {
  IUserRepository,
  UserCreationData,
  ProfileUpdateData,
} from './contracts/user.repository.contract';

export class UserRepository extends IUserRepository {
  constructor(private readonly prisma: PrismaClient) {
    super();
  }

  public async createUser(userData: UserCreationData): Promise<User> {
    return await this.prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        accountCreationMethod: userData.accountCreationMethod,
        lastPasswordChange: new Date(), // Set for local accounts
      },
    });
  }

  public async findById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id },
    });
  }

  public async updateProfile(
    id: string,
    updates: ProfileUpdateData
  ): Promise<User> {
    return await this.prisma.user.update({
      where: { id },
      data: updates,
    });
  }

  public async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  public async findByUsername(username: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });
  }

  public async isEmailTaken(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    return user !== null;
  }

  public async isUsernameTaken(username: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });
    return user !== null;
  }

  public async findUsersByUsernamePrefix(prefix: string): Promise<User[]> {
    return await this.prisma.user.findMany({
      where: {
        username: {
          startsWith: prefix,
          mode: 'insensitive',
        },
      },
      orderBy: {
        username: 'asc',
      },
    });
  }
}
