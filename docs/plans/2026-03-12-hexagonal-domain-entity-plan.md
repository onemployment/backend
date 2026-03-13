# Hexagonal Domain Entity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce a plain-TypeScript `User` domain entity and `IUserRepository` port, confine Prisma to the infrastructure layer, and restructure `src/routes/` into `src/modules/` — without changing any business logic.

**Architecture:** Root-level `src/domain/` holds framework-free interfaces. Root-level `src/infrastructure/` holds the Prisma adapter. Feature modules under `src/modules/` contain controllers and services only. Services inject `IUserRepository` via DI token, never the Prisma class directly.

**Tech Stack:** NestJS, TypeScript, Prisma (PostgreSQL), Jest, jest-mock-extended

---

### Task 1: Create domain entity and repository port

**Files:**
- Create: `src/domain/user/user.entity.ts`
- Create: `src/domain/user/user.repository.port.ts`

No NestJS imports in either file. No tests needed — these are pure interfaces.

**Step 1: Create `user.entity.ts`**

```typescript
// src/domain/user/user.entity.ts

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string | null;
  firstName: string;
  lastName: string;
  displayName: string | null;
  googleId: string | null;
  emailVerified: boolean;
  isActive: boolean;
  accountCreationMethod: string;
  lastPasswordChange: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}
```

**Step 2: Create `user.repository.port.ts`**

```typescript
// src/domain/user/user.repository.port.ts
import { User } from './user.entity';

export const USER_REPOSITORY = Symbol('IUserRepository');

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

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  createUser(data: UserCreationData): Promise<User>;
  updateProfile(id: string, updates: ProfileUpdateData): Promise<User>;
  updateLastLogin(userId: string): Promise<User>;
  linkGoogleAccount(userId: string, googleId: string): Promise<User>;
  isEmailTaken(email: string): Promise<boolean>;
  isUsernameTaken(username: string): Promise<boolean>;
  findUsersByUsernamePrefix(prefix: string): Promise<User[]>;
}
```

**Step 3: Verify TypeScript compiles**

```bash
npm run build
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/domain/
git commit -m "feat: add User domain entity and IUserRepository port"
```

---

### Task 2: Create user mapper

**Files:**
- Create: `src/infrastructure/persistence/prisma/mappers/user.mapper.ts`
- Create: `src/infrastructure/persistence/prisma/mappers/__tests__/user.mapper.test.ts`

The mapper translates between Prisma's generated `User` type and the domain `User` interface. This is the only place `@prisma/client` types cross into domain types.

**Step 1: Write the failing test**

```typescript
// src/infrastructure/persistence/prisma/mappers/__tests__/user.mapper.test.ts
import { UserMapper } from '../user.mapper';
import { User as PrismaUser } from '@prisma/client';

const prismaUser: PrismaUser = {
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

describe('UserMapper', () => {
  it('maps all fields from Prisma to domain', () => {
    const result = UserMapper.toDomain(prismaUser);

    expect(result.id).toBe(prismaUser.id);
    expect(result.email).toBe(prismaUser.email);
    expect(result.username).toBe(prismaUser.username);
    expect(result.passwordHash).toBe(prismaUser.passwordHash);
    expect(result.firstName).toBe(prismaUser.firstName);
    expect(result.lastName).toBe(prismaUser.lastName);
    expect(result.displayName).toBeNull();
    expect(result.googleId).toBeNull();
    expect(result.emailVerified).toBe(false);
    expect(result.isActive).toBe(true);
    expect(result.accountCreationMethod).toBe('local');
    expect(result.lastPasswordChange).toEqual(prismaUser.lastPasswordChange);
    expect(result.createdAt).toEqual(prismaUser.createdAt);
    expect(result.updatedAt).toEqual(prismaUser.updatedAt);
    expect(result.lastLoginAt).toBeNull();
  });

  it('maps nullable fields correctly when populated', () => {
    const withOptionals: PrismaUser = {
      ...prismaUser,
      displayName: 'Test User',
      googleId: 'google-123',
      lastLoginAt: new Date('2023-06-01'),
    };

    const result = UserMapper.toDomain(withOptionals);

    expect(result.displayName).toBe('Test User');
    expect(result.googleId).toBe('google-123');
    expect(result.lastLoginAt).toEqual(new Date('2023-06-01'));
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --testPathPattern="user.mapper.test"
```
Expected: FAIL — `Cannot find module '../user.mapper'`

