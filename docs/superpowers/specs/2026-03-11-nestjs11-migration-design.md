# NestJS 11 Migration Design

**Date:** 2026-03-11
**Status:** Approved

## Summary

Full replacement of the Express.js API with NestJS 11. The existing layered architecture (Controller → Service → Repository) and interface contracts are preserved. Zod schemas are replaced with class-validator DTOs. A custom JWT guard (using the existing `JWTUtil`) replaces Express JWT middleware. Migration proceeds module-by-module (auth first, then user) to keep tests green at each step.

---

## Goals

- Replace Express with NestJS 11 as the sole HTTP framework
- Preserve all existing API contracts (routes, request/response shapes, status codes)
- Preserve the interface contract pattern for service and repository layers
- Replace Zod validation with class-validator DTOs
- Implement a custom `JwtAuthGuard` that delegates to the existing `JWTUtil.validateToken()`
- Upgrade all NestJS packages from v10 to v11

## Non-Goals

- Adding Passport.js (deferred to future)
- Adding new API endpoints
- Changing the database schema or Prisma setup
- Changing the AWS deployment infrastructure

---

## Approach

**Module-by-module migration:** Migrate `auth` first (foundational, required by JWT guard), then `user`, then remove the Express entrypoint and dead code. Tests remain green after each module.

---

## Folder Structure

Changes from current state:

```
src/
├── api/
│   ├── auth/
│   │   ├── contracts/           (kept — update imports to point to DTOs, not schema)
│   │   │   ├── auth.service.contract.ts   (updated — import LoginDto instead of LoginRequest)
│   │   │   └── auth.repository.contract.ts (kept as-is)
│   │   ├── strategies/          (kept — BcryptStrategy, IPasswordStrategy)
│   │   ├── utils/               (kept — JWTUtil; reads process.env directly, no change)
│   │   ├── dto/                 NEW — replaces auth.schema.ts
│   │   │   └── login.dto.ts
│   │   ├── auth.controller.ts   REWRITTEN — NestJS @Controller
│   │   ├── auth.service.ts      UPDATED — add @Injectable, import LoginDto
│   │   ├── auth.repository.ts   UPDATED — add @Injectable, inject PrismaService
│   │   ├── auth.module.ts       NEW
│   │   └── index.ts             DELETED (Express router)
│   └── user/
│       ├── contracts/           (kept — update imports to point to DTOs, not schema)
│       │   ├── user.service.contract.ts   (updated — import DTOs instead of Zod types)
│       │   └── user.repository.contract.ts (kept as-is)
│       ├── utils/               (kept — UsernameSuggestionsUtil, ValidationUtil)
│       ├── dto/                 NEW — replaces user.schema.ts
│       │   ├── register-user.dto.ts
│       │   └── update-profile.dto.ts
│       ├── user.controller.ts   REWRITTEN — NestJS @Controller
│       ├── user.service.ts      UPDATED — add @Injectable, import DTOs
│       ├── user.repository.ts   UPDATED — add @Injectable, inject PrismaService
│       ├── user.module.ts       NEW
│       └── index.ts             DELETED (Express router)
├── shared/
│   ├── guards/                  NEW
│   │   └── jwt-auth.guard.ts
│   ├── decorators/              NEW
│   │   └── current-user.decorator.ts
│   ├── filters/                 (kept — GlobalExceptionFilter)
│   ├── logger/                  (kept — LoggerService)
│   ├── config/                  (kept — AppConfigService, ConfigModule)
│   └── shared.module.ts         UPDATED — add JWTUtil, BcryptStrategy, JwtAuthGuard
├── app.module.ts                UPDATED — import AuthModule, UserModule
├── main.ts                      (kept — already correct for NestJS)
├── database/                    (kept)
├── health/                      (kept)
├── common/                      (kept — error classes used by filter)
└── types/
    └── express.d.ts             (kept — augments Express.Request with user?: JWTPayload,
                                   still needed because @nestjs/platform-express uses Express internally)

DELETED:
  src/index.ts
  src/server.ts
  src/middleware/              (all 4 Express middleware files)
  src/api/auth/index.ts        (Express router)
  src/api/auth/auth.schema.ts  (replaced by dto/)
  src/api/auth/__tests__/auth.schema.test.ts
  src/api/auth/strategies/IPasswordStrategy.ts  (plain interface — naming collision with the abstract class DI token)
  src/api/user/index.ts        (Express router)
  src/api/user/user.schema.ts  (replaced by dto/)
  src/api/user/__tests__/user.schema.test.ts
```

