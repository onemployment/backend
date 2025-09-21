import { Request, Response } from 'express';
import { UserController } from '../user.controller';
import { IUserService } from '../contracts/user.service.contract';
import { User } from '@prisma/client';

jest.mock('../../../common/logger/logger');

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockUserService: jest.Mocked<IUserService>;

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

    mockUserService = {
      registerUser: jest.fn(),
      getUserProfile: jest.fn(),
      updateUserProfile: jest.fn(),
      validateUsername: jest.fn(),
      validateEmail: jest.fn(),
      suggestUsernames: jest.fn(),
    };

    userController = new UserController(mockUserService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerUser', () => {
    it('should successfully register a user', async () => {
      const mockToken = 'mock-jwt-token';
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUserService.registerUser.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      await userController.registerUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUserService.registerUser).toHaveBeenCalledWith(
        mockRequest.body
      );
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
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
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user profile', async () => {
      mockRequest.user = {
        sub: 'test-uuid-123',
        email: 'test@example.com',
        username: 'testuser',
        iss: 'onemployment-auth',
        aud: 'onemployment-api',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
      };
      mockUserService.getUserProfile.mockResolvedValue(mockUser);

      await userController.getCurrentUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUserService.getUserProfile).toHaveBeenCalledWith(
        'test-uuid-123'
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
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
    });
  });

  describe('updateCurrentUser', () => {
    it('should update current user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        displayName: 'Updated Display',
      };
      const updatedUser = { ...mockUser, ...updateData };

      mockRequest.user = {
        sub: 'test-uuid-123',
        email: 'test@example.com',
        username: 'testuser',
        iss: 'onemployment-auth',
        aud: 'onemployment-api',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
      };
      mockRequest.body = updateData;
      mockUserService.updateUserProfile.mockResolvedValue(updatedUser);

      await userController.updateCurrentUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith(
        'test-uuid-123',
        updateData
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Profile updated successfully',
        user: {
          id: 'test-uuid-123',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Updated',
          lastName: 'Name',
          displayName: 'Updated Display',
          emailVerified: false,
          accountCreationMethod: 'local',
          createdAt: '2023-01-01T00:00:00.000Z',
          lastLoginAt: null,
        },
      });
    });
  });

  describe('validateUsername', () => {
    it('should return username availability (available)', async () => {
      mockRequest.query = { username: 'availableuser' };
      mockUserService.validateUsername.mockResolvedValue({
        available: true,
      });

      await userController.validateUsername(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUserService.validateUsername).toHaveBeenCalledWith(
        'availableuser'
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        available: true,
        message: 'Username is available',
      });
    });

    it('should return username availability (taken) with suggestions', async () => {
      const suggestions = ['takenuser2', 'takenuser3'];
      mockRequest.query = { username: 'takenuser' };
      mockUserService.validateUsername.mockResolvedValue({
        available: false,
        suggestions,
      });

      await userController.validateUsername(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUserService.validateUsername).toHaveBeenCalledWith(
        'takenuser'
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        available: false,
        message: 'Username is taken',
        suggestions,
      });
    });

    it('should return error when username parameter is missing', async () => {
      mockRequest.query = {};

      await userController.validateUsername(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUserService.validateUsername).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        available: false,
        message: 'Username parameter is required',
      });
    });
  });

  describe('validateEmail', () => {
    it('should return email availability (available)', async () => {
      mockRequest.query = { email: 'available@example.com' };
      mockUserService.validateEmail.mockResolvedValue({
        available: true,
      });

      await userController.validateEmail(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUserService.validateEmail).toHaveBeenCalledWith(
        'available@example.com'
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        available: true,
        message: 'Email is available',
      });
    });

    it('should return email availability (taken)', async () => {
      mockRequest.query = { email: 'taken@example.com' };
      mockUserService.validateEmail.mockResolvedValue({
        available: false,
      });

      await userController.validateEmail(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUserService.validateEmail).toHaveBeenCalledWith(
        'taken@example.com'
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        available: false,
        message: 'Email already registered. Please sign in instead',
      });
    });

    it('should return error when email parameter is missing', async () => {
      mockRequest.query = {};

      await userController.validateEmail(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUserService.validateEmail).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        available: false,
        message: 'Email parameter is required',
      });
    });
  });

  describe('suggestUsernames', () => {
    it('should return username suggestions', async () => {
      const suggestions = ['baseuser2', 'baseuser3', 'baseuser4'];
      mockRequest.query = { username: 'baseuser' };
      mockUserService.suggestUsernames.mockResolvedValue(suggestions);

      await userController.suggestUsernames(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUserService.suggestUsernames).toHaveBeenCalledWith('baseuser');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ suggestions });
    });

    it('should return error when username parameter is missing', async () => {
      mockRequest.query = {};

      await userController.suggestUsernames(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUserService.suggestUsernames).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        suggestions: [],
        message: 'Username parameter is required',
      });
    });
  });

  describe('transformUserToAPI', () => {
    it('should properly transform User domain model to API response format', async () => {
      const mockToken = 'mock-jwt-token';
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      // Test with date transformation
      const userWithLastLogin = {
        ...mockUser,
        lastLoginAt: new Date('2023-06-01T10:00:00.000Z'),
      };

      mockUserService.registerUser.mockResolvedValue({
        user: userWithLastLogin,
        token: mockToken,
      });

      await userController.registerUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
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
            lastLoginAt: '2023-06-01T10:00:00.000Z',
          },
        })
      );
    });
  });
});
