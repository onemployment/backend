import { AuthService } from '../auth.service';
import { AuthRepository } from '../auth.repository';
import { BcryptStrategy } from '../strategies/bcrypt.strategy';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';

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
  let mockAuthRepository: jest.Mocked<AuthRepository>;
  let mockBcryptStrategy: jest.Mocked<BcryptStrategy>;
  let mockJwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    mockAuthRepository = {
      findByEmail: jest.fn(),
      updateLastLogin: jest.fn(),
      findByGoogleId: jest.fn(),
      linkGoogleAccount: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    mockBcryptStrategy = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<BcryptStrategy>;

    mockJwtService = {
      sign: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    authService = new AuthService(mockAuthRepository, mockBcryptStrategy, mockJwtService);
  });

  describe('loginUser', () => {
    const credentials = { email: 'test@example.com', password: 'password123' };

    it('should login successfully with valid credentials', async () => {
      const updatedUser = { ...mockUser, lastLoginAt: new Date() };
      mockAuthRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcryptStrategy.verify.mockResolvedValue(true);
      mockAuthRepository.updateLastLogin.mockResolvedValue(updatedUser);
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await authService.loginUser(credentials);

      expect(result.token).toBe('mock-token');
      expect(result.user).toEqual(updatedUser);
      expect(mockAuthRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockAuthRepository.findByEmail.mockResolvedValue(null);
      await expect(authService.loginUser(credentials)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when passwordHash is null', async () => {
      mockAuthRepository.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: null });
      await expect(authService.loginUser(credentials)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockAuthRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcryptStrategy.verify.mockResolvedValue(false);
      await expect(authService.loginUser(credentials)).rejects.toThrow(UnauthorizedException);
    });
  });
});