---

## Module Wiring

`SharedModule` is `@Global()`, so all providers it exports are available project-wide without being imported explicitly.

### SharedModule (updated)

`IPasswordStrategy` used as the DI token here refers to the **abstract class** at `src/api/auth/strategies/contracts/password-strategy.contract.ts` — not the TypeScript interface at `strategies/IPasswordStrategy.ts`. Abstract classes are valid NestJS injection tokens; plain interfaces are not.

```
SharedModule (@Global)
  imports:   [LoggerModule, ConfigModule]
  providers:
    - JWTUtil                          (reads JWT_SECRET from process.env, no DI deps)
    - { provide: IPasswordStrategy,    ← abstract class from strategies/contracts/
        useFactory: (config: AppConfigService) => new BcryptStrategy(config.saltRounds),
        inject: [AppConfigService] }
    - JwtAuthGuard
  exports:   [LoggerModule, ConfigModule, JWTUtil, IPasswordStrategy, JwtAuthGuard]
```

Because `SharedModule` is global, `AuthService`, `UserService`, and `JwtAuthGuard` can all inject `JWTUtil` and `IPasswordStrategy` without any additional module imports.

### AuthModule

```
AuthModule
  providers:
    - { provide: IAuthRepository, useClass: AuthRepository }
    - { provide: IAuthService,    useClass: AuthService }
  controllers:
    - AuthController
  imports:
    - DatabaseModule   (for PrismaService)
```

`JWTUtil` and `IPasswordStrategy` are injected from the global `SharedModule`.

### UserModule

```
UserModule
  providers:
    - { provide: IUserRepository,  useClass: UserRepository }
    - { provide: IUserService,     useClass: UserService }
    - UsernameSuggestionsUtil      ← @Injectable(); injects IUserRepository token
  controllers:
    - UserController
  imports:
    - DatabaseModule   (for PrismaService)
```

`JWTUtil` and `IPasswordStrategy` are injected from the global `SharedModule`.

`UsernameSuggestionsUtil` must be decorated with `@Injectable()` and declare its constructor dependency on `IUserRepository` using `@Inject(IUserRepository)` so NestJS resolves the token-based provider:

```typescript
@Injectable()
export class UsernameSuggestionsUtil {
  constructor(@Inject(IUserRepository) private userRepository: IUserRepository) {}
}
```

### AppModule

```
AppModule
  imports: [SharedModule, DatabaseModule, HealthModule, AuthModule, UserModule]
```

The current `app.module.ts` has two imports to remove:
- Direct `ConfigModule.forRoot(...)` — handled by `SharedModule` → `ConfigModule` (itself `@Global()`). `AppConfigService` is available project-wide via this chain.
- Standalone `TerminusModule` — handled by `HealthModule`. Keeping it in `AppModule` creates a redundant import.

`DatabaseModule` is `@Global()` so `PrismaService` is available project-wide once it is imported here. Listing it in feature module `imports` arrays is optional (for explicitness) but not functionally required.

---

## API Routes

Global prefix `api/v1` is set in `main.ts`. Routes are preserved exactly from the Express routers:

```
POST /api/v1/auth/login                 — public
POST /api/v1/auth/logout                — protected (JwtAuthGuard)  ← logout IS protected
POST /api/v1/user                       — public (registration)
GET  /api/v1/user/me                    — protected (JwtAuthGuard)
PUT  /api/v1/user/me                    — protected (JwtAuthGuard)
GET  /api/v1/user/validate/username     — public
GET  /api/v1/user/validate/email        — public
GET  /api/v1/user/suggest-usernames     — public
GET  /api/v1/health                     — public
```

