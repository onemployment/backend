import { Request, Response } from 'express';
import { AuthController } from '../auth.controller';
import { IAuthService } from '../contracts/auth.service.contract';
import { User } from '@prisma/client';

jest.mock('../../../common/logger/logger');

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockAuthService: jest.Mocked<IAuthService>;

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
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    mockAuthService = {
      loginUser: jest.fn(),
    };

    authController = new AuthController(mockAuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loginUser', () => {
    it('should successfully login a user with valid credentials', async () => {
      const mockToken = 'mock-jwt-token';
      mockRequest.body = { email: 'test@example.com', password: 'testpass' };
      mockAuthService.loginUser.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      await authController.loginUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockAuthService.loginUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'testpass',
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
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
    });
  });

  describe('logoutUser', () => {
    it('should successfully logout and return success message', async () => {
      await authController.logoutUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Logout successful',
      });
    });
  });

  describe('transformUserToAPI', () => {
    it('should properly transform User domain model to API response format', async () => {
      const mockToken = 'mock-jwt-token';
      mockRequest.body = { email: 'test@example.com', password: 'testpass' };
      mockAuthService.loginUser.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      await authController.loginUser(
        mockRequest as Request,
        mockResponse as Response
      );

      const expectedUserResponse = {
        id: 'test-uuid-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        displayName: null,
        emailVerified: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        lastLoginAt: null,
      };

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expectedUserResponse,
        })
      );
    });
  });
});