**Step 3: Implement the mapper**

```typescript
// src/infrastructure/persistence/prisma/mappers/user.mapper.ts
import { User as PrismaUser } from '@prisma/client';
import { User } from '../../../../domain/user/user.entity';

export class UserMapper {
  static toDomain(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      username: prismaUser.username,
      passwordHash: prismaUser.passwordHash,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      displayName: prismaUser.displayName,
      googleId: prismaUser.googleId,
      emailVerified: prismaUser.emailVerified,
      isActive: prismaUser.isActive,
      accountCreationMethod: prismaUser.accountCreationMethod,
      lastPasswordChange: prismaUser.lastPasswordChange,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      lastLoginAt: prismaUser.lastLoginAt,
    };
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --testPathPattern="user.mapper.test"
```
Expected: PASS — 2 tests passing.

**Step 5: Commit**

```bash
git add src/infrastructure/
git commit -m "feat: add UserMapper to translate Prisma User to domain User"
```

---

### Task 3: Create PrismaUserRepository

**Files:**
- Create: `src/infrastructure/persistence/prisma/user.repository.ts`
- Create: `src/infrastructure/persistence/prisma/__tests__/user.repository.test.ts`

This is the merged implementation of `IUserRepository`, combining all methods from the current `auth.repository.ts` and `user.repository.ts`. Uses `UserMapper.toDomain()` before returning any `User`.

**Step 1: Write the failing tests**

```typescript
// src/infrastructure/persistence/prisma/__tests__/user.repository.test.ts
import { PrismaUserRepository } from '../user.repository';
import { PrismaService } from '../../../../database/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { User as PrismaUser } from '@prisma/client';

const prismaUser: PrismaUser = {
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

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prisma: ReturnType<typeof mockDeep<PrismaService>>;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    repository = new PrismaUserRepository(prisma as unknown as PrismaService);
  });

  it('findByEmail lowercases the email and returns domain User', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUser);
    const result = await repository.findByEmail('TEST@EXAMPLE.COM');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(result?.email).toBe('test@example.com');
  });

  it('findByEmail returns null when not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await repository.findByEmail('nobody@example.com');
    expect(result).toBeNull();
  });

  it('findById returns domain User', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUser);
    const result = await repository.findById('uuid-1');
    expect(result?.id).toBe('uuid-1');
  });

  it('findById returns null when not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await repository.findById('bad-id');
    expect(result).toBeNull();
  });

  it('updateLastLogin returns domain User', async () => {
    const updated = { ...prismaUser, lastLoginAt: new Date() };
    prisma.user.update.mockResolvedValue(updated);
    const result = await repository.updateLastLogin('uuid-1');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'uuid-1' },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(result.id).toBe('uuid-1');
  });

  it('isEmailTaken returns true when user exists', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUser);
    expect(await repository.isEmailTaken('test@example.com')).toBe(true);
  });

  it('isEmailTaken returns false when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await repository.isEmailTaken('nobody@example.com')).toBe(false);
  });
});
```

**Step 2: Run to verify it fails**

```bash
npm run test:unit -- --testPathPattern="infrastructure/persistence/prisma/__tests__/user.repository"
```
Expected: FAIL — `Cannot find module '../user.repository'`

**Step 3: Implement `PrismaUserRepository`**

```typescript
// src/infrastructure/persistence/prisma/user.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  IUserRepository,
  UserCreationData,
  ProfileUpdateData,
} from '../../../domain/user/user.repository.port';
import { User } from '../../../domain/user/user.entity';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { googleId } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async createUser(data: UserCreationData): Promise<User> {
    const user = await this.prisma.user.create({
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
    return UserMapper.toDomain(user);
  }

  async updateProfile(id: string, updates: ProfileUpdateData): Promise<User> {
    const user = await this.prisma.user.update({ where: { id }, data: updates });
    return UserMapper.toDomain(user);
  }

  async updateLastLogin(userId: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    return UserMapper.toDomain(user);
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
    return UserMapper.toDomain(user);
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
    const users = await this.prisma.user.findMany({
      where: { username: { startsWith: prefix, mode: 'insensitive' } },
      orderBy: { username: 'asc' },
    });
    return users.map(UserMapper.toDomain);
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- --testPathPattern="infrastructure/persistence/prisma/__tests__/user.repository"
```
Expected: PASS — 7 tests passing.

