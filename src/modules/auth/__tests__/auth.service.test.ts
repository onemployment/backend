import { mock } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { IUserRepository } from '../../../domain/user/user.repository.port';
import { IPasswordHashStrategy } from '../ports/password-hash-strategy.port';
import { User } from '../../../domain/user/user.entity';

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

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordStrategy: jest.Mocked<IPasswordHashStrategy>;
  let mockJwtService: jest.Mocked<JwtService>;

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

    authService = new AuthService(
      mockUserRepository,
      mockPasswordStrategy,
      mockJwtService
    );
  });

  describe('loginUser', () => {
    const credentials = { email: 'test@example.com', password: 'password123' };

    it('should login successfully with valid credentials', async () => {
      const updatedUser = { ...mockUser, lastLoginAt: new Date() };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordStrategy.verify.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue(updatedUser);
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await authService.loginUser(credentials);

      expect(result.token).toBe('mock-token');
      expect(result.user).toEqual(updatedUser);
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(
        mockUser.id
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      await expect(authService.loginUser(credentials)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when passwordHash is null', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });
      await expect(authService.loginUser(credentials)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordStrategy.verify.mockResolvedValue(false);
      await expect(authService.loginUser(credentials)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
