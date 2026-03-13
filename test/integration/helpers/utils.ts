import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { GlobalExceptionFilter } from '../../../src/shared/filters/global-exception.filter';
import { LoggerService } from '../../../src/shared/logger/logger.service';
import { PrismaService } from '../../../src/infrastructure/persistence/prisma/prisma.client';
import { JwtService } from '@nestjs/jwt';
import { BcryptStrategy } from '../../../src/infrastructure/security/bcrypt.strategy';
import { User } from '@prisma/client';

export interface TestAppSetup {
  app: INestApplication;
  prismaService: PrismaService;
  jwtService: JwtService;
}

export const createTestApp = async (): Promise<TestAppSetup> => {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  const logger = app.get(LoggerService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: () => new BadRequestException('Invalid request'),
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.setGlobalPrefix('api/v1');

  await app.init();

  return {
    app,
    prismaService: moduleFixture.get(PrismaService),
    jwtService: moduleFixture.get(JwtService),
  };
};

export const createTestUser = async (
  prismaService: PrismaService,
  userData?: {
    email?: string;
    username?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  }
) => {
  const defaults = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
  };

  const data = { ...defaults, ...userData };
  const bcrypt = new BcryptStrategy(12);
  const passwordHash = await bcrypt.hash(data.password);

  const user = await prismaService.user.create({
    data: {
      email: data.email,
      username: data.username,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      accountCreationMethod: 'local',
      lastPasswordChange: new Date(),
    },
  });

  return { ...user, plainPassword: data.password };
};

export const createTestJWT = (jwtService: JwtService, user: User): string => {
  return jwtService.sign({
    sub: user.id,
    email: user.email,
    username: user.username,
  });
};

export const createTestUserData = (
  overrides: {
    email?: string;
    username?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  } = {}
) => ({
  email: overrides.email ?? 'default@example.com',
  username: overrides.username ?? 'defaultuser',
  password: overrides.password ?? 'DefaultPass123!',
  firstName: overrides.firstName ?? 'Default',
  lastName: overrides.lastName ?? 'User',
});
