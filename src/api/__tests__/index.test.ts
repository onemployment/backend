import { Router } from 'express';
import { createApiRouter, AppDependencies } from '../index';
import { createAuthRouter } from '../auth';
import { createUserRouter } from '../user';
import { AuthController } from '../auth/auth.controller';
import { UserController } from '../user/user.controller';

jest.mock('../auth', () => ({
  createAuthRouter: jest.fn(),
}));

jest.mock('../user', () => ({
  createUserRouter: jest.fn(),
}));

jest.mock('express', () => ({
  Router: jest.fn(),
}));

describe('API Index Router', () => {
  let mockAuthController: jest.Mocked<AuthController>;
  let mockUserController: jest.Mocked<UserController>;
  let mockApiRouter: jest.Mocked<Router>;
  let mockAuthRouter: jest.Mocked<Router>;
  let mockUserRouter: jest.Mocked<Router>;
  let dependencies: AppDependencies;

  const mockCreateAuthRouter = createAuthRouter as jest.MockedFunction<
    typeof createAuthRouter
  >;
  const mockCreateUserRouter = createUserRouter as jest.MockedFunction<
    typeof createUserRouter
  >;
  const mockRouterConstructor = Router as jest.MockedFunction<typeof Router>;

  beforeEach(() => {
    // Mock controllers
    mockAuthController = {
      loginUser: jest.fn(),
      logoutUser: jest.fn(),
    } as unknown as jest.Mocked<AuthController>;

    mockUserController = {
      registerUser: jest.fn(),
      getCurrentUser: jest.fn(),
      updateCurrentUser: jest.fn(),
      validateUsername: jest.fn(),
      validateEmail: jest.fn(),
      suggestUsernames: jest.fn(),
    } as unknown as jest.Mocked<UserController>;

    // Mock routers
    mockApiRouter = {
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Router>;

    mockAuthRouter = {
      use: jest.fn(),
      post: jest.fn(),
    } as unknown as jest.Mocked<Router>;

    mockUserRouter = {
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
    } as unknown as jest.Mocked<Router>;

    // Setup dependencies
    dependencies = {
      authController: mockAuthController,
      userController: mockUserController,
    };

    // Setup mocks
    mockRouterConstructor.mockReturnValue(mockApiRouter);
    mockCreateAuthRouter.mockReturnValue(mockAuthRouter);
    mockCreateUserRouter.mockReturnValue(mockUserRouter);

    jest.clearAllMocks();
  });

  describe('createApiRouter', () => {
    it('should create and return Express router', () => {
      const result = createApiRouter(dependencies);

      expect(Router).toHaveBeenCalledWith();
      expect(result).toBe(mockApiRouter);
    });

    it('should mount auth router with correct path and dependencies', () => {
      createApiRouter(dependencies);

      expect(mockCreateAuthRouter).toHaveBeenCalledWith({
        authController: mockAuthController,
      });

      expect(mockApiRouter.use).toHaveBeenCalledWith('/auth', mockAuthRouter);
    });

    it('should mount user router with correct path and dependencies', () => {
      createApiRouter(dependencies);

      expect(mockCreateUserRouter).toHaveBeenCalledWith({
        userController: mockUserController,
      });

      expect(mockApiRouter.use).toHaveBeenCalledWith('/user', mockUserRouter);
    });

    it('should mount both routers in correct order', () => {
      createApiRouter(dependencies);

      expect(mockApiRouter.use).toHaveBeenCalledTimes(2);
      expect(mockApiRouter.use).toHaveBeenNthCalledWith(
        1,
        '/auth',
        mockAuthRouter
      );
      expect(mockApiRouter.use).toHaveBeenNthCalledWith(
        2,
        '/user',
        mockUserRouter
      );
    });

    it('should handle missing dependencies gracefully', () => {
      const incompleteDependencies = {
        authController: mockAuthController,
        userController: undefined as unknown as UserController,
      };

      expect(() => createApiRouter(incompleteDependencies)).not.toThrow();

      expect(mockCreateUserRouter).toHaveBeenCalledWith({
        userController: undefined,
      });
    });

    it('should create new router instance each time', () => {
      const result1 = createApiRouter(dependencies);
      const result2 = createApiRouter(dependencies);

      expect(Router).toHaveBeenCalledTimes(2);
      expect(result1).toBe(mockApiRouter);
      expect(result2).toBe(mockApiRouter); // Both return same mock, but Router called twice
    });

    it('should pass controllers by reference, not copy', () => {
      createApiRouter(dependencies);

      const authRouterCall = mockCreateAuthRouter.mock.calls[0][0];
      const userRouterCall = mockCreateUserRouter.mock.calls[0][0];

      expect(authRouterCall.authController).toBe(mockAuthController);
      expect(userRouterCall.userController).toBe(mockUserController);
    });

    it('should not add any middleware directly to main router', () => {
      createApiRouter(dependencies);

      // Only .use() calls should be for mounting sub-routers
      const useCalls = mockApiRouter.use.mock.calls;
      expect(useCalls).toHaveLength(2);
      expect(useCalls[0]).toEqual(['/auth', mockAuthRouter]);
      expect(useCalls[1]).toEqual(['/user', mockUserRouter]);

      // No other router methods should be called on main router
      expect(mockApiRouter.get).not.toHaveBeenCalled();
      expect(mockApiRouter.post).not.toHaveBeenCalled();
      expect(mockApiRouter.put).not.toHaveBeenCalled();
      expect(mockApiRouter.delete).not.toHaveBeenCalled();
    });

    it('should use consistent path naming convention', () => {
      createApiRouter(dependencies);

      const useCalls = mockApiRouter.use.mock.calls;

      // Paths should be simple, lowercase, and match domain names
      expect(useCalls[0][0]).toBe('/auth');
      expect(useCalls[1][0]).toBe('/user');

      // Paths should not have trailing slashes
      expect(useCalls[0][0]).not.toBe('/auth/');
      expect(useCalls[1][0]).not.toBe('/user/');
    });
  });

  // Removed over-test: runtime checks for TypeScript interface correctness

  describe('router creation behavior', () => {
    it('should call router factories with isolated dependency objects', () => {
      createApiRouter(dependencies);

      const authDeps = mockCreateAuthRouter.mock.calls[0][0];
      const userDeps = mockCreateUserRouter.mock.calls[0][0];

      // Auth router should only receive auth-related dependencies
      expect(Object.keys(authDeps)).toEqual(['authController']);
      expect(authDeps.authController).toBe(mockAuthController);
      expect('userController' in authDeps).toBe(false);

      // User router should only receive user-related dependencies
      expect(Object.keys(userDeps)).toEqual(['userController']);
      expect(userDeps.userController).toBe(mockUserController);
      expect('authController' in userDeps).toBe(false);
    });

    it('should handle router factory failures gracefully', () => {
      mockCreateAuthRouter.mockImplementation(() => {
        throw new Error('Auth router creation failed');
      });

      expect(() => createApiRouter(dependencies)).toThrow(
        'Auth router creation failed'
      );
    });

    it('should not modify original dependencies object', () => {
      const originalDependencies = { ...dependencies };

      createApiRouter(dependencies);

      expect(dependencies).toEqual(originalDependencies);
      expect(dependencies.authController).toBe(
        originalDependencies.authController
      );
      expect(dependencies.userController).toBe(
        originalDependencies.userController
      );
    });
  });

  describe('integration patterns', () => {
    it('should follow dependency injection pattern', () => {
      createApiRouter(dependencies);

      // Each sub-router should receive only its needed dependencies
      expect(mockCreateAuthRouter).toHaveBeenCalledWith(
        expect.objectContaining({
          authController: expect.any(Object),
        })
      );

      expect(mockCreateUserRouter).toHaveBeenCalledWith(
        expect.objectContaining({
          userController: expect.any(Object),
        })
      );
    });

    it('should maintain separation of concerns between domains', () => {
      createApiRouter(dependencies);

      const authDeps = mockCreateAuthRouter.mock.calls[0][0];
      const userDeps = mockCreateUserRouter.mock.calls[0][0];

      // Auth domain should not have access to user domain dependencies
      expect(authDeps).not.toHaveProperty('userController');

      // User domain should not have access to auth domain dependencies
      expect(userDeps).not.toHaveProperty('authController');
    });

    it('should enable modular router composition', () => {
      const router = createApiRouter(dependencies);

      expect(router).toBe(mockApiRouter);
      expect(mockApiRouter.use).toHaveBeenCalledWith(
        '/auth',
        expect.any(Object)
      );
      expect(mockApiRouter.use).toHaveBeenCalledWith(
        '/user',
        expect.any(Object)
      );

      // Main router acts as a pure composition layer
      expect(mockApiRouter.get).not.toHaveBeenCalled();
      expect(mockApiRouter.post).not.toHaveBeenCalled();
    });

    it('should support extensibility for future domains', () => {
      // Current implementation should be easily extensible

      createApiRouter(dependencies);

      // Should have exactly 2 domain mounts currently
      expect(mockApiRouter.use).toHaveBeenCalledTimes(2);

      // Pattern should support adding more domains easily
      // (This test documents the expected extensibility pattern)
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle null dependencies', () => {
      const nullDependencies = {
        authController: null as unknown as AuthController,
        userController: null as unknown as UserController,
      };

      expect(() => createApiRouter(nullDependencies)).not.toThrow();

      expect(mockCreateAuthRouter).toHaveBeenCalledWith({
        authController: null,
      });
      expect(mockCreateUserRouter).toHaveBeenCalledWith({
        userController: null,
      });
    });

    it('should handle undefined dependencies', () => {
      const undefinedDependencies = {
        authController: undefined as unknown as AuthController,
        userController: undefined as unknown as UserController,
      };

      expect(() => createApiRouter(undefinedDependencies)).not.toThrow();
    });

    it('should propagate router creation errors', () => {
      const routerError = new Error('Router creation failed');
      mockCreateUserRouter.mockImplementation(() => {
        throw routerError;
      });

      expect(() => createApiRouter(dependencies)).toThrow(
        'Router creation failed'
      );
    });

    it('should handle Express Router constructor failures', () => {
      const expressError = new Error('Express Router failed');
      mockRouterConstructor.mockImplementation(() => {
        throw expressError;
      });

      expect(() => createApiRouter(dependencies)).toThrow(
        'Express Router failed'
      );
    });
  });
});
