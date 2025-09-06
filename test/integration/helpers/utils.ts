import { Application } from 'express';
import { createApp } from '../../../src/server';
import { AuthService } from '../../../src/api/auth/auth.service';
import { AuthController } from '../../../src/api/auth/auth.controller';
import { AuthRepository } from '../../../src/api/auth/auth.repository';
import { BcryptStrategy } from '../../../src/api/auth/strategies/BcryptStrategy';
import { PrismaClient } from '@prisma/client';

export interface TestAppSetup {
  app: Application;
  authService: AuthService;
  authRepository: AuthRepository;
  prismaClient: PrismaClient;
}

export const createTestApp = (prismaClient: PrismaClient): TestAppSetup => {
  const authRepository = new AuthRepository(prismaClient);
  const passwordStrategy = new BcryptStrategy(12);
  const authService = new AuthService(authRepository, passwordStrategy);
  const authController = new AuthController(authService);
  const app = createApp({ authController });

  return {
    app,
    authService,
    authRepository,
    prismaClient,
  };
};

export const createTestUser = async (
  authRepository: AuthRepository,
  userData?: { username?: string; password?: string }
) => {
  const defaultUserData = {
    username: 'testuser',
    password: 'testpassword123',
  };

  const userToCreate = { ...defaultUserData, ...userData };

  const { config } = require('../../../src/config');
  const passwordStrategy = new BcryptStrategy(config.saltRounds);
  const passwordHash = await passwordStrategy.hash(userToCreate.password);

  const user = await authRepository.createUser(
    userToCreate.username,
    passwordHash
  );

  return {
    ...user,
    plainPassword: userToCreate.password,
  };
};

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
