import { PrismaUserRepository } from '../user.repository';
import { PrismaService } from '../../../../database/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { User as PrismaUser } from '@prisma/client';

const prismaUser: PrismaUser = {
  id: 'uuid-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hash',
  firstName: 'Test',
  lastName: 'User',
  displayName: null,
  googleId: null,
  emailVerified: false,
  isActive: true,
  accountCreationMethod: 'local',
  lastPasswordChange: new Date('2023-01-01'),
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  lastLoginAt: null,
};

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prisma: ReturnType<typeof mockDeep<PrismaService>>;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    repository = new PrismaUserRepository(prisma as unknown as PrismaService);
  });

  it('findByEmail lowercases the email and returns domain User', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUser);
    const result = await repository.findByEmail('TEST@EXAMPLE.COM');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(result?.email).toBe('test@example.com');
  });

  it('findByEmail returns null when not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await repository.findByEmail('nobody@example.com');
    expect(result).toBeNull();
  });

  it('findById returns domain User', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUser);
    const result = await repository.findById('uuid-1');
    expect(result?.id).toBe('uuid-1');
  });

  it('findById returns null when not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await repository.findById('bad-id');
    expect(result).toBeNull();
  });

  it('updateLastLogin returns domain User', async () => {
    const updated = { ...prismaUser, lastLoginAt: new Date() };
    prisma.user.update.mockResolvedValue(updated);
    const result = await repository.updateLastLogin('uuid-1');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'uuid-1' },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(result.id).toBe('uuid-1');
  });

  it('isEmailTaken returns true when user exists', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUser);
    expect(await repository.isEmailTaken('test@example.com')).toBe(true);
  });

  it('isEmailTaken returns false when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await repository.isEmailTaken('nobody@example.com')).toBe(false);
  });
});
