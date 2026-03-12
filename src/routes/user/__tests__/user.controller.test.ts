import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(async () => {
    mockUserService = {
      registerUser: jest.fn(),
      getUserProfile: jest.fn(),
      updateUserProfile: jest.fn(),
      validateUsername: jest.fn(),
      validateEmail: jest.fn(),
      suggestUsernames: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);
  });

  it('should register user and return 201 with token', async () => {
    mockUserService.registerUser.mockResolvedValue({ user: mockUser, token: 'token' });
    const result = await controller.register({
      email: 'test@example.com',
      password: 'Password123',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    });
    expect(result.message).toBe('User created successfully');
    expect(result.token).toBe('token');
  });

  it('should return current user profile', async () => {
    mockUserService.getUserProfile.mockResolvedValue(mockUser);
    const mockReq = { user: { sub: 'uuid-1' } };
    const result = await controller.getMe(mockReq as any);
    expect(result.user.id).toBe('uuid-1');
  });
});
