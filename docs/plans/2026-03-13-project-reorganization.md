# Project Reorganization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tidy up the project structure into a clean, consistent DDD/hexagonal architecture baseline before adding new features.

**Architecture:** `domain/` for business concepts only, `modules/<feature>/` for API + service layer, `infrastructure/` for technical implementations (persistence, security), `shared/` for cross-cutting concerns.

**Tech Stack:** NestJS, TypeScript, Prisma, Passport/JWT, bcrypt

---

### Task 1: Move `IPasswordStrategy` → `IPasswordHashStrategy` into `src/modules/auth/ports/`

The interface currently lives in `src/domain/auth/` which is wrong — it's not a business domain concept, it's a technical interface for testability. Rename it to `IPasswordHashStrategy` and move it next to the auth module that owns it.

**Files:**
- Create: `src/modules/auth/ports/password-hash-strategy.port.ts`
- Modify: `src/modules/auth/auth.service.ts`
- Modify: `src/modules/auth/auth.module.ts`
- Modify: `src/modules/auth/__tests__/auth.service.test.ts`
- Modify: `src/modules/user/user.service.ts`
- Modify: `src/modules/user/__tests__/user.service.test.ts`
- Delete: `src/domain/auth/password-strategy.port.ts` (and the `src/domain/auth/` directory)

**Step 1: Create the new port file**

```typescript
// src/modules/auth/ports/password-hash-strategy.port.ts
export const PASSWORD_STRATEGY = Symbol('IPasswordHashStrategy');

export interface IPasswordHashStrategy {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
```

**Step 2: Update `auth.service.ts` imports**

Replace:
```typescript
import {
  IPasswordStrategy,
  PASSWORD_STRATEGY,
} from '../../domain/auth/password-strategy.port';
```
With:
```typescript
import {
  IPasswordHashStrategy,
  PASSWORD_STRATEGY,
} from './ports/password-hash-strategy.port';
```

Also rename the type annotation in the constructor:
```typescript
@Inject(PASSWORD_STRATEGY)
private readonly passwordStrategy: IPasswordHashStrategy,
```

**Step 3: Update `auth.module.ts` imports**

Replace:
```typescript
import { PASSWORD_STRATEGY } from '../../domain/auth/password-strategy.port';
```
With:
```typescript
import { PASSWORD_STRATEGY } from './ports/password-hash-strategy.port';
```

**Step 4: Update `auth.service.test.ts` imports**

Replace:
```typescript
import { IPasswordStrategy } from '../../../domain/auth/password-strategy.port';
```
With:
```typescript
import { IPasswordHashStrategy } from '../ports/password-hash-strategy.port';
```

Also update the type:
```typescript
let mockPasswordStrategy: jest.Mocked<IPasswordHashStrategy>;
```

And the mock object (add the `hash` mock that was implicit):
```typescript
mockPasswordStrategy = {
  hash: jest.fn(),
  verify: jest.fn(),
};
```

**Step 5: Update `user.service.ts` imports**

Replace:
```typescript
import {
  IPasswordStrategy,
  PASSWORD_STRATEGY,
} from '../../domain/auth/password-strategy.port';
```
With:
```typescript
import {
  IPasswordHashStrategy,
  PASSWORD_STRATEGY,
} from '../auth/ports/password-hash-strategy.port';
```

Also rename the constructor type annotation:
```typescript
@Inject(PASSWORD_STRATEGY)
private readonly passwordStrategy: IPasswordHashStrategy,
```

**Step 6: Update `user.service.test.ts` imports**

Replace:
```typescript
import { IPasswordStrategy } from '../../../domain/auth/password-strategy.port';
```
With:
```typescript
import { IPasswordHashStrategy } from '../../auth/ports/password-hash-strategy.port';
```

Update the type:
```typescript
let mockPasswordStrategy: jest.Mocked<IPasswordHashStrategy>;
```

**Step 7: Run unit tests to verify nothing broke**

```bash
npm run test:unit
```
Expected: all tests pass

**Step 8: Delete the old domain/auth directory**

```bash
rm -rf src/domain/auth
```

**Step 9: Run build and tests again to confirm clean state**

```bash
npm run build && npm run test:unit
```
Expected: compiles cleanly, all tests pass

**Step 10: Commit**

