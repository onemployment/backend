# NestJS Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the Express → NestJS migration by adding auth and user modules, then cutting over and deleting all Express code.

**Architecture:** Module-by-module — auth first (with JWT/Passport), then user, then cleanup. The Express app keeps running until Phase 3. NestJS routes live in `src/routes/`. Services throw NestJS built-in exceptions. Integration tests are rewritten to boot a NestJS app via `Test.createTestingModule`.

**Tech Stack:** NestJS 10, `@nestjs/passport`, `@nestjs/jwt`, `passport-jwt`, class-validator, class-transformer, Prisma, Jest, Testcontainers

---

## Phase 1: Auth Module

### Task 1: Install required packages

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt
npm install --save-dev @types/passport-jwt
```

**Step 2: Verify install**

```bash
npm ls @nestjs/passport @nestjs/jwt passport-jwt
```
Expected: all four packages listed with versions.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install nestjs passport and jwt packages"
```

---

### Task 2: Normalize error response format

The global exception filter currently returns `{ statusCode, message, timestamp }`. Integration tests expect `{ message }`. Fix this before writing any module code.

**Files:**
- Modify: `src/shared/filters/global-exception.filter.ts`
- Modify: `src/main.ts`

**Step 1: Update GlobalExceptionFilter to return `{ message }` only**

Replace the `response.status(...).json(...)` call in `src/shared/filters/global-exception.filter.ts`:

```typescript
// OLD
response.status(status).json({
  statusCode: status,
  message,
  timestamp: new Date().toISOString(),
});

// NEW
response.status(status).json({ message });
```

**Step 2: Add `exceptionFactory` to ValidationPipe in `src/main.ts`**

Replace the existing `ValidationPipe` config:

```typescript
import { BadRequestException, ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: () => new BadRequestException('Invalid request'),
  })
);
```

**Step 3: Build to verify no TypeScript errors**

```bash
npm run nest:build
```
Expected: exits 0, `dist/` updated.

**Step 4: Commit**

```bash
git add src/shared/filters/global-exception.filter.ts src/main.ts
git commit -m "fix: normalize error response to {message} and set validation pipe factory"
```

---

### Task 3: Create LoginDto

**Files:**
- Create: `src/routes/auth/dto/login.dto.ts`

**Step 1: Create the DTO**

```typescript
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid request' })
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

**Step 2: Build to verify**

```bash
npm run nest:build
```
Expected: exits 0.

**Step 3: Commit**

```bash
git add src/routes/auth/dto/login.dto.ts
git commit -m "feat: add LoginDto with class-validator"
```

---

### Task 4: Create BcryptStrategy as NestJS injectable

Cherry-pick from `src/api/auth/strategies/BcryptStrategy.ts` — only change is `@Injectable()` and injecting `AppConfigService` for salt rounds.

**Files:**
- Create: `src/routes/auth/strategies/bcrypt.strategy.ts`

**Step 1: Write the failing unit test**

Create `src/routes/auth/strategies/__tests__/bcrypt.strategy.test.ts`:

```typescript
import { BcryptStrategy } from '../bcrypt.strategy';

