# NestJS Migration Plan - OnEmployment Backend

## Executive Summary

This document provides a comprehensive step-by-step plan for migrating the OnEmployment backend from Express.js to NestJS while preserving all existing API contracts, business logic, and system behavior.

## Migration Status

### ✅ Phase 1: Foundation Setup - COMPLETED

**Completion Date:** September 20, 2025
**Duration:** 3 days

**Achievements:**

- ✅ NestJS dependencies installed and configured
- ✅ Core application structure implemented (app.module.ts, main.ts, shared modules)
- ✅ Database integration working (Prisma + Redis services with lifecycle management)
- ✅ Health check module functional (`/api/v1/health` endpoint)
- ✅ Global exception handling and logging integrated
- ✅ Application builds and starts successfully
- ✅ Database connections verified (PostgreSQL + Redis)
- ✅ All existing Express tests continue passing (no breaking changes)

**Current State:**

- **Express App**: Fully functional on port 3000 (unchanged)
- **NestJS App**: Foundation established, can run independently on port 3000
- **Infrastructure**: Both apps can connect to same PostgreSQL and Redis instances
- **Environment**: Local development environment configured for both Express and NestJS

**Next Phase:** Phase 2 - Core Module Migration (Authentication and User modules)

## Current Architecture Analysis

### Existing Express Structure

```
src/
├── api/                    # Domain modules
│   ├── auth/              # Authentication domain
│   │   ├── strategies/    # BcryptStrategy implementation
│   │   ├── utils/         # JWT utilities
│   │   ├── contracts/     # TypeScript interfaces
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   └── auth.schema.ts # Zod validation schemas
│   └── user/              # User management domain
│       ├── utils/         # Username validation utilities
│       ├── contracts/     # TypeScript interfaces
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.repository.ts
│       └── user.schema.ts
├── common/                # Shared utilities
│   ├── error/            # HTTP error classes
│   └── logger/           # Pino logger configuration
├── config/               # Environment configuration
├── infra/                # Infrastructure services
│   └── redis/            # Redis client service
├── middleware/           # Express middleware
│   ├── async-handler.middleware.ts
│   ├── error-handler.middleware.ts
│   ├── jwt-auth.middleware.ts
│   └── request-validator.middleware.ts
├── types/                # TypeScript definitions
└── utils.ts              # Utility functions
```

### Key Patterns Currently Used

1. **Manual Dependency Injection**: Constructor injection in `src/index.ts`
2. **Layered Architecture**: Controller → Service → Repository
3. **Interface Contracts**: Abstract classes for testability
4. **Zod Validation**: Schema-based request validation
5. **Custom Error Handling**: HTTP error classes with status codes
6. **Testcontainers**: Docker-based integration testing

---

## Phase 1: Foundation Setup (2-3 days)

### 1.1 Install NestJS Dependencies

#### Required Dependencies

```bash
npm install @nestjs/common@^10.3.0 @nestjs/core@^10.3.0 @nestjs/platform-express@^10.3.0
npm install @nestjs/config@^3.1.0 @nestjs/terminus@^10.2.0
npm install class-validator@^0.14.0 class-transformer@^0.5.1
npm install reflect-metadata@^0.1.13
```

#### Development Dependencies

```bash
npm install --save-dev @nestjs/testing@^10.3.0
npm install --save-dev @nestjs/cli@^10.2.0
```

#### Update package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "nest:build": "nest build",
    "nest:start": "nest start",
    "nest:start:dev": "nest start --watch",
    "nest:start:debug": "nest start --debug --watch",
    "nest:start:prod": "node dist/main"
  }
}
```

### 1.2 Create NestJS Application Structure

#### Create nest-cli.json

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "builder": "tsc",
    "typeCheck": true
  }
}
```

#### Create Initial NestJS Files