---

## JWT Auth Guard

Location: `src/shared/guards/jwt-auth.guard.ts`

- Implements `CanActivate`
- Extracts `Bearer <token>` from `Authorization` header
- Delegates verification to **`JWTUtil.validateToken(token)`** — the single source of truth for JWT validation (same secret, same issuer/audience checks as token generation)
- On success: attaches decoded payload to `request.user`, returns `true`
- On failure: throws `UnauthorizedException` with exact message strings (preserved from Express middleware to keep integration tests green):
  - Missing/malformed header: `throw new UnauthorizedException('No token provided')`
  - Invalid/expired token: `throw new UnauthorizedException('Invalid or expired token')`

Applied via `@UseGuards(JwtAuthGuard)` on: `AuthController.logout`, `UserController.getCurrentUser`, `UserController.updateCurrentUser`.

**`JWTUtil` is not changed.** It reads `JWT_SECRET` from `process.env` directly in its constructor. The guard and the service both use the same `JWTUtil` instance, so there is one consistent secret source.

### `@CurrentUser()` decorator

Location: `src/shared/decorators/current-user.decorator.ts`

A custom param decorator that extracts `request.user` (the decoded `JWTPayload`) from the `ExecutionContext`. Used in protected controller methods instead of `@Req()`.

```typescript
// Usage in UserController:
getCurrentUser(@CurrentUser() user: JWTPayload): Promise<UserProfileResponse>
```

---

## Error Handling

