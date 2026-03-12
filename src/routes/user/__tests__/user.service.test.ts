import { UserService } from '../user.service';
import { UserRepository } from '../user.repository';
import { BcryptStrategy } from '../../auth/strategies/bcrypt.strategy';
import { JwtService } from '@nestjs/jwt';
import { UsernameSuggestionsUtil } from '../utils/username-suggestions.util';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';

const mockUser: User = {
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

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockBcryptStrategy: jest.Mocked<BcryptStrategy>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockSuggestionsUtil: jest.Mocked<UsernameSuggestionsUtil>;

  beforeEach(() => {
    mockUserRepository = {
      isEmailTaken: jest.fn(),
      isUsernameTaken: jest.fn(),
      createUser: jest.fn(),
      findById: jest.fn(),
      updateProfile: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findUsersByUsernamePrefix: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    mockBcryptStrategy = { hash: jest.fn(), verify: jest.fn() } as unknown as jest.Mocked<BcryptStrategy>;
    mockJwtService = { sign: jest.fn() } as unknown as jest.Mocked<JwtService>;
    mockSuggestionsUtil = {
      generateSuggestions: jest.fn(),
      isUsernameAvailable: jest.fn(),
    } as unknown as jest.Mocked<UsernameSuggestionsUtil>;

    userService = new UserService(
      mockUserRepository,
      mockBcryptStrategy,
      mockJwtService,
      mockSuggestionsUtil
    );
  });

  describe('registerUser', () => {
    const validData = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'Password123',
      firstName: 'New',
      lastName: 'User',
    };

    it('should register user and return user + token', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(false);
      mockUserRepository.isUsernameTaken.mockResolvedValue(false);
      mockBcryptStrategy.hash.mockResolvedValue('hashed');
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');

      const result = await userService.registerUser(validData);
      expect(result.token).toBe('token');
      expect(result.user).toEqual(mockUser);
    });

    it('should throw ConflictException when email is taken', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(true);
      await expect(userService.registerUser(validData)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when username is taken', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(false);
      mockUserRepository.isUsernameTaken.mockResolvedValue(true);
      await expect(userService.registerUser(validData)).rejects.toThrow(ConflictException);
    });
  });

  describe('getUserProfile', () => {
    it('should return user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      const result = await userService.getUserProfile('uuid-1');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(userService.getUserProfile('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