**src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SharedModule } from './shared/shared.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TerminusModule,
    DatabaseModule,
    SharedModule,
    AuthModule,
    UserModule,
  ],
})
export class AppModule {}
```

**src/main.ts** (NestJS entry point)

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { LoggerService } from './shared/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // CORS configuration
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? 'https://www.onemployment.org'
        : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);
  logger.log(`Application is running on: http://${host}:${port}`);
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
```

### 1.3 Migrate Configuration Module

#### Create src/shared/config/config.module.ts

```typescript
import { Module, Global } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { AppConfigService } from './app-config.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
```

#### Create src/shared/config/app-config.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get host(): string {
    return this.configService.get<string>('HOST', '0.0.0.0');
  }

  get environment(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get redisUrl(): string {
    return this.configService.get<string>('REDIS_URL');
  }

  get databaseUrl(): string {
    return this.configService.get<string>('POSTGRES_DB_URL');
  }

  get saltRounds(): number {
    return this.configService.get<number>('SALT_ROUNDS', 12);
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET');
  }
}
```

### 1.4 Migrate Shared Utilities

#### Create src/shared/shared.module.ts

```typescript
import { Module, Global } from '@nestjs/common';
import { LoggerModule } from './logger/logger.module';
import { ConfigModule } from './config/config.module';

@Global()
@Module({
  imports: [LoggerModule, ConfigModule],
  exports: [LoggerModule, ConfigModule],
})
export class SharedModule {}
```

#### Create src/shared/logger/logger.module.ts

```typescript
import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
```

#### Create src/shared/logger/logger.service.ts

```typescript
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { logger as pinoLogger } from '../../common/logger/logger';

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    pinoLogger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    pinoLogger.error({ context, trace }, message);
  }

  warn(message: string, context?: string) {
    pinoLogger.warn({ context }, message);
  }

  debug(message: string, context?: string) {
    pinoLogger.debug({ context }, message);
  }

  verbose(message: string, context?: string) {
    pinoLogger.trace({ context }, message);
  }
}
```

#### Create Exception Filters - src/shared/filters/global-exception.filter.ts

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      message =
        typeof responseBody === 'string'
          ? responseBody
          : (responseBody as any).message;
    }

    this.logger.error(
      `Exception occurred: ${message}`,
      exception instanceof Error ? exception.stack : String(exception)
    );

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 1.5 Create Database Module

#### Create src/database/database.module.ts

```typescript
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [PrismaService, RedisService],
  exports: [PrismaService, RedisService],
})
export class DatabaseModule {}
```

#### Create src/database/prisma.service.ts

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '../shared/logger/logger.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly logger: LoggerService) {
    super();
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL database');
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL database');
  }
}
```

#### Create src/database/redis.service.ts

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisClientService } from '../infra/redis/client';
import { AppConfigService } from '../shared/config/app-config.service';
import { LoggerService } from '../shared/logger/logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientService;

  constructor(
    private readonly config: AppConfigService,
    private readonly logger: LoggerService
  ) {
    this.redisClient = new RedisClientService(this.config.redisUrl);
  }

  async onModuleInit() {
    try {
      await this.redisClient.connect();
      this.logger.log('Connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.redisClient.quit();
      this.logger.log('Disconnected from Redis');
    } catch (error) {
      await this.redisClient.disconnect();
      this.logger.warn('Redis quit failed, used disconnect instead');
    }
  }

  getClient(): RedisClientService {
    return this.redisClient;
  }
}
```

### 1.6 Phase 1 Validation Steps - ✅ COMPLETED

1. **✅ Verify Dependencies Installation**

   ```bash
   npm list @nestjs/common @nestjs/core @nestjs/platform-express
   ```

   **Status:** All dependencies installed successfully

2. **✅ Validate NestJS Application Bootstrap**

   ```bash
   npm run nest:build
   ```

   **Status:** Build completed without errors

3. **✅ Test Configuration Service**
   **Status:** Configuration service loads environment variables correctly (REDIS_URL, POSTGRES_DB_URL, etc.)

4. **✅ Test Database Connections**
   **Status:** Both Prisma (PostgreSQL) and Redis connections established successfully

   **Verification:** Health endpoint response:

   ```json
   {
     "status": "ok",
     "info": {
       "database": { "status": "up" },
       "redis": { "status": "up" }
     }
   }
   ```