**Step 5: Commit**

```bash
git add src/infrastructure/persistence/prisma/user.repository.ts src/infrastructure/persistence/prisma/__tests__/
git commit -m "feat: add PrismaUserRepository implementing IUserRepository"
```

---

### Task 4: Create PersistenceModule

**Files:**
- Create: `src/infrastructure/persistence/prisma/prisma-persistence.module.ts`

This NestJS module binds `PrismaUserRepository` to the `USER_REPOSITORY` DI token and exports it so feature modules can inject the repository without knowing the concrete class.

Note: `DatabaseModule` is `@Global()` so `PrismaService` is available without importing it here.

**Step 1: Create the module**

```typescript
// src/infrastructure/persistence/prisma/prisma-persistence.module.ts
import { Module } from '@nestjs/common';
import { PrismaUserRepository } from './user.repository';
import { USER_REPOSITORY } from '../../../domain/user/user.repository.port';

@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class PrismaPersistenceModule {}
```

**Step 2: Build to verify**

```bash
npm run build
```
Expected: no errors.

**Step 3: Commit**

```bash
git add src/infrastructure/persistence/prisma/prisma-persistence.module.ts
git commit -m "feat: add PrismaPersistenceModule binding repository to DI token"
```

---

### Task 5: Relocate auth module and update AuthService

**Files:**
- Create: `src/modules/auth/` (new location for all auth files)
- Delete: `src/routes/auth/` (after migration complete)

Move all files from `src/routes/auth/` to `src/modules/auth/`. Update `AuthService` to inject `IUserRepository` via the DI token instead of `AuthRepository`.

**Step 1: Create the directory structure and move files**

```bash
mkdir -p src/modules/auth/guards src/modules/auth/strategies src/modules/auth/dto
cp src/routes/auth/auth.controller.ts src/modules/auth/auth.controller.ts
cp src/routes/auth/dto/login.dto.ts src/modules/auth/dto/login.dto.ts
cp src/routes/auth/guards/jwt-auth.guard.ts src/modules/auth/guards/jwt-auth.guard.ts
cp src/routes/auth/strategies/bcrypt.strategy.ts src/modules/auth/strategies/bcrypt.strategy.ts
cp src/routes/auth/strategies/jwt.strategy.ts src/modules/auth/strategies/jwt.strategy.ts
```

**Step 2: Write updated `auth.service.ts`**

```typescript
// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/user/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/user/user.repository.port';
import { BcryptStrategy } from './strategies/bcrypt.strategy';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly bcryptStrategy: BcryptStrategy,
    private readonly jwtService: JwtService,
  ) {}

  async loginUser(credentials: LoginDto): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findByEmail(credentials.email);
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

    const updatedUser = await this.userRepository.updateLastLogin(user.id);

    const token = this.jwtService.sign({
      sub: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
    });

    return { user: updatedUser, token };
  }
}
```

**Step 3: Write updated `auth.module.ts`**

```typescript
// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptStrategy } from './strategies/bcrypt.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AppConfigService } from '../../shared/config/app-config.service';
import { PrismaPersistenceModule } from '../../infrastructure/persistence/prisma/prisma-persistence.module';

@Module({
  imports: [
    PrismaPersistenceModule,
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
  providers: [
    AuthService,
    {
      provide: BcryptStrategy,
      useFactory: (config: AppConfigService) => new BcryptStrategy(config.saltRounds),
      inject: [AppConfigService],
    },
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard, JwtModule, BcryptStrategy],
})
export class AuthModule {}
```

**Step 4: Fix import paths in copied files**

Update `src/modules/auth/auth.controller.ts` — change:
```typescript
// old
import { AuthService } from './auth.service';
// stays the same (same relative location), but verify other imports:
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // correct
```

Update `src/modules/auth/strategies/jwt.strategy.ts` — fix any path to shared/config:
```typescript
// old path (from routes/auth/strategies/)
import { AppConfigService } from '../../../shared/config/app-config.service';
// new path (from modules/auth/strategies/)
import { AppConfigService } from '../../../shared/config/app-config.service';
// same depth — no change needed
```

**Step 5: Build to verify**

```bash
npm run build
```
Expected: no errors from the new modules/auth/ files.

**Step 6: Commit**

