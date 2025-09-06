import { AuthRepository } from '../auth.repository';
import { PrismaClient, User } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('AuthRepository', () => {
  let authRepository: AuthRepository;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    authRepository = new AuthRepository(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const userData = {
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      };

      const mockCreatedUser: User = {
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await authRepository.createUser(
        userData.username,
        userData.passwordHash
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          passwordHash: 'hashedpassword123',
        },
      });

      expect(result).toEqual(mockCreatedUser);
    });

    it('should handle Prisma errors during user creation', async () => {
      const userData = {
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      };

      mockPrisma.user.create.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        authRepository.createUser(userData.username, userData.passwordHash)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByUsername', () => {
    it('should find user by username successfully', async () => {
      const mockFoundUser: User = {
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockFoundUser);

      const result = await authRepository.findByUsername('testuser');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          username: 'testuser',
        },
      });
      expect(result).toEqual(mockFoundUser);
    });

    it('should return null when username does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authRepository.findByUsername('nonexistent');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          username: 'nonexistent',
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const mockFoundUser: User = {
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockFoundUser);

      const result = await authRepository.findById('test-uuid-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'test-uuid-123',
        },
      });
      expect(result).toEqual(mockFoundUser);
    });

    it('should return null when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authRepository.findById('nonexistent-id');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'nonexistent-id',
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('userExists', () => {
    it('should return true when user exists', async () => {
      const mockFoundUser = { id: 'test-uuid-123' };
      mockPrisma.user.findUnique.mockResolvedValue(mockFoundUser as User);

      const result = await authRepository.userExists('testuser');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          username: 'testuser',
        },
        select: {
          id: true,
        },
      });
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authRepository.userExists('nonexistent');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          username: 'nonexistent',
        },
        select: {
          id: true,
        },
      });
      expect(result).toBe(false);
    });
  });
});