5. **✅ Express Compatibility Test**
   **Status:** All existing Express unit and integration tests pass without modifications

---

## Phase 2: Core Module Migration (5-7 days)

### 2.1 Migrate Authentication Module

#### 2.1.1 Create Auth Module Structure

**src/auth/auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { BcryptStrategy } from './strategies/bcrypt.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtUtilService } from './utils/jwt-util.service';
import { AppConfigService } from '../shared/config/app-config.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    BcryptStrategy,
    JwtStrategy,
    JwtUtilService,
  ],
  exports: [AuthService, JwtUtilService],
})
export class AuthModule {}
```

#### 2.1.2 Convert Auth Controller

**src/auth/auth.controller.ts**

```typescript
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginUser(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const { user, token } = await this.authService.loginUser(loginDto);

    return {
      message: 'Login successful',
      token,
      user: this.transformUserToAPI(user),
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutUser(@Req() req: Request) {
    return { message: 'Logout successful' };
  }

  private transformUserToAPI(user: User) {
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

#### 2.1.3 Create DTOs (Data Transfer Objects)

**src/auth/dto/login.dto.ts**

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}
```

**src/auth/dto/login-response.dto.ts**

```typescript
export class LoginResponseDto {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    displayName: string;
    emailVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
  };
}
```

#### 2.1.4 Convert Auth Service

**src/auth/auth.service.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import { BcryptStrategy } from './strategies/bcrypt.strategy';
import { JwtUtilService } from './utils/jwt-util.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly bcryptStrategy: BcryptStrategy,
    private readonly jwtUtilService: JwtUtilService
  ) {}

  async loginUser(
    credentials: LoginDto
  ): Promise<{ user: User; token: string }> {
    // 1. Find user by email (case-insensitive)
    const user = await this.authRepository.findByEmail(credentials.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Check if user has passwordHash (not OAuth-only account)
    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Verify password
    const isValid = await this.bcryptStrategy.verify(
      credentials.password,
      user.passwordHash
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. Update lastLoginAt and get updated user
    const updatedUser = await this.authRepository.updateLastLogin(user.id);

    // 5. Generate JWT token
    const token = await this.jwtUtilService.generateToken(updatedUser);

    return { user: updatedUser, token };
  }
}
```

#### 2.1.5 Convert Auth Repository

**src/auth/auth.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });
  }

  async updateLastLogin(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
```

#### 2.1.6 Convert Password Strategy

**src/auth/strategies/bcrypt.strategy.ts**

```typescript
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppConfigService } from '../../shared/config/app-config.service';

@Injectable()
export class BcryptStrategy {
  constructor(private readonly config: AppConfigService) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.saltRounds);
  }

  async verify(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
```

#### 2.1.7 Create JWT Strategy

**src/auth/strategies/jwt.strategy.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../shared/config/app-config.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  }
}
```

#### 2.1.8 Convert JWT Utility

**src/auth/utils/jwt-util.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

@Injectable()
export class JwtUtilService {
  constructor(private readonly jwtService: JwtService) {}

  async generateToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    return this.jwtService.sign(payload);
  }

  async validateToken(token: string): Promise<any> {
    return this.jwtService.verify(token);
  }
}
```

#### 2.1.9 Create Auth Guard

**src/auth/guards/jwt-auth.guard.ts**

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

### 2.2 Migrate User Module

#### 2.2.1 Create User Module Structure

**src/user/user.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UsernameSuggestionsUtil } from './utils/username-suggestions.util';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserService, UserRepository, UsernameSuggestionsUtil],
  exports: [UserService, UserRepository],
})
export class UserModule {}
```

#### 2.2.2 Convert User Controller

**src/user/user.controller.ts**

