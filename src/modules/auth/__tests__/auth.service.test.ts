import { AuthService } from '../auth.service';
import { IUserRepository } from '../../../domain/user/user.repository.port';
import { User } from '../../../domain/user/user.entity';
import { BcryptStrategy } from '../strategies/bcrypt.strategy';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

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
  let mockBcryptStrategy: jest.Mocked<BcryptStrategy>;
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

    mockBcryptStrategy = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<BcryptStrategy>;

    mockJwtService = {
      sign: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    authService = new AuthService(
      mockUserRepository,
      mockBcryptStrategy,
      mockJwtService
    );
  });

  describe('loginUser', () => {
    const credentials = { email: 'test@example.com', password: 'password123' };

    it('should login successfully with valid credentials', async () => {
      const updatedUser = { ...mockUser, lastLoginAt: new Date() };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcryptStrategy.verify.mockResolvedValue(true);
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
      mockBcryptStrategy.verify.mockResolvedValue(false);
      await expect(authService.loginUser(credentials)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
