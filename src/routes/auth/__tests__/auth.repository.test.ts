import { AuthRepository } from '../auth.repository';
import { PrismaService } from '../../../database/prisma.service';
import { mockDeep } from 'jest-mock-extended';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prisma: ReturnType<typeof mockDeep<PrismaService>>;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    repository = new AuthRepository(prisma as unknown as PrismaService);
  });

  it('should find user by email (lowercased)', async () => {
    const mockUser = { id: '1', email: 'test@example.com' } as any;
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await repository.findByEmail('TEST@EXAMPLE.COM');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(result).toEqual(mockUser);
  });

  it('should update lastLoginAt', async () => {
    const updatedUser = { id: '1', lastLoginAt: new Date() } as any;
    prisma.user.update.mockResolvedValue(updatedUser);

    const result = await repository.updateLastLogin('1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(result).toEqual(updatedUser);
  });
});
