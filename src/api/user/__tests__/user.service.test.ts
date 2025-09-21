import { UserService } from '../user.service';
import { IUserRepository } from '../contracts/user.repository.contract';
import { IPasswordStrategy } from '../../auth/strategies/contracts/password-strategy.contract';
import { JWTUtil } from '../../auth/utils/jwt.util';
import { UsernameSuggestionsUtil } from '../utils/username-suggestions.util';
import { User } from '@prisma/client';
import {
  ConflictError,
  BadRequestError,
  NotFoundError,
} from '../../../common/error/http-errors';

jest.mock('../../../common/logger/logger');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordStrategy: jest.Mocked<IPasswordStrategy>;
  let mockJwtUtil: jest.Mocked<JWTUtil>;
  let mockUsernameSuggestionsUtil: jest.Mocked<UsernameSuggestionsUtil>;

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
    mockUserRepository = {
      createUser: jest.fn(),
      findById: jest.fn(),
      updateProfile: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      isEmailTaken: jest.fn(),
      isUsernameTaken: jest.fn(),
      findUsersByUsernamePrefix: jest.fn(),
    };

    mockPasswordStrategy = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    mockJwtUtil = {
      generateToken: jest.fn(),
      validateToken: jest.fn(),
      extractPayload: jest.fn(),
    } as unknown as jest.Mocked<JWTUtil>;

    mockUsernameSuggestionsUtil = {
      generateSuggestions: jest.fn(),
      isUsernameAvailable: jest.fn(),
      getFirstAvailable: jest.fn(),
    } as unknown as jest.Mocked<UsernameSuggestionsUtil>;

    userService = new UserService(
      mockUserRepository,
      mockPasswordStrategy,
      mockJwtUtil,
      mockUsernameSuggestionsUtil
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'Password123',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register user successfully', async () => {
      const mockToken = 'mock-jwt-token';

      mockUserRepository.isEmailTaken.mockResolvedValue(false);
      mockUserRepository.isUsernameTaken.mockResolvedValue(false);
      mockPasswordStrategy.hash.mockResolvedValue('hashedpassword123');
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockJwtUtil.generateToken.mockResolvedValue(mockToken);

      const result = await userService.registerUser(validUserData);

      expect(mockUserRepository.isEmailTaken).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockPasswordStrategy.hash).toHaveBeenCalledWith('Password123');
      expect(mockUserRepository.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        firstName: 'Test',
        lastName: 'User',
        accountCreationMethod: 'local',
      });
      expect(mockJwtUtil.generateToken).toHaveBeenCalledWith(mockUser);

      expect(result).toEqual({
        user: mockUser,
        token: mockToken,
      });
    });

    it('should throw BadRequestError for reserved username', async () => {
      const reservedUserData = { ...validUserData, username: 'admin' };

      await expect(userService.registerUser(reservedUserData)).rejects.toThrow(
        BadRequestError
      );
      expect(mockUserRepository.isEmailTaken).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when email is taken', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(true);

      await expect(userService.registerUser(validUserData)).rejects.toThrow(
        ConflictError
      );
      expect(mockUserRepository.isEmailTaken).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(mockUserRepository.isUsernameTaken).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when username is taken', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(false);
      mockUserRepository.isUsernameTaken.mockResolvedValue(true);

      await expect(userService.registerUser(validUserData)).rejects.toThrow(
        ConflictError
      );
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockPasswordStrategy.hash).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserProfile('test-uuid-123');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-uuid-123');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        userService.getUserProfile('nonexistent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateUserProfile', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
      displayName: 'Updated Display Name',
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updateProfile.mockResolvedValue(updatedUser);

      const result = await userService.updateUserProfile(
        'test-uuid-123',
        updateData
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-uuid-123');
      expect(mockUserRepository.updateProfile).toHaveBeenCalledWith(
        'test-uuid-123',
        updateData
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        userService.updateUserProfile('nonexistent-id', updateData)
      ).rejects.toThrow(NotFoundError);
      expect(mockUserRepository.updateProfile).not.toHaveBeenCalled();
    });

    it('should sanitize displayName when null', async () => {
      const updateWithNull = { ...updateData, displayName: null };
      const updatedUser = { ...mockUser, displayName: null };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updateProfile.mockResolvedValue(updatedUser);

      await userService.updateUserProfile('test-uuid-123', updateWithNull);

      expect(mockUserRepository.updateProfile).toHaveBeenCalledWith(
        'test-uuid-123',
        { firstName: 'Updated', lastName: 'Name', displayName: null }
      );
    });
  });

  describe('validateUsername', () => {
    it('should return available true for valid available username', async () => {
      mockUsernameSuggestionsUtil.isUsernameAvailable.mockResolvedValue(true);

      const result = await userService.validateUsername('validuser');

      expect(
        mockUsernameSuggestionsUtil.isUsernameAvailable
      ).toHaveBeenCalledWith('validuser');
      expect(result).toEqual({ available: true });
    });

    it('should return available false with suggestions for taken username', async () => {
      const suggestions = ['validuser2', 'validuser3', 'validuser4'];

      mockUsernameSuggestionsUtil.isUsernameAvailable.mockResolvedValue(false);
      mockUsernameSuggestionsUtil.generateSuggestions.mockResolvedValue(
        suggestions
      );

      const result = await userService.validateUsername('validuser');

      expect(
        mockUsernameSuggestionsUtil.generateSuggestions
      ).toHaveBeenCalledWith('validuser');
      expect(result).toEqual({ available: false, suggestions });
    });

    it('should return available false with suggestions for invalid username', async () => {
      const suggestions = ['validuser2', 'validuser3'];

      mockUsernameSuggestionsUtil.generateSuggestions.mockResolvedValue(
        suggestions
      );

      const result = await userService.validateUsername(
        'invalid-username-too-long-way-over-39-chars'
      );

      expect(result).toEqual({ available: false, suggestions });
    });

    it('should return available false with suggestions for reserved username', async () => {
      const suggestions = ['admin2', 'admin3'];

      mockUsernameSuggestionsUtil.generateSuggestions.mockResolvedValue(
        suggestions
      );

      const result = await userService.validateUsername('admin');

      expect(result).toEqual({ available: false, suggestions });
    });
  });

  describe('validateEmail', () => {
    it('should return available true for valid available email', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(false);

      const result = await userService.validateEmail('available@example.com');

      expect(mockUserRepository.isEmailTaken).toHaveBeenCalledWith(
        'available@example.com'
      );
      expect(result).toEqual({ available: true });
    });

    it('should return available false for taken email', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(true);

      const result = await userService.validateEmail('taken@example.com');

      expect(result).toEqual({ available: false });
    });

    it('should return available false for invalid email format', async () => {
      const result = await userService.validateEmail('invalid-email');

      expect(result).toEqual({ available: false });
      expect(mockUserRepository.isEmailTaken).not.toHaveBeenCalled();
    });

    it('should handle case insensitive email validation', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(false);

      const result = await userService.validateEmail('TEST@EXAMPLE.COM');

      expect(mockUserRepository.isEmailTaken).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(result).toEqual({ available: true });
    });
  });

  describe('suggestUsernames', () => {
    it('should return username suggestions', async () => {
      const suggestions = [
        'baseuser2',
        'baseuser3',
        'baseuser4',
        'baseuser5',
        'baseuser6',
      ];

      mockUsernameSuggestionsUtil.generateSuggestions.mockResolvedValue(
        suggestions
      );

      const result = await userService.suggestUsernames('baseuser');

      expect(
        mockUsernameSuggestionsUtil.generateSuggestions
      ).toHaveBeenCalledWith('baseuser', 5);
      expect(result).toEqual(suggestions);
    });

    it('should return suggestions even for invalid base username', async () => {
      const suggestions = ['invalidbase2', 'invalidbase3'];

      mockUsernameSuggestionsUtil.generateSuggestions.mockResolvedValue(
        suggestions
      );

      const result = await userService.suggestUsernames('invalid-base');

      expect(result).toEqual(suggestions);
    });
  });
});
