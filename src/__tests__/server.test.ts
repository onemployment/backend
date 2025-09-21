import request from 'supertest';
import { createApp } from '../server';
import { AuthController } from '../api/auth/auth.controller';
import { UserController } from '../api/user/user.controller';
import { IAuthService } from '../api/auth/contracts/auth.service.contract';
import { IUserService } from '../api/user/contracts/user.service.contract';
import { User } from '@prisma/client';
import { JWTUtil } from '../api/auth/utils/jwt.util';
import { initializeJwtMiddleware } from '../middleware/jwt-auth.middleware';

describe('Server - createApp', () => {
  let app: ReturnType<typeof createApp>;
  let mockAuthService: jest.Mocked<IAuthService>;
  let mockUserService: jest.Mocked<IUserService>;
  let authController: AuthController;
  let userController: UserController;

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
    // Initialize JWT middleware for tests
    const jwtUtil = new JWTUtil();
    initializeJwtMiddleware(jwtUtil);

    mockAuthService = {
      loginUser: jest.fn(),
    };

    mockUserService = {
      registerUser: jest.fn(),
      getUserProfile: jest.fn(),
      updateUserProfile: jest.fn(),
      validateUsername: jest.fn(),
      validateEmail: jest.fn(),
      suggestUsernames: jest.fn(),
    };

    authController = new AuthController(mockAuthService);
    userController = new UserController(mockUserService);

    app = createApp({ authController, userController });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /health', () => {
    it('should return health check status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('POST /api/v1/user', () => {
    it('should handle registration request', async () => {
      const mockToken = 'mock-jwt-token';
      mockUserService.registerUser.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      const response = await request(app)
        .post('/api/v1/user')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body).toEqual({
        message: 'User created successfully',
        token: mockToken,
        user: {
          id: 'test-uuid-123',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          displayName: null,
          emailVerified: false,
          accountCreationMethod: 'local',
          createdAt: '2023-01-01T00:00:00.000Z',
          lastLoginAt: null,
        },
      });

      expect(mockUserService.registerUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    it('should handle invalid JSON body', async () => {
      const response = await request(app)
        .post('/api/v1/user')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Invalid request');
      expect(mockUserService.registerUser).not.toHaveBeenCalled();
    });

    it('should handle missing content-type header', async () => {
      const response = await request(app)
        .post('/api/v1/user')
        .set('Content-Type', 'text/plain')
        .send('{"email":"test@example.com","password":"Password123"}')
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Invalid request');
      expect(mockUserService.registerUser).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should handle login request', async () => {
      const mockToken = 'mock-jwt-token';
      mockAuthService.loginUser.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Login successful',
        token: mockToken,
        user: {
          id: 'test-uuid-123',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          displayName: null,
          emailVerified: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          lastLoginAt: null,
        },
      });

      expect(mockAuthService.loginUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  describe('Express middleware', () => {
    it('should parse JSON bodies correctly', async () => {
      const mockToken = 'mock-jwt-token';
      mockUserService.registerUser.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      await request(app)
        .post('/api/v1/user')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      expect(mockUserService.registerUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      });
    });
  });

  describe('Route not found', () => {
    it('should return 404 for unknown routes', async () => {
      await request(app).get('/unknown-route').expect(404);
    });

    it('should return 404 for unknown POST routes', async () => {
      await request(app).post('/unknown-route').expect(404);
    });
  });
});