The existing `GlobalExceptionFilter` only handles `HttpException` (NestJS's own class). Domain error classes (`UnauthorizedError`, `ConflictError`, `NotFoundError`, `BadRequestError`) extend the custom `HttpError` base class, **not** `HttpException`. Without changes, these domain errors would return `500` instead of their correct status codes.

**Fix:** Update `GlobalExceptionFilter` to handle both `HttpException` and `HttpError`, and also normalize `ValidationPipe`'s array message format:

```typescript
if (exception instanceof HttpException) {
  status = exception.getStatus();
  const responseBody = exception.getResponse();
  const rawMessage = typeof responseBody === 'string'
    ? responseBody
    : (responseBody as { message?: string | string[] }).message || 'Unknown error';
  // ValidationPipe produces message as string[] — normalize to a single string
  message = Array.isArray(rawMessage) ? rawMessage.join('; ') : rawMessage;
} else if (exception instanceof HttpError) {
  status = exception.status;
  message = exception.message;
}
```

**ValidationPipe error format:** NestJS `ValidationPipe` throws `HttpException` with `message` as a `string[]` of field-level validation errors (e.g. `['email must be an email', 'password should not be empty']`). After normalization, these become a joined string. **Integration tests asserting `{ message: 'Invalid request' }` on 400 responses must be updated** to either assert the actual joined validation message(s) or use status-code-only checks (`.expect(400)` without body assertion).

**Response shape:** The filter always returns `{ statusCode, message, timestamp }`. All integration test error-path assertions must use `.toMatchObject({ statusCode, message })` to tolerate `timestamp`.

---

## DTOs (replacing Zod schemas)

Zod schemas deleted. Replaced with `class-validator` DTO classes. The global `ValidationPipe` in `main.ts` (already configured with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`) handles validation automatically.

### `src/api/auth/dto/login.dto.ts`

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsString()
  @MinLength(1)          // login: accept any existing password, NOT MinLength(8)
  password: string;
}
```

### `src/api/user/dto/register-user.dto.ts`

```typescript
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterUserDto {
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) => value.toLowerCase())
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
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s\-'.]+$/, { message: 'First name can only contain letters, spaces, hyphens, apostrophes, and dots' })
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s\-'.]+$/, { message: 'Last name can only contain letters, spaces, hyphens, apostrophes, and dots' })
  lastName: string;
}
```

### `src/api/user/dto/update-profile.dto.ts`

```typescript
import { IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateProfileDto {
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
  displayName?: string | null;   // @MinLength(1) is required — empty string is not null/undefined so @IsOptional() won't skip it; null is allowed by the type
}
```

### Contract file updates

`IAuthService` currently imports `LoginRequest` from `../auth.schema`. After deletion of the schema file, it imports `LoginDto` from `../dto/login.dto` instead. Same pattern for `IUserService` which imports `UserRegistrationRequest` and `UserProfileUpdateRequest` — these become `RegisterUserDto` and `UpdateProfileDto`.

### Response shapes and `transformUserToAPI`

Response shapes are unchanged. Both controllers keep their own private `transformUserToAPI` method. The `UserController` version includes `accountCreationMethod`; the `AuthController` version does not. This intentional duplication is accepted — no shared transformer is introduced.

---

## Testing

### Unit Tests

Swap manual constructor injection for `@nestjs/testing`. Interface tokens are used as the injection key.

**AuthService example:**

```typescript
const module = await Test.createTestingModule({
  providers: [
    { provide: IAuthService,      useClass: AuthService },
    { provide: IAuthRepository,   useValue: mock<IAuthRepository>() },
    { provide: IPasswordStrategy, useValue: mock<IPasswordStrategy>() },
    { provide: JWTUtil,           useValue: new JWTUtil() },  // useValue, not useClass
    // useClass: JWTUtil would call new JWTUtil() internally — safe in dev,
    // but throws in CI if NODE_ENV=production and JWT_SECRET is unset
  ],
}).compile();

const service = module.get<IAuthService>(IAuthService);
```

**UserService** takes an additional `UsernameSuggestionsUtil` dependency:

```typescript
{ provide: UsernameSuggestionsUtil, useValue: mock<UsernameSuggestionsUtil>() }
```

`jest-mock-extended` continues to mock interface tokens and concrete classes alike.

### Integration Tests

Integration tests in `test/integration/` currently use a helper that manually wires all layers into an Express app (via `src/server.ts`, which is deleted). After migration, this helper is replaced with a NestJS bootstrapper:

```typescript
// test/integration/helpers/create-test-app.ts
const nestApp = await NestFactory.create(AppModule);
await nestApp.init();

// Supertest requires the raw HTTP server, NOT the INestApplication instance
const httpServer = nestApp.getHttpServer();

// Access internal instances for direct test assertions:
const userRepository = nestApp.get<IUserRepository>(IUserRepository);
const jwtUtil = nestApp.get(JWTUtil);

// All test files: request(app) → request(httpServer)
```

**Error response assertions** must be updated throughout all integration test files. The `GlobalExceptionFilter` always returns `{ statusCode, message, timestamp }`. Every test asserting `expect(response.body).toEqual({ message: '...' })` on an error case will fail due to extra keys (`statusCode`, `timestamp`). All such assertions must become:

```typescript
expect(response.body).toMatchObject({ statusCode: 4xx, message: '...' })
// toMatchObject tolerates extra keys (timestamp), toEqual would not
```

This affects error-path assertions in `local-authentication.int.test.ts`, `user-profile.int.test.ts`, and any other integration test files with error-response assertions. The implementer must audit all integration test files for `.toEqual({ message: '...' })` patterns on non-2xx responses and update them all.

---

## NestJS 11 Package Upgrades

| Package | From | To |
|---|---|---|
| `@nestjs/common` | ^10.x | ^11.0.0 |
| `@nestjs/core` | ^10.x | ^11.0.0 |
| `@nestjs/platform-express` | ^10.x | ^11.0.0 |
| `@nestjs/config` | ^3.x | ^4.0.0 |
| `@nestjs/terminus` | ^10.x | ^11.0.0 |
| `@nestjs/testing` | ^10.x | ^11.0.0 |
| `@nestjs/cli` | ^10.x | ^11.0.0 |
| `reflect-metadata` | ^0.1.14 | ^0.2.0 |

**Node.js requirement:** NestJS 11 requires Node.js 20+. The current Dockerfile uses `node:23-alpine` which already satisfies this — no change needed.

**`reflect-metadata` v0.2:** NestJS 11 handles the new reflect-metadata internally. No changes to import statements in application code are required.

---

## Migration Order

1. Upgrade NestJS packages to v11 (`npm install` with new versions); update `reflect-metadata` to `^0.2.0`
2. Update `app.module.ts` — remove the direct `ConfigModule.forRoot(...)` import (handled by `SharedModule` → `ConfigModule` which is `@Global()`) and the standalone `TerminusModule` import (handled by `HealthModule`). **Complete this step before testing SharedModule changes in step 4** — both `ConfigModule.forRoot` registrations will be active simultaneously until this step is done, which causes double-initialization of `ConfigService`.
3. Update `GlobalExceptionFilter` — add `HttpError` branch so domain errors map to correct HTTP status codes
4. Update `SharedModule` — add `JWTUtil`, `BcryptStrategy` (factory provider), `JwtAuthGuard` to providers and exports
5. Add `JwtAuthGuard` (`src/shared/guards/jwt-auth.guard.ts`) and `@CurrentUser()` decorator (`src/shared/decorators/current-user.decorator.ts`)
6. Migrate `AuthModule`:
   - Create `src/api/auth/dto/login.dto.ts`
   - Update `auth.service.contract.ts` to import `LoginDto` from DTO (remove `auth.schema` import)
   - Add `@Injectable()` to `AuthService` and `AuthRepository`; update all imports from schema → DTO
   - Rewrite `auth.controller.ts` as NestJS `@Controller('auth')` with `@UseGuards(JwtAuthGuard)` on logout
   - Create `auth.module.ts`
7. Register `AuthModule` in `app.module.ts`
8. Migrate `UserModule`:
   - Create `src/api/user/dto/register-user.dto.ts` and `update-profile.dto.ts`
   - Update `user.service.contract.ts` to import DTOs (remove `user.schema` imports)
   - Add `@Injectable()` to `UserService`, `UserRepository`, and `UsernameSuggestionsUtil`; add `@Inject(IUserRepository)` to `UsernameSuggestionsUtil` constructor; update all imports from schema → DTOs
   - Rewrite `user.controller.ts` as NestJS `@Controller('user')` with `@UseGuards(JwtAuthGuard)` on `me` routes
   - Create `user.module.ts`
9. Register `UserModule` in `app.module.ts`
10. Update unit tests to use `@nestjs/testing` (swap manual constructor wiring)
11. Update integration tests:
    - Replace `createTestApp()` helper with NestJS `NestFactory.create(AppModule)` bootstrapper
    - Change `request(app)` → `request(httpServer)` everywhere
    - Update all error-response assertions from `.toEqual({ message })` to `.toMatchObject({ statusCode, message })` across all integration test files (audit every file for `.toEqual({ message:` on non-2xx responses)
    - Update validation-error body assertions (`.toEqual({ message: 'Invalid request' })`): replace with status-code-only (`.expect(400)`) or update the expected message to match the joined class-validator strings
12. Delete Express files:
    - `src/index.ts`, `src/server.ts`
    - `src/middleware/` (all 4 files)
    - `src/api/auth/index.ts`, `src/api/auth/auth.schema.ts`, `src/api/auth/__tests__/auth.schema.test.ts`
    - `src/api/auth/strategies/IPasswordStrategy.ts` (plain interface — naming collision with abstract class DI token)
    - `src/api/user/index.ts`, `src/api/user/user.schema.ts`, `src/api/user/__tests__/user.schema.test.ts`
13. Update `package.json` scripts:
    - `"build": "nest build"` (replaces `tsc`)
    - `"start": "node dist/main"` (replaces `node dist/index.js`)
    - `"dev": "nest start --watch"` (replaces `nodemon` command)
14. Update `Dockerfile` `CMD` to `["node", "dist/main"]` — note: the current Dockerfile uses `CMD ["npm", "start"]`, so after step 13 updates the `start` script, the Dockerfile CMD will already work; this step makes it explicit and removes the npm indirection
