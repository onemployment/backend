import { User } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

export interface IAuthRepository {
  createUser(username: string, passwordHash: string): Promise<User>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  userExists(username: string): Promise<boolean>;
}

export class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async createUser(
    username: string,
    passwordHash: string
  ): Promise<User> {
    return await this.prisma.user.create({
      data: {
        username,
        passwordHash,
      },
    });
  }

  public async findByUsername(username: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        username,
      },
    });
  }

  public async findById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  public async userExists(username: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
      },
    });

    return user !== null;
  }
}