```typescript
import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async registerUser(@Body() createUserDto: CreateUserDto) {
    const { user, token } = await this.userService.registerUser(createUserDto);

    return {
      message: 'User registered successfully',
      token,
      user: this.transformUserToAPI(user),
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getUserProfile(@Req() req: Request) {
    const userId = (req.user as any).id;
    const user = await this.userService.getUserById(userId);

    return {
      user: this.transformUserToAPI(user),
    };
  }

  private transformUserToAPI(user: User) {
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

#### 2.2.3 Create User DTOs

**src/user/dto/create-user.dto.ts**

```typescript
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, {
    message: 'Username must be no more than 30 characters long',
  })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, hyphens, and underscores',
  })
  username: string;

  @IsString()
  @MinLength(1, { message: 'First name is required' })
  firstName: string;

  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  lastName: string;
}
```

### 2.3 Migrate Middleware to NestJS Patterns

#### 2.3.1 Validation Pipe (replaces request-validator middleware)

NestJS built-in ValidationPipe with class-validator handles this automatically when using DTOs.

#### 2.3.2 Error Handling (replaces error-handler middleware)

Already handled by GlobalExceptionFilter created in Phase 1.

#### 2.3.3 Async Handler (replaces async-handler middleware)

Not needed in NestJS - automatic exception handling for async operations.

### 2.4 Phase 2 Validation Steps

1. **Test Auth Endpoints**

   ```bash
   # Test login endpoint
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'

   # Test logout endpoint (with token)
   curl -X POST http://localhost:3000/api/v1/auth/logout \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

2. **Test User Endpoints**

   ```bash
   # Test user registration
   curl -X POST http://localhost:3000/api/v1/user/register \
     -H "Content-Type: application/json" \
     -d '{"email":"newuser@example.com","password":"password123","username":"newuser","firstName":"John","lastName":"Doe"}'

   # Test user profile (with token)
   curl -X GET http://localhost:3000/api/v1/user/profile \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Verify API Contract Preservation**
   - Compare response formats with original Express implementation
   - Ensure status codes match exactly
   - Verify error response formats are identical

---

## Phase 3: Infrastructure & Testing (3-4 days)

### 3.1 Health Checks with Terminus

#### Create src/health/health.module.ts

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
```