```bash
git add src/modules/auth/
git commit -m "feat: relocate auth module and update AuthService to inject IUserRepository"
```

---

### Task 6: Relocate user module and update UserService

**Files:**
- Create: `src/modules/user/` (new location)
- Delete: `src/routes/user/` (after migration complete)

**Step 1: Create directory structure and copy files**

```bash
mkdir -p src/modules/user/dto src/modules/user/utils/__tests__
cp src/routes/user/dto/register-user.dto.ts src/modules/user/dto/register-user.dto.ts
cp src/routes/user/dto/update-user-profile.dto.ts src/modules/user/dto/update-user-profile.dto.ts
cp src/routes/user/utils/username-suggestions.util.ts src/modules/user/utils/username-suggestions.util.ts
cp src/routes/user/utils/validation.util.ts src/modules/user/utils/validation.util.ts
cp src/routes/user/utils/__tests__/username-suggestions.util.test.ts src/modules/user/utils/__tests__/username-suggestions.util.test.ts
cp src/routes/user/user.controller.ts src/modules/user/user.controller.ts
```

**Step 2: Write updated `user.service.ts`**

```typescript
// src/modules/user/user.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/user/user.entity';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/user/user.repository.port';
import { BcryptStrategy } from '../auth/strategies/bcrypt.strategy';
import { UsernameSuggestionsUtil } from './utils/username-suggestions.util';
import { ValidationUtil } from './utils/validation.util';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
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

**Step 3: Write `user.module.ts`**

```typescript
// src/modules/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UsernameSuggestionsUtil } from './utils/username-suggestions.util';
import { AuthModule } from '../auth/auth.module';
import { PrismaPersistenceModule } from '../../infrastructure/persistence/prisma/prisma-persistence.module';

@Module({
  imports: [PrismaPersistenceModule, AuthModule],
  controllers: [UserController],
  providers: [UserService, UsernameSuggestionsUtil],
})
export class UserModule {}
```

**Step 4: Fix import paths in `username-suggestions.util.ts`**

Open `src/modules/user/utils/username-suggestions.util.ts` and check if it imports `UserRepository`. It will — update it to use `IUserRepository`:

```typescript
// replace:
import { UserRepository } from '../user.repository';
// with:
import { IUserRepository } from '../../../domain/user/user.repository.port';
```

Update the constructor to use `IUserRepository` type. If the util is provided directly (not injected as a port), keep it injecting `UserRepository` concretely but note this is a follow-up refactor. Check the actual file and handle accordingly.

**Step 5: Build to verify**

```bash
npm run build
```
Expected: no errors.

**Step 6: Commit**

```bash
git add src/modules/user/
git commit -m "feat: relocate user module and update UserService to inject IUserRepository"
```

---

### Task 7: Update app.module.ts

**Files:**
- Modify: `src/app.module.ts`

**Step 1: Update imports**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from './shared/shared.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TerminusModule,
    DatabaseModule,
    SharedModule,
    HealthModule,
    AuthModule,
    UserModule,
  ],
})
export class AppModule {}
```

**Step 2: Build to verify the full app compiles**

```bash
npm run build
```
Expected: no errors.

**Step 3: Commit**

```bash
git add src/app.module.ts
git commit -m "chore: update app.module.ts to import from modules/ instead of routes/"
```

---

### Task 8: Update auth service test

**Files:**
- Create: `src/modules/auth/__tests__/auth.service.test.ts`

Replace the mock of `AuthRepository` with a mock of `IUserRepository`. The test logic stays identical — only imports and mock construction change.

**Step 1: Write the updated test**