describe('BcryptStrategy', () => {
  let strategy: BcryptStrategy;

  beforeEach(() => {
    strategy = new BcryptStrategy(10);
  });

  it('should hash a password', async () => {
    const hash = await strategy.hash('password123');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('password123');
  });

  it('should verify a correct password', async () => {
    const hash = await strategy.hash('password123');
    const result = await strategy.verify('password123', hash);
    expect(result).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await strategy.hash('password123');
    const result = await strategy.verify('wrongpassword', hash);
    expect(result).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --testPathPattern="bcrypt.strategy.test"
```
Expected: FAIL — `BcryptStrategy` not found.

**Step 3: Create the strategy**

```typescript
import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

@Injectable()
export class BcryptStrategy {
  constructor(private readonly saltRounds: number) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --testPathPattern="bcrypt.strategy.test"
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/routes/auth/strategies/bcrypt.strategy.ts src/routes/auth/strategies/__tests__/bcrypt.strategy.test.ts
git commit -m "feat: add BcryptStrategy as NestJS injectable"
```

---

### Task 5: Create JwtStrategy and JwtAuthGuard

These replace `jwt-auth.middleware.ts`. The `JwtAuthGuard` customizes error messages to match the existing API behavior.

**Files:**
- Create: `src/routes/auth/strategies/jwt.strategy.ts`
- Create: `src/routes/auth/guards/jwt-auth.guard.ts`

**Step 1: Create JwtStrategy**

```typescript
// src/routes/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'development-secret-key',
      issuer: 'onemployment-auth',
      audience: 'onemployment-api',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return payload;
  }
}
```

**Step 2: Create JwtAuthGuard**

Custom `handleRequest` maps Passport errors to the exact messages the existing API returns.

```typescript
// src/routes/auth/guards/jwt-auth.guard.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser, info: Error | null): TUser {
    if (err) throw err;

    if (!user) {
      const message =
        info?.name === 'JsonWebTokenError' ||
        info?.name === 'TokenExpiredError' ||
        info?.name === 'NotBeforeError'
          ? 'Invalid or expired token'
          : 'No token provided';
      throw new UnauthorizedException(message);
    }

    return user;
  }
}
```

**Step 3: Build to verify**

```bash
npm run nest:build
```
Expected: exits 0.

**Step 4: Commit**

```bash
git add src/routes/auth/strategies/jwt.strategy.ts src/routes/auth/guards/jwt-auth.guard.ts
git commit -m "feat: add JwtStrategy and JwtAuthGuard replacing jwt middleware"
```

---

### Task 6: Create AuthRepository

Cherry-pick from `src/api/auth/auth.repository.ts`. Only changes: `@Injectable()` decorator, inject `PrismaService`.

**Files:**
- Create: `src/routes/auth/__tests__/auth.repository.test.ts`
- Create: `src/routes/auth/auth.repository.ts`

**Step 1: Write the failing unit test**

```typescript
// src/routes/auth/__tests__/auth.repository.test.ts
import { AuthRepository } from '../auth.repository';
import { PrismaService } from '../../../database/prisma.service';
import { mockDeep } from 'jest-mock-extended';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prisma: ReturnType<typeof mockDeep<PrismaService>>;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    repository = new AuthRepository(prisma as unknown as PrismaService);
  });

  it('should find user by email (lowercased)', async () => {
    const mockUser = { id: '1', email: 'test@example.com' } as any;
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await repository.findByEmail('TEST@EXAMPLE.COM');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(result).toEqual(mockUser);
  });

  it('should update lastLoginAt', async () => {
    const updatedUser = { id: '1', lastLoginAt: new Date() } as any;
    prisma.user.update.mockResolvedValue(updatedUser);

    const result = await repository.updateLastLogin('1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(result).toEqual(updatedUser);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --testPathPattern="auth.repository.test"
```
Expected: FAIL.

**Step 3: Create AuthRepository**

```typescript
// src/routes/auth/auth.repository.ts
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async updateLastLogin(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --testPathPattern="auth.repository.test"
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/routes/auth/auth.repository.ts src/routes/auth/__tests__/auth.repository.test.ts
git commit -m "feat: add NestJS AuthRepository"
```

---

### Task 7: Create AuthService

Cherry-pick from `src/api/auth/auth.service.ts`. Key change: inject `JwtService` instead of `JWTUtil`, throw NestJS `UnauthorizedException`.

**Files:**
- Create: `src/routes/auth/__tests__/auth.service.test.ts`
- Create: `src/routes/auth/auth.service.ts`

**Step 1: Write the failing unit test**

```typescript
// src/routes/auth/__tests__/auth.service.test.ts
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
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --testPathPattern="routes/auth/__tests__/auth.service"
```
Expected: FAIL.

**Step 3: Create AuthService**

```typescript
// src/routes/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import { BcryptStrategy } from './strategies/bcrypt.strategy';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly bcryptStrategy: BcryptStrategy,
    private readonly jwtService: JwtService,
  ) {}

  async loginUser(credentials: LoginDto): Promise<{ user: User; token: string }> {
    const user = await this.authRepository.findByEmail(credentials.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await this.bcryptStrategy.verify(credentials.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const updatedUser = await this.authRepository.updateLastLogin(user.id);

    const token = this.jwtService.sign({
      sub: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
    });

    return { user: updatedUser, token };
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --testPathPattern="routes/auth/__tests__/auth.service"
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/routes/auth/auth.service.ts src/routes/auth/__tests__/auth.service.test.ts
git commit -m "feat: add NestJS AuthService"
```

---

### Task 8: Create AuthController and AuthModule

**Files:**
- Create: `src/routes/auth/__tests__/auth.controller.test.ts`
- Create: `src/routes/auth/auth.controller.ts`
- Create: `src/routes/auth/auth.module.ts`
- Modify: `src/app.module.ts`

**Step 1: Write the failing controller test**

```typescript
// src/routes/auth/__tests__/auth.controller.test.ts
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
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --testPathPattern="routes/auth/__tests__/auth.controller"
```
Expected: FAIL.

**Step 3: Create AuthController**

```typescript
// src/routes/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    const { user, token } = await this.authService.loginUser(loginDto);
    return {
      message: 'Login successful',
      token,
      user: this.transformUser(user),
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  logout() {
    return { message: 'Logout successful' };
  }

  private transformUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
    };
  }
}
```

**Step 4: Create AuthModule**

```typescript
// src/routes/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { BcryptStrategy } from './strategies/bcrypt.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AppConfigService } from '../../shared/config/app-config.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret || 'development-secret-key',
        signOptions: {
          expiresIn: '8h',
          issuer: 'onemployment-auth',
          audience: 'onemployment-api',
        },
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, BcryptStrategy, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule, BcryptStrategy],
})
export class AuthModule {}
```

**Step 5: Register AuthModule in AppModule**

In `src/app.module.ts`, add `AuthModule` to imports:

```typescript
import { AuthModule } from './routes/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TerminusModule,
    DatabaseModule,
    SharedModule,
    HealthModule,
    AuthModule,   // ADD THIS
  ],
})
export class AppModule {}
```

**Step 6: Run controller test to verify it passes**

```bash
npm run test:unit -- --testPathPattern="routes/auth/__tests__/auth.controller"
```
Expected: PASS.

**Step 7: Build to verify no errors**

```bash
npm run nest:build
```
Expected: exits 0.

**Step 8: Commit**

```bash
git add src/routes/auth/ src/app.module.ts
git commit -m "feat: add NestJS AuthModule with controller, service, repository"
```

---

### Task 9: Update integration test infrastructure and verify auth tests pass

The integration test helpers must be rewritten to boot a NestJS app. The `setup.ts` needs to set `process.env.POSTGRES_DB_URL` so the NestJS `PrismaService` uses the test container.

**Files:**
- Modify: `test/integration/helpers/setup.ts`
- Modify: `test/integration/helpers/utils.ts`
- Modify: `test/integration/auth/local-authentication.int.test.ts`

**Step 1: Update `setup.ts` to set `POSTGRES_DB_URL` env var**

Add `process.env.POSTGRES_DB_URL = databaseUrl;` after getting the container URI:

```typescript
// In setup.ts, after line 30 (getConnectionUri):
const databaseUrl = globalWithPostgres.postgresContainer.getConnectionUri();
process.env.POSTGRES_DB_URL = databaseUrl;  // ADD THIS LINE
logger.info(`PostgreSQL container started at: ${databaseUrl}`);
```

**Step 2: Rewrite `test/integration/helpers/utils.ts`**

```typescript
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { GlobalExceptionFilter } from '../../../src/shared/filters/global-exception.filter';
import { LoggerService } from '../../../src/shared/logger/logger.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BcryptStrategy } from '../../../src/routes/auth/strategies/bcrypt.strategy';
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
  return jwtService.sign({ sub: user.id, email: user.email, username: user.username });
};
```

**Step 3: Update `local-authentication.int.test.ts`**

Replace the Express `Application` type and `createTestApp`/`createTestUser` references:

```typescript
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../src/database/prisma.service';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createTestApp, createTestUser, TestAppSetup } from '../helpers/utils';

