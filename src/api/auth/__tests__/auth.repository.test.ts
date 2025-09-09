import { AuthRepository } from '../auth.repository';
import { PrismaClient, User } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('AuthRepository', () => {
  let authRepository: AuthRepository;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockUser: User = {
    id: 'test-uuid-123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashedpassword123',
    firstName: 'Test',
    lastName: 'User',
    displayName: null,
    googleId: null,
    emailVerified: false,
    isActive: true,
    accountCreationMethod: 'local',
    lastPasswordChange: new Date('2023-01-01T00:00:00.000Z'),
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    lastLoginAt: null,
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    authRepository = new AuthRepository(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authRepository.findByEmail('test@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should find user by email (case insensitive)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authRepository.findByEmail('TEST@EXAMPLE.COM');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when email does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authRepository.findByEmail(
        'nonexistent@example.com'
      );

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
      expect(result).toBeNull();
    });
  });

  describe('findByGoogleId', () => {
    it('should find user by Google ID successfully', async () => {
      const userWithGoogleId = { ...mockUser, googleId: 'google-123' };
      mockPrisma.user.findUnique.mockResolvedValue(userWithGoogleId);

      const result = await authRepository.findByGoogleId('google-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: 'google-123' },
      });
      expect(result).toEqual(userWithGoogleId);
    });

    it('should return null when Google ID does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authRepository.findByGoogleId(
        'nonexistent-google-id'
      );

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: 'nonexistent-google-id' },
      });
      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp and return updated user', async () => {
      const mockDate = new Date('2023-06-01T10:00:00.000Z');
      const updatedUser = { ...mockUser, lastLoginAt: mockDate };

      jest.useFakeTimers().setSystemTime(mockDate);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await authRepository.updateLastLogin('test-uuid-123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'test-uuid-123' },
        data: { lastLoginAt: mockDate },
      });
      expect(result).toEqual(updatedUser);
      expect(result.lastLoginAt).toEqual(mockDate);

      jest.useRealTimers();
    });

    it('should handle Prisma errors during update', async () => {
      mockPrisma.user.update.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        authRepository.updateLastLogin('test-uuid-123')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('linkGoogleAccount', () => {
    it('should link Google account to existing user', async () => {
      const linkedUser = { ...mockUser, googleId: 'google-456' };
      mockPrisma.user.update.mockResolvedValue(linkedUser);

      const result = await authRepository.linkGoogleAccount(
        'test-uuid-123',
        'google-456'
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'test-uuid-123' },
        data: { googleId: 'google-456' },
      });
      expect(result).toEqual(linkedUser);
    });

    it('should handle Prisma errors during linking', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('User not found'));

      await expect(
        authRepository.linkGoogleAccount('test-uuid-123', 'google-456')
      ).rejects.toThrow('User not found');
    });
  });
});
