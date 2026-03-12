import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
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

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    mockAuthService = {
      loginUser: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should return login response with token and user', async () => {
    mockAuthService.loginUser.mockResolvedValue({ user: mockUser, token: 'jwt-token' });

    const result = await controller.login({ email: 'test@example.com', password: 'pass' });

    expect(result.message).toBe('Login successful');
    expect(result.token).toBe('jwt-token');
    expect(result.user.id).toBe('uuid-1');
    expect(result.user.createdAt).toBe(mockUser.createdAt.toISOString());
  });

  it('should return logout success message', () => {
    const result = controller.logout();
    expect(result).toEqual({ message: 'Logout successful' });
  });
});