const globalWithPostgres = global as typeof globalThis & {
  postgresContainer: StartedPostgreSqlContainer;
  prismaClient: any;
};

describe('Local Authentication Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    testSetup = await createTestApp();
    app = testSetup.app;
    jwtService = testSetup.jwtService;
  });

  afterAll(async () => {
    await app.close();
  });

  // Replace all `createTestUser(testSetup.userRepository, ...)` with
  // `createTestUser(testSetup.prismaService, ...)`
  //
  // Replace all `testSetup.jwtUtil.validateToken(token)` with
  // `jwtService.verify(token)`
  //
  // Replace all `testSetup.jwtUtil.generateToken(user)` with
  // `jwtService.sign({ sub: user.id, email: user.email, username: user.username })`
  //
  // Keep all request() calls and assertions identical — routes and response shapes are unchanged
});
```

> **Note for implementer:** Apply the substitution pattern above to each test in the file. The HTTP request patterns and response body assertions remain identical. Only the app creation and helper calls change.

**Step 4: Run auth integration tests**

```bash
npm run test:int -- --testPathPattern="local-authentication"
```
Expected: all tests PASS.

**Step 5: Commit**

```bash
git add test/integration/helpers/ test/integration/auth/
git commit -m "test: update integration test helpers to use NestJS app"
```

---

## Phase 2: User Module

### Task 10: Create user DTOs

**Files:**
- Create: `src/routes/user/dto/register-user.dto.ts`
- Create: `src/routes/user/dto/update-user-profile.dto.ts`

**Step 1: Create RegisterUserDto**

Mirrors `userRegistrationSchema` with class-validator:

```typescript
// src/routes/user/dto/register-user.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterUserDto {
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one digit',
  })
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(39)
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/, {
    message: 'Username must be 1-39 characters, start and end with alphanumeric, and can contain hyphens',
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s\-'.]+$/, {
    message: "First name can only contain letters, spaces, hyphens, apostrophes, and dots",
  })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s\-'.]+$/, {
    message: "Last name can only contain letters, spaces, hyphens, apostrophes, and dots",
  })
  lastName: string;
}
```

**Step 2: Create UpdateUserProfileDto**

```typescript
// src/routes/user/dto/update-user-profile.dto.ts
import { IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s\-'.]+$/)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s\-'.]+$/)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName?: string | null;
}
```

**Step 3: Build to verify**

```bash
npm run nest:build
```
Expected: exits 0.

**Step 4: Commit**

```bash
git add src/routes/user/dto/
git commit -m "feat: add user DTOs with class-validator"
```

---

### Task 11: Create UserRepository

Cherry-pick from `src/api/user/user.repository.ts`.

**Files:**
- Create: `src/routes/user/__tests__/user.repository.test.ts`
- Create: `src/routes/user/user.repository.ts`

**Step 1: Write the failing unit test**

```typescript
// src/routes/user/__tests__/user.repository.test.ts
import { UserRepository } from '../user.repository';
import { PrismaService } from '../../../database/prisma.service';
import { mockDeep } from 'jest-mock-extended';

describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: ReturnType<typeof mockDeep<PrismaService>>;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    repository = new UserRepository(prisma as unknown as PrismaService);
  });

  it('should find user by id', async () => {
    const mockUser = { id: '1' } as any;
    prisma.user.findUnique.mockResolvedValue(mockUser);
    const result = await repository.findById('1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(result).toEqual(mockUser);
  });

  it('should check if email is taken', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: '1' } as any);
    const result = await repository.isEmailTaken('test@example.com');
    expect(result).toBe(true);
  });

  it('should return false when email is not taken', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await repository.isEmailTaken('free@example.com');
    expect(result).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --testPathPattern="routes/user/__tests__/user.repository"
```
Expected: FAIL.

**Step 3: Create UserRepository**

```typescript
// src/routes/user/user.repository.ts
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface UserCreationData {
  email: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  accountCreationMethod: string;
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: UserCreationData): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        accountCreationMethod: data.accountCreationMethod,
        lastPasswordChange: new Date(),
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
  }

  async updateProfile(id: string, updates: ProfileUpdateData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: updates });
  }

  async isEmailTaken(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    return user !== null;
  }

  async isUsernameTaken(username: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true },
    });
    return user !== null;
  }

  async findUsersByUsernamePrefix(prefix: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { username: { startsWith: prefix, mode: 'insensitive' } },
      orderBy: { username: 'asc' },
    });
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --testPathPattern="routes/user/__tests__/user.repository"
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/routes/user/user.repository.ts src/routes/user/__tests__/user.repository.test.ts
git commit -m "feat: add NestJS UserRepository"
```

---

### Task 12: Create UsernameSuggestionsUtil as injectable

Cherry-pick from `src/api/user/utils/username-suggestions.util.ts`. Add `@Injectable()`, inject `UserRepository`.

**Files:**
- Create: `src/routes/user/utils/username-suggestions.util.ts`

**Step 1: Write the failing unit test**

```typescript
// src/routes/user/utils/__tests__/username-suggestions.util.test.ts
import { UsernameSuggestionsUtil } from '../username-suggestions.util';
import { UserRepository } from '../../user.repository';

