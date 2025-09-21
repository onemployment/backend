import { UserRepository } from '../user.repository';
import {
  UserCreationData,
  ProfileUpdateData,
} from '../contracts/user.repository.contract';
import { PrismaClient, User } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('UserRepository', () => {
  let userRepository: UserRepository;
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
    userRepository = new UserRepository(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const userData: UserCreationData = {
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashedpassword123',
      firstName: 'Test',
      lastName: 'User',
      accountCreationMethod: 'local',
    };

    it('should create user successfully', async () => {
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await userRepository.createUser(userData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: 'hashedpassword123',
          firstName: 'Test',
          lastName: 'User',
          accountCreationMethod: 'local',
          lastPasswordChange: expect.any(Date),
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should set lastPasswordChange timestamp for new user', async () => {
      const mockDate = new Date('2023-06-01T10:00:00.000Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      mockPrisma.user.create.mockResolvedValue(mockUser);

      await userRepository.createUser(userData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: 'hashedpassword123',
          firstName: 'Test',
          lastName: 'User',
          accountCreationMethod: 'local',
          lastPasswordChange: mockDate,
        },
      });

      jest.useRealTimers();
    });

    it('should handle Prisma errors during creation', async () => {
      mockPrisma.user.create.mockRejectedValue(
        new Error('Unique constraint violation')
      );

      await expect(userRepository.createUser(userData)).rejects.toThrow(
        'Unique constraint violation'
      );
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userRepository.findById('test-uuid-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-uuid-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userRepository.findById('nonexistent-id');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id' },
      });
      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const updateData: ProfileUpdateData = {
      firstName: 'Updated',
      lastName: 'Name',
      displayName: 'Updated Display Name',
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await userRepository.updateProfile(
        'test-uuid-123',
        updateData
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'test-uuid-123' },
        data: updateData,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should handle null displayName in update', async () => {
      const updateWithNull = { displayName: null };
      const updatedUser = { ...mockUser, displayName: null };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await userRepository.updateProfile(
        'test-uuid-123',
        updateWithNull
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'test-uuid-123' },
        data: { displayName: null },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should handle Prisma errors during update', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('User not found'));

      await expect(
        userRepository.updateProfile('test-uuid-123', updateData)
      ).rejects.toThrow('User not found');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('test@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle case-insensitive email lookup', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('TEST@EXAMPLE.COM');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when email does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userRepository.findByEmail(
        'nonexistent@example.com'
      );

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await userRepository.findByUsername('testuser');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: {
            equals: 'testuser',
            mode: 'insensitive',
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle case-insensitive username lookup', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await userRepository.findByUsername('TESTUSER');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: {
            equals: 'TESTUSER',
            mode: 'insensitive',
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when username does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await userRepository.findByUsername('nonexistent');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: {
            equals: 'nonexistent',
            mode: 'insensitive',
          },
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('isEmailTaken', () => {
    it('should return true when email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userRepository.isEmailTaken('test@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userRepository.isEmailTaken('available@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'available@example.com' },
        select: { id: true },
      });
      expect(result).toBe(false);
    });

    it('should handle case-insensitive email check', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userRepository.isEmailTaken('TEST@EXAMPLE.COM');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
      expect(result).toBe(true);
    });
  });

  describe('isUsernameTaken', () => {
    it('should return true when username exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await userRepository.isUsernameTaken('testuser');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: {
            equals: 'testuser',
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it('should return false when username does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await userRepository.isUsernameTaken('available');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: {
            equals: 'available',
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      expect(result).toBe(false);
    });

    it('should handle case-insensitive username check', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await userRepository.isUsernameTaken('TESTUSER');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: {
            equals: 'TESTUSER',
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      expect(result).toBe(true);
    });
  });

  describe('findUsersByUsernamePrefix', () => {
    const mockUsers = [
      { ...mockUser, username: 'testuser' },
      { ...mockUser, id: 'test-uuid-456', username: 'testuser2' },
      { ...mockUser, id: 'test-uuid-789', username: 'testuser3' },
    ];

    it('should find users by username prefix successfully', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await userRepository.findUsersByUsernamePrefix('test');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          username: {
            startsWith: 'test',
            mode: 'insensitive',
          },
        },
        orderBy: {
          username: 'asc',
        },
      });
      expect(result).toEqual(mockUsers);
    });

    it('should handle case-insensitive prefix search', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await userRepository.findUsersByUsernamePrefix('TEST');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          username: {
            startsWith: 'TEST',
            mode: 'insensitive',
          },
        },
        orderBy: {
          username: 'asc',
        },
      });
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no matches found', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await userRepository.findUsersByUsernamePrefix('nomatch');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          username: {
            startsWith: 'nomatch',
            mode: 'insensitive',
          },
        },
        orderBy: {
          username: 'asc',
        },
      });
      expect(result).toEqual([]);
    });

    it('should return results ordered by username ascending', async () => {
      const unorderedUsers = [
        { ...mockUser, username: 'testuser3' },
        { ...mockUser, id: 'test-uuid-456', username: 'testuser1' },
        { ...mockUser, id: 'test-uuid-789', username: 'testuser2' },
      ];
      mockPrisma.user.findMany.mockResolvedValue(unorderedUsers);

      const result = await userRepository.findUsersByUsernamePrefix('test');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          username: {
            startsWith: 'test',
            mode: 'insensitive',
          },
        },
        orderBy: {
          username: 'asc',
        },
      });
      expect(result).toEqual(unorderedUsers);
    });
  });
});
