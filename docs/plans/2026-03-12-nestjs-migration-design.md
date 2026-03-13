# Design: Complete Express → NestJS Migration

**Date**: 2026-03-12

## Context

The app is mid-migration. A NestJS foundation already exists (`src/main.ts`, `src/app.module.ts`, `src/database/`, `src/health/`, `src/shared/`). The Express app (`src/index.ts`) still runs alongside it. The auth and user modules have not been migrated yet.

The app is not deployed, so there are no backward compatibility constraints.

## Approach: Module-by-module (Approach B)

Migrate auth first, verify it works, then migrate user, then cut over and delete all Express code. The Express entrypoint stays running as a reference until the final cleanup step.

## New packages required

```
@nestjs/passport
@nestjs/jwt
passport
passport-jwt
@types/passport-jwt
```

---

## Phase 1 — Auth Module

**Directory:** `src/routes/auth/`

```
src/routes/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.repository.ts
├── strategies/
│   ├── bcrypt.strategy.ts
│   └── jwt.strategy.ts
├── guards/
│   └── jwt-auth.guard.ts
└── dto/
    ├── login.dto.ts
    └── login-response.dto.ts
```

**What gets cherry-picked:**

- `auth.repository.ts` — copy logic as-is, add `@Injectable()`, inject `PrismaService` instead of `PrismaClient`
- `auth.service.ts` — copy logic as-is, add `@Injectable()`, swap `JWTUtil.generateToken()` → `JwtService.sign()`
- `bcrypt.strategy.ts` — copy from `src/api/auth/strategies/BcryptStrategy.ts`, add `@Injectable()`

**What gets replaced:**

- Zod `loginSchema` → `login.dto.ts` using class-validator (`@IsEmail()`, `@IsString()`, `@MinLength()`)
- `jwt-auth.middleware` → `jwt.strategy.ts` (PassportJS JWT strategy) + `jwt-auth.guard.ts` (extends `AuthGuard('jwt')`)

**JWT config** (same values as existing `JWTUtil`):

- Secret: `JWT_SECRET` env var, fallback `development-secret-key`
- `expiresIn: '8h'`
- Issuer: `onemployment-auth`
- Audience: `onemployment-api`

**`JwtStrategy`** extracts Bearer token, validates it, returns `{ sub, email, username }` as `req.user` — same shape as current Express middleware.

**`JwtAuthGuard`** is exported from `AuthModule` so the user module can reuse it without duplicating JWT config.

**Error handling:** Services continue throwing custom errors (`UnauthorizedError` etc.). The existing global exception filter in `src/shared/filters/` handles mapping. If Passport-specific errors don't flow through the global filter cleanly, handle them locally — error handling is a future concern.

**Routes:**

- `POST /api/v1/auth/login` — public
- `POST /api/v1/auth/logout` — protected (`@UseGuards(JwtAuthGuard)`)

---

## Phase 2 — User Module

**Directory:** `src/routes/user/`

```
src/routes/user/
├── user.module.ts
├── user.controller.ts
├── user.service.ts
├── user.repository.ts
├── utils/
│   ├── username-suggestions.util.ts
│   └── validation.util.ts
└── dto/
    ├── register-user.dto.ts
    └── update-user-profile.dto.ts
```

**What gets cherry-picked:**

- `user.repository.ts` — copy logic as-is, add `@Injectable()`, inject `PrismaService`
- `user.service.ts` — copy logic as-is, add `@Injectable()`, swap `JWTUtil.generateToken()` → `JwtService.sign()`
- `username-suggestions.util.ts` — copy as-is, add `@Injectable()`
- `validation.util.ts` — keep as static utility class, no injection needed

**What gets replaced:**

- Zod `userRegistrationSchema` → `register-user.dto.ts` using class-validator
- Zod `userProfileUpdateSchema` → `update-user-profile.dto.ts` using class-validator

**`UserModule`** imports `AuthModule` to access the exported `JwtAuthGuard` and `JwtModule`. No JWT config duplication.

**Routes:**

- `POST /api/v1/user` — public (register)
- `GET /api/v1/user/me` — protected
- `PUT /api/v1/user/me` — protected
- `GET /api/v1/user/validate/username` — public
- `GET /api/v1/user/validate/email` — public
- `GET /api/v1/user/suggest-usernames` — public

---

## Phase 3 — Cleanup & Cutover

### Files to delete

```
src/index.ts
src/server.ts
src/api/                    # entire directory
src/middleware/             # entire directory
src/common/                 # entire directory (replaced by src/shared/)
src/config/                 # entire directory (replaced by src/shared/config/)
src/utils.ts                # health check util, replaced by src/health/
src/types/express.d.ts      # req.user typing, replaced by Passport typings
```

### package.json changes

| Script  | Before                   | After                |
| ------- | ------------------------ | -------------------- |
| `main`  | `dist/index.js`          | `dist/main.js`       |
| `build` | `tsc`                    | `nest build`         |
| `start` | `node dist/index.js`     | `node dist/main.js`  |
| `dev`   | nodemon + `src/index.ts` | `nest start --watch` |

Remove the `nest:*` script aliases (they become redundant).

### docker-compose.yml change

Update the backend service `command` from the hardcoded nodemon invocation to `npm run dev`.

### Dockerfile

No changes needed — already uses `npm run build` and `npm start`.

### Tests

- Unit tests in `src/api/**/__tests__/` migrated alongside their module (Phases 1 and 2) using `@nestjs/testing` + `jest-mock-extended`
- Integration tests in `test/integration/` updated during cleanup to hit the NestJS app
- Express-specific tests (`src/__tests__/server.test.ts`, `src/middleware/__tests__/`) deleted — no equivalent needed

---

## Route Summary

| Method | Path                             | Auth   | Module                |
| ------ | -------------------------------- | ------ | --------------------- |
| `GET`  | `/health`                        | public | health (already done) |
| `POST` | `/api/v1/auth/login`             | public | auth                  |
| `POST` | `/api/v1/auth/logout`            | JWT    | auth                  |
| `POST` | `/api/v1/user`                   | public | user                  |
| `GET`  | `/api/v1/user/me`                | JWT    | user                  |
| `PUT`  | `/api/v1/user/me`                | JWT    | user                  |
| `GET`  | `/api/v1/user/validate/username` | public | user                  |
| `GET`  | `/api/v1/user/validate/email`    | public | user                  |
| `GET`  | `/api/v1/user/suggest-usernames` | public | user                  |
