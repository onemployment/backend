import { Application } from 'express';
import { createApp } from '../../../src/server';
import { AuthService } from '../../../src/api/auth/auth.service';
import { AuthController } from '../../../src/api/auth/auth.controller';
import { AuthRepository } from '../../../src/api/auth/auth.repository';
import { UserService } from '../../../src/api/user/user.service';
import { UserController } from '../../../src/api/user/user.controller';
import { UserRepository } from '../../../src/api/user/user.repository';
import { BcryptStrategy } from '../../../src/api/auth/strategies/BcryptStrategy';
import { JWTUtil } from '../../../src/api/auth/utils/jwt.util';
import { UsernameSuggestionsUtil } from '../../../src/api/user/utils/username-suggestions.util';
import { initializeJwtMiddleware } from '../../../src/middleware/jwt-auth.middleware';
import { PrismaClient } from '@prisma/client';
import { User } from '@prisma/client';

export interface TestAppSetup {
  app: Application;
  authService: AuthService;
  authRepository: AuthRepository;
  userService: UserService;
  userRepository: UserRepository;
  prismaClient: PrismaClient;
  jwtUtil: JWTUtil;
}

export const createTestApp = (prismaClient: PrismaClient): TestAppSetup => {
  // Initialize shared utilities
  const passwordStrategy = new BcryptStrategy(12);
  const jwtUtil = new JWTUtil();

  // Initialize JWT middleware
  initializeJwtMiddleware(jwtUtil);

  // Initialize repositories
  const authRepository = new AuthRepository(prismaClient);
  const userRepository = new UserRepository(prismaClient);

  // Initialize utilities
  const usernameSuggestionsUtil = new UsernameSuggestionsUtil(userRepository);

  // Initialize services
  const authService = new AuthService(
    authRepository,
    passwordStrategy,
    jwtUtil
  );
  const userService = new UserService(
    userRepository,
    passwordStrategy,
    jwtUtil,
    usernameSuggestionsUtil
  );

  // Initialize controllers
  const authController = new AuthController(authService);
  const userController = new UserController(userService);

  const app = createApp({ authController, userController });

  return {
    app,
    authService,
    authRepository,
    userService,
    userRepository,
    prismaClient,
    jwtUtil,
  };
};

// Updated test user factory for new schema
export const createTestUser = async (
  userRepository: UserRepository,
  userData?: {
    email?: string;
    username?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  }
) => {
  const defaultUserData = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
  };

  const userToCreate = { ...defaultUserData, ...userData };

  const passwordStrategy = new BcryptStrategy(12);
  const passwordHash = await passwordStrategy.hash(userToCreate.password);

  const user = await userRepository.createUser({
    email: userToCreate.email,
    username: userToCreate.username,
    passwordHash,
    firstName: userToCreate.firstName,
    lastName: userToCreate.lastName,
    accountCreationMethod: 'local',
  });

  return {
    ...user,
    plainPassword: userToCreate.password,
  };
};

// JWT token helper for testing protected endpoints
export const createTestJWT = async (
  jwtUtil: JWTUtil,
  user: User
): Promise<string> => {
  return await jwtUtil.generateToken(user);
};

// Helper to verify JWT token claims
export const verifyTestJWT = async (jwtUtil: JWTUtil, token: string) => {
  return await jwtUtil.validateToken(token);
};

// Helper to create test data for various scenarios
export const createTestUserData = (
  overrides?: Partial<{
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
  }>
) => ({
  email: 'testuser@example.com',
  username: 'testuser',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  ...overrides,
});

export const waitForCondition = async (
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<boolean> => {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
};