```bash
git add src/modules/auth/ports/password-hash-strategy.port.ts \
  src/modules/auth/auth.service.ts \
  src/modules/auth/auth.module.ts \
  src/modules/auth/__tests__/auth.service.test.ts \
  src/modules/user/user.service.ts \
  src/modules/user/__tests__/user.service.test.ts
git rm src/domain/auth/password-strategy.port.ts
git commit -m "refactor: move IPasswordHashStrategy port to modules/auth/ports"
```

---

### Task 2: Move strategies to `src/infrastructure/security/`

`BcryptStrategy` and `JwtStrategy` are infrastructure implementations, not application logic. They belong in `infrastructure/security/`.

**Files:**
- Create: `src/infrastructure/security/bcrypt.strategy.ts`
- Create: `src/infrastructure/security/jwt.strategy.ts`
- Modify: `src/modules/auth/auth.module.ts`
- Delete: `src/modules/auth/strategies/bcrypt.strategy.ts`
- Delete: `src/modules/auth/strategies/jwt.strategy.ts`
- Delete: `src/modules/auth/strategies/` directory

**Step 1: Create `src/infrastructure/security/bcrypt.strategy.ts`**

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

**Step 2: Create `src/infrastructure/security/jwt.strategy.ts`**

```typescript
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

**Step 3: Update `auth.module.ts` strategy imports**

Replace:
```typescript
import { BcryptStrategy } from './strategies/bcrypt.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
```
With:
```typescript
import { BcryptStrategy } from '../../infrastructure/security/bcrypt.strategy';
import { JwtStrategy } from '../../infrastructure/security/jwt.strategy';
```

**Step 4: Run build and unit tests**

```bash
npm run build && npm run test:unit
```
Expected: compiles cleanly, all tests pass

**Step 5: Delete the old strategies directory**

```bash
rm -rf src/modules/auth/strategies
```

**Step 6: Run build and tests again to confirm**

```bash
npm run build && npm run test:unit
```
Expected: compiles cleanly, all tests pass

**Step 7: Commit**

```bash
git add src/infrastructure/security/bcrypt.strategy.ts \
  src/infrastructure/security/jwt.strategy.ts \
  src/modules/auth/auth.module.ts
git rm src/modules/auth/strategies/bcrypt.strategy.ts \
  src/modules/auth/strategies/jwt.strategy.ts
git commit -m "refactor: move BcryptStrategy and JwtStrategy to infrastructure/security"
```

---

### Task 3: Merge `DatabaseModule` + `PrismaPersistenceModule` → `PrismaModule`, rename `prisma.service.ts` → `prisma.client.ts`

Two modules currently serve the same Prisma infrastructure concern. Merge them into a single `PrismaModule`. The `PrismaService` file moves from `src/database/` to `src/infrastructure/persistence/prisma/` and is renamed `prisma.client.ts` (class name stays `PrismaService`).

**Files:**
- Create: `src/infrastructure/persistence/prisma/prisma.client.ts`
- Modify: `src/infrastructure/persistence/prisma/prisma.module.ts` (was `prisma-persistence.module.ts`)
- Modify: `src/infrastructure/persistence/prisma/user.repository.ts`
- Modify: `src/infrastructure/persistence/prisma/__tests__/user.repository.test.ts`
- Modify: `src/modules/auth/auth.module.ts`
- Modify: `src/modules/user/user.module.ts`
- Modify: `src/app.module.ts`
- Delete: `src/database/database.module.ts`
- Delete: `src/database/prisma.service.ts`
- Delete: `src/infrastructure/persistence/prisma/prisma-persistence.module.ts`

**Step 1: Create `prisma.client.ts`** (copy of `database/prisma.service.ts` with updated import path)

```typescript
// src/infrastructure/persistence/prisma/prisma.client.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '../../../shared/logger/logger.service';

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
      this.logger.error(
        'Failed to connect to PostgreSQL database',
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL database');
  }
}
```

**Step 2: Rewrite `prisma.module.ts`** (merges `DatabaseModule` + `PrismaPersistenceModule`)

```typescript
// src/infrastructure/persistence/prisma/prisma.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.client';
import { PrismaUserRepository } from './user.repository';
import { USER_REPOSITORY } from '../../../domain/user/user.repository.port';