#### Create src/health/health.controller.ts

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private redisHealth: RedisHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }
}
```

#### Create Health Indicators

**src/health/indicators/prisma-health.indicator.ts**

```typescript
import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Prisma check failed',
        this.getStatus(key, false)
      );
    }
  }
}
```

**src/health/indicators/redis-health.indicator.ts**

```typescript
import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { RedisService } from '../../database/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.redisService.getClient();
      await client.ping();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false)
      );
    }
  }
}
```

### 3.2 Update App Module

Add HealthModule to app.module.ts:

```typescript
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ... existing imports
    HealthModule,
  ],
})
export class AppModule {}
```

### 3.3 Test Migration Strategy

#### 3.3.1 Update Jest Configuration for NestJS

**jest.config.js** (updated)

```javascript
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  projects: [
    {
      displayName: 'nest-unit',
      rootDir: '.',
      roots: ['<rootDir>/src'],
      testMatch: ['<rootDir>/src/**/__tests__/**/*.spec.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapper: pathsToModuleNameMapper(compilerOptions?.paths || {}, {
        prefix: '<rootDir>/',
      }),
      testPathIgnorePatterns: ['/node_modules/', '/dist/'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/__tests__/**',
        '!src/**/*.d.ts',
        '!src/main.ts',
        '!src/**/*.module.ts',
      ],
    },
    {
      displayName: 'nest-integration',
      rootDir: '.',
      roots: ['<rootDir>/test'],
      testMatch: ['<rootDir>/test/**/*.int.spec.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapper: pathsToModuleNameMapper(compilerOptions?.paths || {}, {
        prefix: '<rootDir>/',
      }),
      testPathIgnorePatterns: ['/node_modules/', '/dist/'],
      setupFilesAfterEnv: ['<rootDir>/test/integration/nest-setup.ts'],
      globalTeardown: '<rootDir>/test/integration/nest-teardown.ts',
    },
    // Keep existing Express tests for comparison
    {
      displayName: 'express-unit',
      rootDir: '.',
      roots: ['<rootDir>/src'],
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapper: pathsToModuleNameMapper(compilerOptions?.paths || {}, {
        prefix: '<rootDir>/',
      }),
      testPathIgnorePatterns: ['/node_modules/', '/dist/'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/__tests__/**',
        '!src/**/*.d.ts',
        '!src/index.ts',
      ],
    },
    {
      displayName: 'express-integration',
      rootDir: '.',
      roots: ['<rootDir>/test'],
      testMatch: ['<rootDir>/test/**/*.int.test.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapper: pathsToModuleNameMapper(compilerOptions?.paths || {}, {
        prefix: '<rootDir>/',
      }),
      testPathIgnorePatterns: ['/node_modules/', '/dist/'],
      setupFilesAfterEnv: ['<rootDir>/test/integration/helpers/setup.ts'],
      globalTeardown: '<rootDir>/test/integration/helpers/teardown.ts',
    },
  ],
};
```

#### 3.3.2 Create NestJS Test Setup

**test/integration/nest-setup.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { RedisService } from '../../src/database/redis.service';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

let app: INestApplication;
let postgresContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;

beforeAll(async () => {
  // Start test containers
  postgresContainer = await new PostgreSqlContainer()
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .start();

  redisContainer = await new RedisContainer().start();

  // Set environment variables for NestJS app
  process.env.POSTGRES_DB_URL = postgresContainer.getConnectionUri();
  process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
  process.env.JWT_SECRET = 'test-secret';

  // Create NestJS testing module
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

  // Apply same configuration as main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.setGlobalPrefix('api/v1');

  await app.init();

  // Run database migrations
  const prismaService = app.get(PrismaService);
  // Add migration logic here if needed
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
  if (postgresContainer) {
    await postgresContainer.stop();
  }
  if (redisContainer) {
    await redisContainer.stop();
  }
});

export { app };
```

#### 3.3.3 Create NestJS Integration Tests

**test/integration/auth/auth.int.spec.ts**

```typescript
import * as request from 'supertest';
import { app } from '../nest-setup';

describe('Authentication (NestJS)', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First create a test user
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/user/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      // Then login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(loginResponse.body).toEqual({
        message: 'Login successful',
        token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        }),
      });
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      // Create user and get token
      await request(app.getHttpServer()).post('/api/v1/user/register').send({
        email: 'logout@example.com',
        password: 'password123',
        username: 'logoutuser',
        firstName: 'Logout',
        lastName: 'User',
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'logout@example.com',
          password: 'password123',
        });

      const token = loginResponse.body.token;

      // Test logout
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });
  });
});
```

#### 3.3.4 Create Unit Tests for NestJS Services