```typescript
// src/modules/auth/__tests__/auth.service.test.ts
import { AuthService } from '../auth.service';
import { IUserRepository } from '../../../domain/user/user.repository.port';
import { User } from '../../../domain/user/user.entity';
import { BcryptStrategy } from '../strategies/bcrypt.strategy';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

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
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockBcryptStrategy: jest.Mocked<BcryptStrategy>;
  let mockJwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByGoogleId: jest.fn(),
      createUser: jest.fn(),
      updateProfile: jest.fn(),
      updateLastLogin: jest.fn(),
      linkGoogleAccount: jest.fn(),
      isEmailTaken: jest.fn(),
      isUsernameTaken: jest.fn(),
      findUsersByUsernamePrefix: jest.fn(),
    };

    mockBcryptStrategy = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<BcryptStrategy>;

    mockJwtService = {
      sign: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    authService = new AuthService(mockUserRepository, mockBcryptStrategy, mockJwtService);
  });

  describe('loginUser', () => {
    const credentials = { email: 'test@example.com', password: 'password123' };

    it('should login successfully with valid credentials', async () => {
      const updatedUser = { ...mockUser, lastLoginAt: new Date() };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcryptStrategy.verify.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue(updatedUser);
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await authService.loginUser(credentials);

      expect(result.token).toBe('mock-token');
      expect(result.user).toEqual(updatedUser);
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      await expect(authService.loginUser(credentials)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when passwordHash is null', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: null });
      await expect(authService.loginUser(credentials)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcryptStrategy.verify.mockResolvedValue(false);
      await expect(authService.loginUser(credentials)).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

**Step 2: Run to verify it passes**

```bash
npm run test:unit -- --testPathPattern="modules/auth/__tests__/auth.service"
```
Expected: PASS — 4 tests passing.

**Step 3: Commit**

```bash
git add src/modules/auth/__tests__/
git commit -m "test: update auth service test to use IUserRepository mock"
```

---

### Task 9: Update user service test

**Files:**
- Create: `src/modules/user/__tests__/user.service.test.ts`

**Step 1: Write the updated test**

```typescript
// src/modules/user/__tests__/user.service.test.ts
import { UserService } from '../user.service';
import { IUserRepository } from '../../../domain/user/user.repository.port';
import { User } from '../../../domain/user/user.entity';
import { BcryptStrategy } from '../../auth/strategies/bcrypt.strategy';
import { JwtService } from '@nestjs/jwt';
import { UsernameSuggestionsUtil } from '../utils/username-suggestions.util';
import { ConflictException, NotFoundException } from '@nestjs/common';

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
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockBcryptStrategy: jest.Mocked<BcryptStrategy>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockSuggestionsUtil: jest.Mocked<UsernameSuggestionsUtil>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByGoogleId: jest.fn(),
      createUser: jest.fn(),
      updateProfile: jest.fn(),
      updateLastLogin: jest.fn(),
      linkGoogleAccount: jest.fn(),
      isEmailTaken: jest.fn(),
      isUsernameTaken: jest.fn(),
      findUsersByUsernamePrefix: jest.fn(),
    };

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
      mockSuggestionsUtil,
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

**Step 2: Run to verify it passes**

```bash
npm run test:unit -- --testPathPattern="modules/user/__tests__/user.service"
```
Expected: PASS — 5 tests passing.

**Step 3: Commit**

```bash
git add src/modules/user/__tests__/
git commit -m "test: update user service test to use IUserRepository mock"
```

---

### Task 10: Delete src/routes/ and run full verification

All files have been migrated. Now remove the old directory and run the full validation sequence from CLAUDE.md.

**Step 1: Delete routes/**

```bash
rm -rf src/routes/
```

**Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors. If there are import errors pointing to `routes/`, you missed updating a file — fix the import and re-run.

**Step 3: Build**

```bash
npm run build
```
Expected: clean compile.

**Step 4: Run unit tests**

```bash
npm run test:unit
```
Expected: all tests pass. Check that old test files in `routes/` are gone and new tests in `modules/` and `infrastructure/` run correctly.

**Step 5: Run integration tests**

```bash
npm run test:int
```
Expected: all integration tests pass. These tests hit a real database via Testcontainers — if they fail, check that `PrismaUserRepository` methods match what the integration tests call.

**Step 6: Format**

```bash
npm run format
```

**Step 7: Final commit**

```bash
git add -A
git commit -m "chore: remove src/routes/ — fully migrated to modules/ and infrastructure/"
```

---

## Verification Checklist

After Task 10, confirm:

- [ ] `src/routes/` directory is gone
- [ ] `src/domain/user/` exists with `user.entity.ts` and `user.repository.port.ts`
- [ ] `src/infrastructure/persistence/prisma/` exists with `user.repository.ts`, `prisma-persistence.module.ts`, and `mappers/user.mapper.ts`
- [ ] `src/modules/auth/` and `src/modules/user/` exist with all files
- [ ] No file outside `src/infrastructure/` imports `User` from `@prisma/client`
- [ ] `npm run build` passes
- [ ] `npm run test:unit` passes
- [ ] `npm run test:int` passes
