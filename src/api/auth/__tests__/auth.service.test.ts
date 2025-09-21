import { AuthService } from '../auth.service';
import { IAuthRepository } from '../contracts/auth.repository.contract';
import { IPasswordStrategy } from '../strategies/contracts/password-strategy.contract';
import { JWTUtil } from '../utils/jwt.util';
import { User } from '@prisma/client';
import { UnauthorizedError } from '../../../common/error/http-errors';

jest.mock('../../../common/logger/logger');

describe('AuthService', () => {
  let authService: AuthService;
  let mockAuthRepository: jest.Mocked<IAuthRepository>;
  let mockPasswordStrategy: jest.Mocked<IPasswordStrategy>;
  let mockJwtUtil: jest.Mocked<JWTUtil>;

  beforeEach(() => {
    mockAuthRepository = {
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      updateLastLogin: jest.fn(),
      linkGoogleAccount: jest.fn(),
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

    authService = new AuthService(
      mockAuthRepository,
      mockPasswordStrategy,
      mockJwtUtil
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

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

  describe('loginUser', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully with valid credentials', async () => {
      const mockToken = 'mock-jwt-token';
      const updatedUser = { ...mockUser, lastLoginAt: new Date() };

      mockAuthRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordStrategy.verify.mockResolvedValue(true);
      mockAuthRepository.updateLastLogin.mockResolvedValue(updatedUser);
      mockJwtUtil.generateToken.mockResolvedValue(mockToken);

      const result = await authService.loginUser(validCredentials);

      expect(mockAuthRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(
        'password123',
        'hashedpassword123'
      );
      expect(mockAuthRepository.updateLastLogin).toHaveBeenCalledWith(
        'test-uuid-123'
      );
      expect(mockJwtUtil.generateToken).toHaveBeenCalledWith(updatedUser);

      expect(result).toEqual({
        user: updatedUser,
        token: mockToken,
      });
      expect(result.user.lastLoginAt).toBeTruthy();
    });

    it('should throw UnauthorizedError when user does not exist', async () => {
      mockAuthRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.loginUser(validCredentials)).rejects.toThrow(
        UnauthorizedError
      );
      expect(mockAuthRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(mockPasswordStrategy.verify).not.toHaveBeenCalled();
      expect(mockAuthRepository.updateLastLogin).not.toHaveBeenCalled();
      expect(mockJwtUtil.generateToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when user has no password hash (OAuth-only)', async () => {
      const oauthUser = { ...mockUser, passwordHash: null };
      mockAuthRepository.findByEmail.mockResolvedValue(oauthUser);

      await expect(authService.loginUser(validCredentials)).rejects.toThrow(
        UnauthorizedError
      );
      expect(mockAuthRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(mockPasswordStrategy.verify).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when password is invalid', async () => {
      mockAuthRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordStrategy.verify.mockResolvedValue(false);

      await expect(authService.loginUser(validCredentials)).rejects.toThrow(
        UnauthorizedError
      );
      expect(mockAuthRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(
        'password123',
        'hashedpassword123'
      );
      expect(mockAuthRepository.updateLastLogin).not.toHaveBeenCalled();
      expect(mockJwtUtil.generateToken).not.toHaveBeenCalled();
    });
  });

  describe('dependency injection', () => {
    it('should be constructed with required dependencies', () => {
      expect(authService).toBeInstanceOf(AuthService);
      expect(mockPasswordStrategy.hash).toBeDefined();
      expect(mockPasswordStrategy.verify).toBeDefined();
      expect(mockJwtUtil.generateToken).toBeDefined();
      expect(mockJwtUtil.validateToken).toBeDefined();
    });
  });
});