describe('UsernameSuggestionsUtil', () => {
  let util: UsernameSuggestionsUtil;
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepository = {
      isUsernameTaken: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    util = new UsernameSuggestionsUtil(mockRepository);
  });

  it('should generate available suggestions', async () => {
    mockRepository.isUsernameTaken.mockResolvedValueOnce(true); // username2 taken
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false); // username3 available
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false); // username4 available
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false); // username5 available

    const suggestions = await util.generateSuggestions('username', 3);
    expect(suggestions).toEqual(['username3', 'username4', 'username5']);
  });

  it('should return true when username is available', async () => {
    mockRepository.isUsernameTaken.mockResolvedValue(false);
    const result = await util.isUsernameAvailable('newuser');
    expect(result).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --testPathPattern="routes/user/utils/__tests__/username-suggestions"
```
Expected: FAIL.

**Step 3: Create UsernameSuggestionsUtil**

```typescript
// src/routes/user/utils/username-suggestions.util.ts
import { Injectable } from '@nestjs/common';
import { UserRepository } from '../user.repository';

let __lastFallbackTs = 0;
let __fallbackCounter = 0;

@Injectable()
export class UsernameSuggestionsUtil {
  constructor(private readonly userRepository: UserRepository) {}

  async generateSuggestions(baseUsername: string, count = 3): Promise<string[]> {
    const suggestions: string[] = [];
    let currentNumber = 2;

    while (suggestions.length < count) {
      const suggestion = `${baseUsername}${currentNumber}`;
      const isAvailable = await this.isUsernameAvailable(suggestion);
      if (isAvailable) suggestions.push(suggestion);
      currentNumber++;
      if (currentNumber > 100) break;
    }

    return suggestions;
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const isTaken = await this.userRepository.isUsernameTaken(username);
      return !isTaken;
    } catch {
      return false;
    }
  }

  async getFirstAvailable(baseUsername: string): Promise<string> {
    const suggestions = await this.generateSuggestions(baseUsername, 1);
    return suggestions.length > 0
      ? suggestions[0]
      : (() => {
          const now = Date.now();
          if (now === __lastFallbackTs) {
            __fallbackCounter += 1;
          } else {
            __lastFallbackTs = now;
            __fallbackCounter = 0;
          }
          const suffix = __fallbackCounter ? `${now}${__fallbackCounter}` : `${now}`;
          return `${baseUsername}${suffix}`;
        })();
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --testPathPattern="routes/user/utils/__tests__/username-suggestions"
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/routes/user/utils/
git commit -m "feat: add UsernameSuggestionsUtil as NestJS injectable"
```

---

### Task 13: Create UserService

Cherry-pick from `src/api/user/user.service.ts`. Throw NestJS exceptions, inject `JwtService`, `BcryptStrategy`, `UsernameSuggestionsUtil`, `UserRepository`.

**Files:**
- Create: `src/routes/user/__tests__/user.service.test.ts`
- Create: `src/routes/user/user.service.ts`
- Copy: `src/api/user/utils/validation.util.ts` → `src/routes/user/utils/validation.util.ts`

**Step 1: Copy ValidationUtil**

```bash
cp src/api/user/utils/validation.util.ts src/routes/user/utils/validation.util.ts
```

No changes needed — it's a static utility class.

**Step 2: Write the failing unit test**

```typescript
// src/routes/user/__tests__/user.service.test.ts
import { UserService } from '../user.service';
import { UserRepository } from '../user.repository';
import { BcryptStrategy } from '../../auth/strategies/bcrypt.strategy';
import { JwtService } from '@nestjs/jwt';
import { UsernameSuggestionsUtil } from '../utils/username-suggestions.util';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
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

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockBcryptStrategy: jest.Mocked<BcryptStrategy>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockSuggestionsUtil: jest.Mocked<UsernameSuggestionsUtil>;

  beforeEach(() => {
    mockUserRepository = {
      isEmailTaken: jest.fn(),
      isUsernameTaken: jest.fn(),
      createUser: jest.fn(),
      findById: jest.fn(),
      updateProfile: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findUsersByUsernamePrefix: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    mockBcryptStrategy = { hash: jest.fn(), verify: jest.fn() } as unknown as jest.Mocked<BcryptStrategy>;
    mockJwtService = { sign: jest.fn() } as unknown as jest.Mocked<JwtService>;
    mockSuggestionsUtil = {
      generateSuggestions: jest.fn(),
      isUsernameAvailable: jest.fn(),
    } as unknown as jest.Mocked<UsernameSuggestionsUtil>;

    userService = new UserService(
      mockUserRepository,
      mockBcryptStrategy,
      mockJwtService,
      mockSuggestionsUtil
    );
  });

  describe('registerUser', () => {
    const validData = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'Password123',
      firstName: 'New',
      lastName: 'User',
    };

    it('should register user and return user + token', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(false);
      mockUserRepository.isUsernameTaken.mockResolvedValue(false);
      mockBcryptStrategy.hash.mockResolvedValue('hashed');
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');

      const result = await userService.registerUser(validData);
      expect(result.token).toBe('token');
      expect(result.user).toEqual(mockUser);
    });

    it('should throw ConflictException when email is taken', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(true);
      await expect(userService.registerUser(validData)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when username is taken', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(false);
      mockUserRepository.isUsernameTaken.mockResolvedValue(true);
      await expect(userService.registerUser(validData)).rejects.toThrow(ConflictException);
    });
  });

  describe('getUserProfile', () => {
    it('should return user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      const result = await userService.getUserProfile('uuid-1');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(userService.getUserProfile('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npm run test:unit -- --testPathPattern="routes/user/__tests__/user.service"
```
Expected: FAIL.

**Step 4: Create UserService**

```typescript
// src/routes/user/user.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { UserRepository } from './user.repository';
import { BcryptStrategy } from '../auth/strategies/bcrypt.strategy';
import { UsernameSuggestionsUtil } from './utils/username-suggestions.util';
import { ValidationUtil } from './utils/validation.util';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly bcryptStrategy: BcryptStrategy,
    private readonly jwtService: JwtService,
    private readonly usernameSuggestionsUtil: UsernameSuggestionsUtil,
  ) {}

  async registerUser(data: RegisterUserDto): Promise<{ user: User; token: string }> {
    if (ValidationUtil.isReservedUsername(data.username)) {
      throw new BadRequestException('Username is reserved and cannot be used');
    }

    if (await this.userRepository.isEmailTaken(data.email)) {
      throw new ConflictException('Email already registered. Please sign in instead');
    }

    if (await this.userRepository.isUsernameTaken(data.username)) {
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await this.bcryptStrategy.hash(data.password);
    const firstName = ValidationUtil.sanitizeName(data.firstName);
    const lastName = ValidationUtil.sanitizeName(data.lastName);

    const user = await this.userRepository.createUser({
      email: data.email,
      username: data.username,
      passwordHash,
      firstName,
      lastName,
      accountCreationMethod: 'local',
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      username: user.username,
    });

    return { user, token };
  }

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserProfile(userId: string, updates: UpdateUserProfileDto): Promise<User> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) throw new NotFoundException('User not found');

    const sanitized: UpdateUserProfileDto = {};
    if (updates.firstName !== undefined) sanitized.firstName = ValidationUtil.sanitizeName(updates.firstName);
    if (updates.lastName !== undefined) sanitized.lastName = ValidationUtil.sanitizeName(updates.lastName);
    if (updates.displayName !== undefined) {
      sanitized.displayName = updates.displayName
        ? ValidationUtil.sanitizeName(updates.displayName)
        : updates.displayName;
    }

    return this.userRepository.updateProfile(userId, sanitized);
  }

  async validateUsername(username: string): Promise<{ available: boolean; suggestions?: string[] }> {
    if (!ValidationUtil.validateUsername(username) || ValidationUtil.isReservedUsername(username)) {
      return {
        available: false,
        suggestions: await this.usernameSuggestionsUtil.generateSuggestions(username),
      };
    }

    const available = await this.usernameSuggestionsUtil.isUsernameAvailable(username);
    if (!available) {
      return {
        available: false,
        suggestions: await this.usernameSuggestionsUtil.generateSuggestions(username),
      };
    }

    return { available: true };
  }

  async validateEmail(email: string): Promise<{ available: boolean }> {
    const sanitized = ValidationUtil.sanitizeEmail(email);
    if (!ValidationUtil.validateEmail(sanitized)) return { available: false };
    const isTaken = await this.userRepository.isEmailTaken(sanitized);
    return { available: !isTaken };
  }

  async suggestUsernames(baseUsername: string): Promise<string[]> {
    return this.usernameSuggestionsUtil.generateSuggestions(baseUsername, 5);
  }
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test:unit -- --testPathPattern="routes/user/__tests__/user.service"
```
Expected: PASS.

**Step 6: Commit**

```bash
git add src/routes/user/utils/validation.util.ts src/routes/user/user.service.ts src/routes/user/__tests__/user.service.test.ts
git commit -m "feat: add NestJS UserService"
```

---

### Task 14: Create UserController and UserModule

**Files:**
- Create: `src/routes/user/__tests__/user.controller.test.ts`
- Create: `src/routes/user/user.controller.ts`
- Create: `src/routes/user/user.module.ts`
- Modify: `src/app.module.ts`

**Step 1: Write the failing controller test**

```typescript
// src/routes/user/__tests__/user.controller.test.ts
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
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --testPathPattern="routes/user/__tests__/user.controller"
```
Expected: FAIL.

**Step 3: Create UserController**

```typescript
// src/routes/user/user.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(201)
  async register(@Body() dto: RegisterUserDto) {
    const { user, token } = await this.userService.registerUser(dto);
    return {
      message: 'User created successfully',
      token,
      user: this.transformUser(user),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: { user: JwtPayload }) {
    const user = await this.userService.getUserProfile(req.user.sub);
    return { user: this.transformUser(user) };
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Request() req: { user: JwtPayload }, @Body() dto: UpdateUserProfileDto) {
    const user = await this.userService.updateUserProfile(req.user.sub, dto);
    return { message: 'Profile updated successfully', user: this.transformUser(user) };
  }

  @Get('validate/username')
  async validateUsername(@Query('username') username: string) {
    if (!username) {
      return { available: false, message: 'Username parameter is required' };
    }
    const { available, suggestions } = await this.userService.validateUsername(username);
    return {
      available,
      message: available ? 'Username is available' : 'Username is taken',
      ...(suggestions && { suggestions }),
    };
  }

  @Get('validate/email')
  async validateEmail(@Query('email') email: string) {
    if (!email) {
      return { available: false, message: 'Email parameter is required' };
    }
    const { available } = await this.userService.validateEmail(email);
    return {
      available,
      message: available
        ? 'Email is available'
        : 'Email already registered. Please sign in instead',
    };
  }

  @Get('suggest-usernames')
  async suggestUsernames(@Query('username') username: string) {
    if (!username) {
      return { suggestions: [], message: 'Username parameter is required' };
    }
    const suggestions = await this.userService.suggestUsernames(username);
    return { suggestions };
  }

  private transformUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      accountCreationMethod: user.accountCreationMethod,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
    };
  }
}
```

**Step 4: Create UserModule**

```typescript
// src/routes/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UsernameSuggestionsUtil } from './utils/username-suggestions.util';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UserController],
  providers: [UserService, UserRepository, UsernameSuggestionsUtil],
})
export class UserModule {}
```

**Step 5: Register UserModule in AppModule**

```typescript
// src/app.module.ts — add UserModule
import { UserModule } from './routes/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TerminusModule,
    DatabaseModule,
    SharedModule,
    HealthModule,
    AuthModule,
    UserModule,  // ADD THIS
  ],
})
export class AppModule {}
```

**Step 6: Run controller test to verify it passes**

```bash
npm run test:unit -- --testPathPattern="routes/user/__tests__/user.controller"
```
Expected: PASS.

**Step 7: Build to verify**

```bash
npm run nest:build
```
Expected: exits 0.

**Step 8: Commit**

```bash
git add src/routes/user/ src/app.module.ts
git commit -m "feat: add NestJS UserModule with controller, service, repository"
```

---

### Task 15: Update user integration tests

**Files:**
- Modify: `test/integration/user/user-registration.int.test.ts`
- Modify: `test/integration/user/user-profile.int.test.ts`
- Modify: `test/integration/user/user-validation.int.test.ts`
- Modify: `test/integration/user/user-scenarios.int.test.ts`

Apply the same migration pattern from Task 9 to each user integration test file:
- Replace `let app: Application` with `let app: INestApplication`
- Replace `beforeEach(() => { testSetup = createTestApp(prismaClient) })` with `beforeAll(async () => { testSetup = await createTestApp() })`
- Add `afterAll(async () => { await app.close() })`
- Replace `createTestUser(testSetup.userRepository, ...)` with `createTestUser(testSetup.prismaService, ...)`
- Replace `testSetup.jwtUtil.generateToken(user)` with `testSetup.jwtService.sign({ sub: user.id, email: user.email, username: user.username })`
- Replace `testSetup.jwtUtil.validateToken(token)` with `testSetup.jwtService.verify(token)`
- Keep all HTTP request patterns and response assertions identical

**Run user integration tests:**

```bash
npm run test:int -- --testPathPattern="user"
```
Expected: all tests PASS.

**Run all integration tests:**

```bash
npm run test:int
```
Expected: all tests PASS.

**Commit:**

```bash
git add test/integration/user/
git commit -m "test: update user integration tests to use NestJS app"
```

---

## Phase 3: Cleanup

### Task 16: Update LoggerService to remove src/common dependency

`src/shared/logger/logger.service.ts` currently imports from `src/common/logger/logger.ts` (which depends on `src/config`). Both will be deleted. Move the pino setup inline.

**Files:**
- Modify: `src/shared/logger/logger.service.ts`

**Step 1: Update LoggerService to inline pino**

```typescript
// src/shared/logger/logger.service.ts
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  serializers: pino.stdSerializers,
});

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    pinoLogger.info(context ? { context } : undefined, message);
  }

  error(message: string, trace?: string, context?: string) {
    const metadata: Record<string, unknown> = {};
    if (context) metadata.context = context;
    if (trace) metadata.trace = trace;
    pinoLogger.error(
      Object.keys(metadata).length > 0 ? metadata : undefined,
      message
    );
  }

  warn(message: string, context?: string) {
    pinoLogger.warn(context ? { context } : undefined, message);
  }

  debug(message: string, context?: string) {
    pinoLogger.debug(context ? { context } : undefined, message);
  }

  verbose(message: string, context?: string) {
    pinoLogger.debug(context ? { context } : undefined, message);
  }
}
```

**Step 2: Update `test/integration/helpers/setup.ts` and `teardown.ts`**

Replace `import { logger } from '../../../src/common/logger/logger'` with inline console calls (or just use `console.log` since these are test helpers):

```typescript
// In setup.ts and teardown.ts, replace:
import { logger } from '../../../src/common/logger/logger';
// With:
const logger = { info: console.log, error: console.error };
```

**Step 3: Build and run all tests**

```bash
npm run nest:build && npm run test:unit && npm run test:int
```
Expected: all pass.

**Step 4: Commit**

```bash
git add src/shared/logger/logger.service.ts test/integration/helpers/setup.ts test/integration/helpers/teardown.ts
git commit -m "refactor: move pino logger inline in LoggerService, remove src/common dependency"
```

---

### Task 17: Delete Express files

**Files to delete:**
```
src/index.ts
src/server.ts
src/api/
src/middleware/
src/common/
src/config/
src/utils.ts
src/types/express.d.ts
```

**Step 1: Delete Express source files**

```bash
rm src/index.ts src/server.ts src/utils.ts src/types/express.d.ts
rm -rf src/api/ src/middleware/ src/common/ src/config/
```

**Step 2: Build to verify no broken imports**

```bash
npm run nest:build
```
Expected: exits 0.

**Step 3: Run all unit tests**

```bash
npm run test:unit
```
Expected: all pass. (Old Express unit tests in `src/api/` are gone; only NestJS tests in `src/routes/` remain.)

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete Express app code (server, api, middleware, common, config)"
```

