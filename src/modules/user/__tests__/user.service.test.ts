import { mock } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from '../user.service';
import { IUserRepository } from '../../../domain/user/user.repository.port';
import { IPasswordStrategy } from '../../../domain/auth/password-strategy.port';
import { User } from '../../../domain/user/user.entity';
import { UsernameSuggestionsUtil } from '../utils/username-suggestions.util';

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
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordStrategy: jest.Mocked<IPasswordStrategy>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockSuggestionsUtil: jest.Mocked<UsernameSuggestionsUtil>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByGoogleId: jest.fn(),
      createUser: jest.fn(),
      updateProfile: jest.fn(),
      updateLastLogin: jest.fn(),
      linkGoogleAccount: jest.fn(),
      isEmailTaken: jest.fn(),
      isUsernameTaken: jest.fn(),
      findUsersByUsernamePrefix: jest.fn(),
    };

    mockPasswordStrategy = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    mockJwtService = mock<JwtService>();
    mockSuggestionsUtil = mock<UsernameSuggestionsUtil>();

    userService = new UserService(
      mockUserRepository,
      mockPasswordStrategy,
      mockJwtService,
      mockSuggestionsUtil,
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
      mockPasswordStrategy.hash.mockResolvedValue('hashed');
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
