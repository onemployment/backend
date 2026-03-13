# Clean Up Test Mock Casts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all `as unknown as jest.Mocked<X>` double-casts from the test suite by introducing an `IPasswordStrategy` domain port and using `jest-mock-extended`'s `mock<T>()` where appropriate.

**Architecture:** `IPasswordStrategy` joins `IUserRepository` as a domain port — services depend on the interface, not the `BcryptStrategy` class. Tests for interfaces use plain object literals (no cast needed). Tests for concrete classes use `mock<T>()` from `jest-mock-extended` (already installed). The `IUserRepository` cast in `username-suggestions.util.test.ts` is removed since it's already an interface.

**Tech Stack:** NestJS, TypeScript, Jest, jest-mock-extended (`mock<T>()`)

---

### Task 1: Create IPasswordStrategy port

**Files:**

- Create: `src/domain/auth/password-strategy.port.ts`

Pure TypeScript — no NestJS decorators, no imports from other files.

**Step 1: Create the file**

```typescript
// src/domain/auth/password-strategy.port.ts

export const PASSWORD_STRATEGY = Symbol('IPasswordStrategy');

export interface IPasswordStrategy {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/domain/auth/password-strategy.port.ts
git commit -m "feat: add IPasswordStrategy domain port"
```

---

### Task 2: Update AuthModule to bind PASSWORD_STRATEGY token

**Files:**

- Modify: `src/modules/auth/auth.module.ts`

Replace the `BcryptStrategy` provider token with `PASSWORD_STRATEGY`. Export the token so `UserModule` (which imports `AuthModule`) can inject it.

**Step 1: Read the current file**

```bash
# read src/modules/auth/auth.module.ts before editing
```