---

### Task 18: Update scripts, docker-compose, and jest config

**Files:**
- Modify: `package.json`
- Modify: `docker-compose.yml`
- Modify: `jest.config.js`

**Step 1: Update `package.json`**

```json
{
  "main": "dist/main.js",
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "dev": "nest start --watch",
    "dev:build": "docker compose up --build -d",
    "dev:start": "docker compose up -d",
    "dev:stop": "docker compose down",
    "dev:clean": "docker compose down && docker rmi backend"
  }
}
```

Remove the `nest:build`, `nest:start`, `nest:start:dev`, `nest:start:debug`, `nest:start:prod` aliases — they are now redundant.

**Step 2: Update `docker-compose.yml` backend command**

```yaml
# OLD
command: npx nodemon --exec "npx ts-node src/index.ts" ...

# NEW
command: npm run dev
```

**Step 3: Update `jest.config.js`**

Update `collectCoverageFrom` to exclude the now-deleted `src/index.ts` and include only `src/routes`:

```javascript
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/__tests__/**',
  '!src/**/*.d.ts',
  '!src/main.ts',
],
```

Also verify the `unit` project `roots` still points to `['<rootDir>/src']` — no change needed since new tests live in `src/routes/`.

**Step 4: Run full test suite to verify everything passes**

```bash
npm run lint && npm run build && npm run test:unit && npm run test:int
```
Expected: all pass.

**Step 5: Commit**

```bash
git add package.json docker-compose.yml jest.config.js
git commit -m "chore: update scripts and docker-compose to use NestJS entrypoint"
```