@Module({
  providers: [
    PrismaService,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class PrismaModule {}
```

**Step 3: Update `user.repository.ts` import for `PrismaService`**

Replace:
```typescript
import { PrismaService } from '../../../database/prisma.service';
```
With:
```typescript
import { PrismaService } from './prisma.client';
```

**Step 4: Update `user.repository.test.ts` import for `PrismaService`**

Replace:
```typescript
import { PrismaService } from '../../../../database/prisma.service';
```
With:
```typescript
import { PrismaService } from '../prisma.client';
```

(Check the actual current import path in the file before making this change.)

**Step 5: Update `auth.module.ts`**

Replace:
```typescript
import { PrismaPersistenceModule } from '../../infrastructure/persistence/prisma/prisma-persistence.module';
```
With:
```typescript
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';
```

And in `@Module` imports:
```typescript
imports: [
  PrismaModule,
  PassportModule,
  JwtModule.registerAsync({ ... }),
],
```

**Step 6: Update `user.module.ts`**

Replace:
```typescript
import { PrismaPersistenceModule } from '../../infrastructure/persistence/prisma/prisma-persistence.module';
```
With:
```typescript
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';
```

And in `@Module` imports:
```typescript
imports: [PrismaModule, AuthModule],
```

**Step 7: Update `app.module.ts`** — remove `DatabaseModule`

Replace:
```typescript
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
```
With nothing (these lines are removed). Also remove `TerminusModule`, `DatabaseModule`, and `HealthModule` from the `imports` array. Keep `ConfigModule`, `SharedModule`, `AuthModule`, `UserModule`.

> Note: Health endpoint is addressed in Task 4. For now `app.module.ts` will temporarily have no health route — that's fine since we're not running integration tests yet.

**Step 8: Run build and unit tests**

```bash
npm run build && npm run test:unit
```
Expected: compiles cleanly, all tests pass

**Step 9: Delete old files**

```bash
rm -rf src/database
rm src/infrastructure/persistence/prisma/prisma-persistence.module.ts
```

**Step 10: Run build and tests again**

```bash
npm run build && npm run test:unit
```
Expected: compiles cleanly, all tests pass

**Step 11: Commit**

```bash
git add src/infrastructure/persistence/prisma/prisma.client.ts \
  src/infrastructure/persistence/prisma/prisma.module.ts \
  src/infrastructure/persistence/prisma/user.repository.ts \
  src/infrastructure/persistence/prisma/__tests__/user.repository.test.ts \
  src/modules/auth/auth.module.ts \
  src/modules/user/user.module.ts \
  src/app.module.ts
git rm src/database/database.module.ts \
  src/database/prisma.service.ts \
  src/infrastructure/persistence/prisma/prisma-persistence.module.ts
git commit -m "refactor: merge DatabaseModule + PrismaPersistenceModule into PrismaModule"
```

---

### Task 4: Remove health module, add simple health endpoint

`TerminusModule`, `PrismaHealthIndicator`, and `HealthModule` are overkill. Replace with a simple `GET /health` that returns `200 { status: 'ok' }` — enough for the ALB health check.

**Files:**
- Create: `src/health.controller.ts`
- Modify: `src/app.module.ts`
- Delete: `src/health/` directory

**Step 1: Create `src/health.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

**Step 2: Update `app.module.ts`** to register `HealthController` and remove all health/terminus imports

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SharedModule,
    AuthModule,
    UserModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

**Step 3: Run build and unit tests**

```bash
npm run build && npm run test:unit
```
Expected: compiles cleanly, all tests pass

**Step 4: Delete the health directory**

```bash
rm -rf src/health
```

**Step 5: Uninstall `@nestjs/terminus`**

```bash
npm uninstall @nestjs/terminus
```

**Step 6: Run build and full test suite**

```bash
npm run build && npm run test:unit && npm run test:int
```
Expected: compiles cleanly, all tests pass including integration tests

**Step 7: Lint and format**

```bash
npm run lint && npm run format
```
Fix any lint issues, then re-run lint to confirm clean.

**Step 8: Commit**

```bash
git add src/health.controller.ts src/app.module.ts package.json package-lock.json
git rm src/health/health.module.ts \
  src/health/health.controller.ts \
  src/health/indicators/prisma-health.indicator.ts
git commit -m "refactor: replace HealthModule with simple GET /health endpoint"
```

---

## Validation

After all tasks are complete, run the full validation sequence:

```bash
npm run lint
npm run build
npm run test:unit
npm run test:int
```

All four must pass before considering this work done.