**src/auth/**tests**/auth.service.spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthRepository } from '../auth.repository';
import { BcryptStrategy } from '../strategies/bcrypt.strategy';
import { JwtUtilService } from '../utils/jwt-util.service';
import { User } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let bcryptStrategy: jest.Mocked<BcryptStrategy>;
  let jwtUtilService: jest.Mocked<JwtUtilService>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    displayName: 'Test User',
    emailVerified: false,
    createdAt: new Date(),
    lastLoginAt: null,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockAuthRepository = {
      findByEmail: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    const mockBcryptStrategy = {
      verify: jest.fn(),
    };

    const mockJwtUtilService = {
      generateToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: BcryptStrategy, useValue: mockBcryptStrategy },
        { provide: JwtUtilService, useValue: mockJwtUtilService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepository = module.get(AuthRepository);
    bcryptStrategy = module.get(BcryptStrategy);
    jwtUtilService = module.get(JwtUtilService);
  });

  describe('loginUser', () => {
    it('should successfully login user with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };
      const updatedUser = { ...mockUser, lastLoginAt: new Date() };
      const token = 'jwt-token';

      authRepository.findByEmail.mockResolvedValue(mockUser);
      bcryptStrategy.verify.mockResolvedValue(true);
      authRepository.updateLastLogin.mockResolvedValue(updatedUser);
      jwtUtilService.generateToken.mockResolvedValue(token);

      const result = await service.loginUser(credentials);

      expect(result).toEqual({ user: updatedUser, token });
      expect(authRepository.findByEmail).toHaveBeenCalledWith(
        credentials.email
      );
      expect(bcryptStrategy.verify).toHaveBeenCalledWith(
        credentials.password,
        mockUser.passwordHash
      );
      expect(authRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(jwtUtilService.generateToken).toHaveBeenCalledWith(updatedUser);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const credentials = {
        email: 'invalid@example.com',
        password: 'password123',
      };

      authRepository.findByEmail.mockResolvedValue(null);

      await expect(service.loginUser(credentials)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authRepository.findByEmail).toHaveBeenCalledWith(
        credentials.email
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      authRepository.findByEmail.mockResolvedValue(mockUser);
      bcryptStrategy.verify.mockResolvedValue(false);

      await expect(service.loginUser(credentials)).rejects.toThrow(
        UnauthorizedException
      );
      expect(bcryptStrategy.verify).toHaveBeenCalledWith(
        credentials.password,
        mockUser.passwordHash
      );
    });
  });
});
```

### 3.4 Phase 3 Validation Steps

1. **Test Health Endpoint**

   ```bash
   curl http://localhost:3000/health
   ```

2. **Run NestJS Unit Tests**

   ```bash
   npm run test -- --selectProjects nest-unit
   ```

3. **Run NestJS Integration Tests**

   ```bash
   npm run test -- --selectProjects nest-integration
   ```

4. **Compare Test Results**
   - Ensure NestJS tests produce same results as Express tests
   - Verify test coverage is maintained

---

## Phase 4: Deployment & Validation (2-3 days)

### 4.1 Update Docker Configuration

#### Update Dockerfile

```dockerfile
# Multi-stage build for NestJS
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Build NestJS application
RUN npm run nest:build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/main"]
```

### 4.2 Update Package.json Scripts

Add NestJS-specific scripts:

```json
{
  "scripts": {
    "prebuild": "rimraf dist",
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

### 4.3 Update Development Scripts

#### Update setup-db.sh

```bash
#!/bin/bash

# NestJS development setup script
set -e

echo "Setting up development environment for NestJS..."

# Start Docker containers
echo "Starting Docker containers..."
docker compose up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker compose exec db pg_isready -U postgres; do
  sleep 2
done

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
until docker compose exec redis redis-cli ping; do
  sleep 2
done

# Run database migrations
echo "Running database migrations..."
npm run db:migrate:dev

echo "Development environment setup complete!"
echo "You can now run: npm run start:dev"
```

### 4.4 Update CI/CD Pipeline

#### Update GitHub Actions (if using)

**.github/workflows/ci.yml**

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run linting
        run: npm run lint

      - name: Run unit tests
        run: npm run test -- --selectProjects nest-unit
        env:
          NODE_ENV: test
          POSTGRES_DB_URL: postgresql://postgres:postgres@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret

      - name: Run integration tests
        run: npm run test -- --selectProjects nest-integration
        env:
          NODE_ENV: test
          JWT_SECRET: test-secret

      - name: Build application
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-2

      - name: Build and push Docker image
        run: |
          aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 062440546828.dkr.ecr.us-east-2.amazonaws.com
          docker build -t onemployment/api .
          docker tag onemployment/api:latest 062440546828.dkr.ecr.us-east-2.amazonaws.com/onemployment/api:latest
          docker push 062440546828.dkr.ecr.us-east-2.amazonaws.com/onemployment/api:latest

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster onemployment-cluster --service backend-service --force-new-deployment
```

### 4.5 Contract Validation

#### Create Contract Test Suite

**test/contracts/api-contracts.spec.ts**

```typescript
import * as request from 'supertest';
import { app } from '../integration/nest-setup';

describe('API Contract Validation', () => {
  let authToken: string;

  beforeAll(async () => {
    // Create test user and get auth token
    await request(app.getHttpServer()).post('/api/v1/user/register').send({
      email: 'contract@example.com',
      password: 'password123',
      username: 'contractuser',
      firstName: 'Contract',
      lastName: 'User',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'contract@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.token;
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return exact contract format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'contract@example.com',
          password: 'password123',
        })
        .expect(200);

      // Validate exact response structure
      expect(response.body).toMatchObject({
        message: 'Login successful',
        token: expect.any(String),
        user: {
          id: expect.any(String),
          email: 'contract@example.com',
          username: 'contractuser',
          firstName: 'Contract',
          lastName: 'User',
          displayName: expect.any(String),
          emailVerified: false,
          createdAt: expect.stringMatching(
            /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/
          ),
          lastLoginAt: expect.stringMatching(
            /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/
          ),
        },
      });

      // Validate no extra fields
      expect(Object.keys(response.body)).toEqual(['message', 'token', 'user']);
      expect(Object.keys(response.body.user)).toEqual([
        'id',
        'email',
        'username',
        'firstName',
        'lastName',
        'displayName',
        'emailVerified',
        'createdAt',
        'lastLoginAt',
      ]);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return exact contract format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logout successful',
      });
    });
  });

  describe('GET /api/v1/user/profile', () => {
    it('should return exact contract format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          id: expect.any(String),
          email: 'contract@example.com',
          username: 'contractuser',
          firstName: 'Contract',
          lastName: 'User',
          displayName: expect.any(String),
          emailVerified: false,
          createdAt: expect.stringMatching(
            /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/
          ),
          lastLoginAt: expect.stringMatching(
            /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/
          ),
        },
      });

      expect(Object.keys(response.body)).toEqual(['user']);
    });
  });

  describe('Error Response Contracts', () => {
    it('should return correct error format for invalid login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
        timestamp: expect.stringMatching(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/
        ),
      });
    });

    it('should return correct error format for validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.any(Array),
        timestamp: expect.stringMatching(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/
        ),
      });
    });
  });
});
```

### 4.6 Performance Validation

#### Create Performance Test Suite

**test/performance/load-tests.spec.ts**

```typescript
import * as request from 'supertest';
import { app } from '../integration/nest-setup';