**Step 2: Write the updated module**

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
import { PASSWORD_STRATEGY } from '../../domain/auth/password-strategy.port';

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
      provide: PASSWORD_STRATEGY,
      useFactory: (config: AppConfigService) =>
        new BcryptStrategy(config.saltRounds),
      inject: [AppConfigService],
    },
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard, JwtModule, PASSWORD_STRATEGY],
})
export class AuthModule {}
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. (AuthService will show an error if it still injects `BcryptStrategy` — that's fine, fix it in Task 3.)

**Step 4: Commit**

```bash
git add src/modules/auth/auth.module.ts
git commit -m "feat: bind BcryptStrategy to PASSWORD_STRATEGY DI token in AuthModule"
```

---

### Task 3: Update AuthService to inject IPasswordStrategy

**Files:**

- Modify: `src/modules/auth/auth.service.ts`

**Step 1: Write the updated service**

The only changes are: remove `BcryptStrategy` import, add `IPasswordStrategy`/`PASSWORD_STRATEGY` import, add `@Inject(PASSWORD_STRATEGY)` decorator, rename `bcryptStrategy` → `passwordStrategy`.

```typescript
// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/user/user.entity';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/user/user.repository.port';
import {
  IPasswordStrategy,
  PASSWORD_STRATEGY,
} from '../../domain/auth/password-strategy.port';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_STRATEGY)
    private readonly passwordStrategy: IPasswordStrategy,
    private readonly jwtService: JwtService
  ) {}

  async loginUser(
    credentials: LoginDto
  ): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await this.passwordStrategy.verify(
      credentials.password,
      user.passwordHash
    );
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

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/modules/auth/auth.service.ts
git commit -m "feat: update AuthService to inject IPasswordStrategy port"
```

---

### Task 4: Update UserService to inject IPasswordStrategy

**Files:**

- Modify: `src/modules/user/user.service.ts`

`UserModule` imports `AuthModule`, which now exports `PASSWORD_STRATEGY` — so the token is already available in `UserModule`'s DI container.

**Step 1: Write the updated service**

Replace the `BcryptStrategy` import and injection with `IPasswordStrategy`:

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
import {
  IPasswordStrategy,
  PASSWORD_STRATEGY,
} from '../../domain/auth/password-strategy.port';
import { UsernameSuggestionsUtil } from './utils/username-suggestions.util';
import { ValidationUtil } from './utils/validation.util';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_STRATEGY)
    private readonly passwordStrategy: IPasswordStrategy,
    private readonly jwtService: JwtService,
    private readonly usernameSuggestionsUtil: UsernameSuggestionsUtil
  ) {}

  async registerUser(
    data: RegisterUserDto
  ): Promise<{ user: User; token: string }> {
    if (ValidationUtil.isReservedUsername(data.username)) {
      throw new BadRequestException('Username is reserved and cannot be used');
    }

    if (await this.userRepository.isEmailTaken(data.email)) {
      throw new ConflictException(
        'Email already registered. Please sign in instead'
      );
    }

    if (await this.userRepository.isUsernameTaken(data.username)) {
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await this.passwordStrategy.hash(data.password);
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

  async updateUserProfile(
    userId: string,
    updates: UpdateUserProfileDto
  ): Promise<User> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) throw new NotFoundException('User not found');

    const sanitized: UpdateUserProfileDto = {};
    if (updates.firstName !== undefined)
      sanitized.firstName = ValidationUtil.sanitizeName(updates.firstName);
    if (updates.lastName !== undefined)
      sanitized.lastName = ValidationUtil.sanitizeName(updates.lastName);
    if (updates.displayName !== undefined) {
      sanitized.displayName = updates.displayName
        ? ValidationUtil.sanitizeName(updates.displayName)
        : updates.displayName;
    }

    return this.userRepository.updateProfile(userId, sanitized);
  }

  async validateUsername(
    username: string
  ): Promise<{ available: boolean; suggestions?: string[] }> {
    if (
      !ValidationUtil.validateUsername(username) ||
      ValidationUtil.isReservedUsername(username)
    ) {
      return {
        available: false,
        suggestions:
          await this.usernameSuggestionsUtil.generateSuggestions(username),
      };
    }

    const available =
      await this.usernameSuggestionsUtil.isUsernameAvailable(username);
    if (!available) {
      return {
        available: false,
        suggestions:
          await this.usernameSuggestionsUtil.generateSuggestions(username),
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

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Run unit tests to verify nothing broke**

```bash
npm run test:unit
```

Expected: all tests pass (tests still reference `BcryptStrategy` — that's fine until Task 5).

**Step 4: Commit**

```bash
git add src/modules/user/user.service.ts
git commit -m "feat: update UserService to inject IPasswordStrategy port"
```

---

### Task 5: Clean up all test casts

**Files:**

- Modify: `src/modules/auth/__tests__/auth.service.test.ts`
- Modify: `src/modules/user/__tests__/user.service.test.ts`
- Modify: `src/modules/user/utils/__tests__/username-suggestions.util.test.ts`

Three different fixes:

- `IPasswordStrategy` — plain object literal, no cast (it's an interface)
- `JwtService` and `UsernameSuggestionsUtil` — use `mock<T>()` from `jest-mock-extended`
- `IUserRepository` in `username-suggestions.util.test.ts` — remove cast (already an interface)

**Step 1: Write updated `auth.service.test.ts`**

```typescript
// src/modules/auth/__tests__/auth.service.test.ts
import { mock } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { IUserRepository } from '../../../domain/user/user.repository.port';
import { IPasswordStrategy } from '../../../domain/auth/password-strategy.port';
import { User } from '../../../domain/user/user.entity';

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
  let mockPasswordStrategy: jest.Mocked<IPasswordStrategy>;
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

    mockPasswordStrategy = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    mockJwtService = mock<JwtService>();

    authService = new AuthService(
      mockUserRepository,
      mockPasswordStrategy,
      mockJwtService
    );
  });

  describe('loginUser', () => {
    const credentials = { email: 'test@example.com', password: 'password123' };

    it('should login successfully with valid credentials', async () => {
      const updatedUser = { ...mockUser, lastLoginAt: new Date() };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordStrategy.verify.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue(updatedUser);
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await authService.loginUser(credentials);

      expect(result.token).toBe('mock-token');
      expect(result.user).toEqual(updatedUser);
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(
        mockUser.id
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      await expect(authService.loginUser(credentials)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when passwordHash is null', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });
      await expect(authService.loginUser(credentials)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordStrategy.verify.mockResolvedValue(false);
      await expect(authService.loginUser(credentials)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
```

**Step 2: Write updated `user.service.test.ts`**

```typescript
// src/modules/user/__tests__/user.service.test.ts
import { mock } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from '../user.service';
import { IUserRepository } from '../../../domain/user/user.repository.port';
import { IPasswordStrategy } from '../../../domain/auth/password-strategy.port';
import { User } from '../../../domain/user/user.entity';
import { UsernameSuggestionsUtil } from '../utils/username-suggestions.util';

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
  let mockPasswordStrategy: jest.Mocked<IPasswordStrategy>;
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

    mockPasswordStrategy = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    mockJwtService = mock<JwtService>();
    mockSuggestionsUtil = mock<UsernameSuggestionsUtil>();

    userService = new UserService(
      mockUserRepository,
      mockPasswordStrategy,
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
      mockPasswordStrategy.hash.mockResolvedValue('hashed');
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');

      const result = await userService.registerUser(validData);
      expect(result.token).toBe('token');
      expect(result.user).toEqual(mockUser);
    });

    it('should throw ConflictException when email is taken', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(true);
      await expect(userService.registerUser(validData)).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw ConflictException when username is taken', async () => {
      mockUserRepository.isEmailTaken.mockResolvedValue(false);
      mockUserRepository.isUsernameTaken.mockResolvedValue(true);
      await expect(userService.registerUser(validData)).rejects.toThrow(
        ConflictException
      );
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
      await expect(userService.getUserProfile('bad-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
```

**Step 3: Write updated `username-suggestions.util.test.ts`**

Only change: remove `as unknown as` from the `IUserRepository` mock — it's already an interface.

```typescript
// src/modules/user/utils/__tests__/username-suggestions.util.test.ts
import { UsernameSuggestionsUtil } from '../username-suggestions.util';
import { IUserRepository } from '../../../../domain/user/user.repository.port';

describe('UsernameSuggestionsUtil', () => {
  let util: UsernameSuggestionsUtil;
  let mockRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepository = {
      isUsernameTaken: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    util = new UsernameSuggestionsUtil(mockRepository);
  });

  it('should generate available suggestions', async () => {
    mockRepository.isUsernameTaken.mockResolvedValueOnce(true);
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false);
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false);
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false);

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

**Step 4: Run unit tests**

```bash
npm run test:unit
```

Expected: all 20 tests pass, zero casts in test files.

**Step 5: Verify no casts remain**

```bash
grep -r "as unknown as jest.Mocked" src/ --include="*.ts"
```

Expected: no output.

**Step 6: Commit**

```bash
git add src/modules/auth/__tests__/ src/modules/user/__tests__/ src/modules/user/utils/__tests__/
git commit -m "test: remove double-casts — use IPasswordStrategy interface and mock<T>() from jest-mock-extended"
```

---

### Task 6: Full verification

**Step 1: Run lint**

```bash
npm run lint
```

**Step 2: Build**

```bash
npx tsc --noEmit
```

**Step 3: Unit tests**

```bash
npm run test:unit
```

**Step 4: Integration tests**

```bash
npm run test:int
```

**Step 5: Format**

```bash
npm run format
```

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: format after mock cleanup"
```

(Skip if format produces no changes.)
