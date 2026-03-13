import { UserRepository } from '../user.repository';
import { PrismaService } from '../../../database/prisma.service';
import { mockDeep } from 'jest-mock-extended';

describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: ReturnType<typeof mockDeep<PrismaService>>;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    repository = new UserRepository(prisma as unknown as PrismaService);
  });

  it('should find user by id', async () => {
    const mockUser = { id: '1' } as unknown as import('@prisma/client').User;
    prisma.user.findUnique.mockResolvedValue(mockUser);
    const result = await repository.findById('1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(result).toEqual(mockUser);
  });

  it('should check if email is taken', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: '1' } as unknown as import('@prisma/client').User);
    const result = await repository.isEmailTaken('test@example.com');
    expect(result).toBe(true);
  });

  it('should return false when email is not taken', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await repository.isEmailTaken('free@example.com');
    expect(result).toBe(false);
  });
});