describe('Performance Validation', () => {
  it('should handle login requests with acceptable response time', async () => {
    // Create test user
    await request(app.getHttpServer()).post('/api/v1/user/register').send({
      email: 'perf@example.com',
      password: 'password123',
      username: 'perfuser',
      firstName: 'Perf',
      lastName: 'User',
    });

    const startTime = Date.now();
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'perf@example.com',
        password: 'password123',
      })
      .expect(200);

    const responseTime = Date.now() - startTime;

    // Response time should be under 500ms (adjust based on requirements)
    expect(responseTime).toBeLessThan(500);
    expect(response.body.token).toBeDefined();
  });

  it('should handle concurrent requests', async () => {
    // Create test users
    const users = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/user/register').send({
        email: 'concurrent1@example.com',
        password: 'password123',
        username: 'concurrent1',
        firstName: 'Concurrent',
        lastName: 'User1',
      }),
      request(app.getHttpServer()).post('/api/v1/user/register').send({
        email: 'concurrent2@example.com',
        password: 'password123',
        username: 'concurrent2',
        firstName: 'Concurrent',
        lastName: 'User2',
      }),
    ]);

    // Execute concurrent login requests
    const startTime = Date.now();
    const loginPromises = [
      request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'concurrent1@example.com',
        password: 'password123',
      }),
      request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'concurrent2@example.com',
        password: 'password123',
      }),
    ];

    const responses = await Promise.all(loginPromises);
    const totalTime = Date.now() - startTime;

    // All requests should complete successfully
    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    // Total time should be reasonable for concurrent requests
    expect(totalTime).toBeLessThan(1000);
  });
});
```

### 4.7 Final Validation Checklist

#### 4.7.1 Functional Validation

- [ ] All API endpoints respond correctly
- [ ] Authentication flows work identically
- [ ] Error responses match original format
- [ ] Database operations function correctly
- [ ] Redis operations function correctly

#### 4.7.2 Performance Validation

- [ ] Response times are within acceptable range
- [ ] Memory usage is comparable or better
- [ ] Concurrent request handling works correctly
- [ ] Database connection pooling works correctly

#### 4.7.3 Infrastructure Validation

- [ ] Docker build succeeds
- [ ] Health checks pass
- [ ] Graceful shutdown works
- [ ] Environment variable handling works
- [ ] Logging format is consistent

#### 4.7.4 Test Validation

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Test coverage is maintained
- [ ] Contract tests pass
- [ ] Performance tests pass

### 4.8 Rollback Plan

If issues are discovered during deployment:

1. **Immediate Rollback**

   ```bash
   # Revert to previous ECS task definition
   aws ecs update-service --cluster onemployment-cluster --service backend-service --task-definition previous-task-def-arn
   ```

2. **Switch Docker Image**

   ```bash
   # Deploy previous working image
   docker tag previous-working-image:tag 062440546828.dkr.ecr.us-east-2.amazonaws.com/onemployment/api:latest
   docker push 062440546828.dkr.ecr.us-east-2.amazonaws.com/onemployment/api:latest
   ```

3. **Database Rollback**
   - If schema changes were made, rollback migrations
   - Restore from backup if necessary

4. **Monitoring and Alerts**
   - Monitor application metrics post-rollback
   - Verify all functionality is restored
   - Update incident response documentation

---

## Risk Mitigation

### Technical Risks

1. **API Contract Breaking**: Comprehensive contract tests and parallel validation
2. **Performance Degradation**: Performance benchmarking and load testing
3. **Database Connection Issues**: Connection pool configuration and monitoring
4. **Authentication Issues**: JWT validation testing and token format preservation

### Operational Risks

1. **Deployment Failures**: Staging environment validation and rollback procedures
2. **Data Loss**: Database backup strategies and migration testing
3. **Service Downtime**: Blue-green deployment strategy and health checks

### Timeline Risks

1. **Scope Creep**: Strict adherence to contract preservation principle
2. **Unexpected Issues**: Buffer time in each phase and parallel development approach
3. **Resource Availability**: Clear task assignment and dependency management

---

## Success Criteria

### Primary Criteria

✅ **Zero Breaking Changes**: All API contracts maintained exactly
✅ **Functional Parity**: All business logic behavior preserved
✅ **Test Parity**: Same test coverage and passing rates
✅ **Performance Parity**: Response times within 10% of original

### Secondary Criteria

✅ **Code Quality**: Improved maintainability with NestJS structure
✅ **Developer Experience**: Better development tools and debugging
✅ **Scalability**: Improved dependency injection and modularity
✅ **Documentation**: Updated architecture documentation

---

## Timeline Summary

| Phase       | Duration       | Key Deliverables                                     |
| ----------- | -------------- | ---------------------------------------------------- |
| **Phase 1** | 2-3 days       | NestJS foundation, shared modules, database setup    |
| **Phase 2** | 5-7 days       | Auth module, User module, middleware migration       |
| **Phase 3** | 3-4 days       | Health checks, test migration, infrastructure        |
| **Phase 4** | 2-3 days       | Deployment, validation, monitoring                   |
| **Total**   | **12-17 days** | Complete NestJS migration with contract preservation |

---

## Post-Migration Maintenance

### Monitoring

- Application performance metrics
- Error rate monitoring
- Database query performance
- Redis connection health

### Documentation Updates

- API documentation refresh
- Architecture diagrams update
- Development setup guides
- Troubleshooting guides

### Team Training

- NestJS development patterns
- Testing approaches
- Debugging techniques
- Deployment procedures

This migration plan ensures a systematic, risk-mitigated approach to modernizing the OnEmployment backend while maintaining all existing functionality and contracts.
