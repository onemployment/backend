# Project Reorganization Design

**Date**: 2026-03-13
**Status**: Approved

## Goal

Establish a clean, consistent architecture baseline before adding new features. The project is in a hybrid state — partially migrated toward DDD/hexagonal architecture. This reorganization completes that migration and removes structural inconsistencies.

## Guiding Philosophy

- `src/domain/` — business concepts only (entities, repository ports)
- `src/modules/<feature>/` — API and service layer only (controllers, services, DTOs, guards, ports)
- `src/infrastructure/` — technical implementations (persistence, security)
- `src/shared/` — cross-cutting concerns (logger, config, filters)

## Changes

### 1. Remove `src/database/`

`DatabaseModule` and `PrismasPersistenceModule` are redundant. Merge into a single `PrismaModule`.

- `prisma.service.ts` → `src/infrastructure/persistence/prisma/prisma.client.ts`
- `database.module.ts` + `prisma-persistence.module.ts` → `src/infrastructure/persistence/prisma/prisma.module.ts`

### 2. Remove `src/health/`

The `PrismaHealthIndicator` + `TerminusModule` setup is overkill for this app. If the DB is down, API requests fail loudly — a complex health check adds no recovery value.

- Delete `src/health/` entirely
- Remove `TerminusModule` dependency
- Add simple `GET /health` returning `200 { status: 'ok' }` directly in `app.module.ts`

### 3. Remove `src/domain/auth/`

`IPasswordHashStrategy` is not a domain concept — it is a technical interface used by `AuthService` for testability. It does not represent a business concept.

- `password-strategy.port.ts` → `src/modules/auth/ports/password-hash-strategy.port.ts`
- Rename interface to `IPasswordHashStrategy`
- Delete `src/domain/auth/`

### 4. Move strategies out of `src/modules/auth/strategies/`

Modules are for API and service logic only. `JwtStrategy` and `BcryptStrategy` are infrastructure implementations.

- `bcrypt.strategy.ts` → `src/infrastructure/security/bcrypt.strategy.ts`
- `jwt.strategy.ts` → `src/infrastructure/security/jwt.strategy.ts`

## Target Structure

```
src/
├── app.module.ts              ← GET /health registered here
├── main.ts
├── domain/
│   └── user/
│       ├── user.entity.ts
│       └── user.repository.port.ts
├── infrastructure/
│   ├── security/
│   │   ├── jwt.strategy.ts
│   │   └── bcrypt.strategy.ts
│   └── persistence/
│       └── prisma/
│           ├── prisma.module.ts
│           ├── prisma.client.ts
│           ├── user.repository.ts
│           └── mappers/
│               └── user.mapper.ts
├── modules/
│   ├── auth/
│   │   ├── ports/
│   │   │   └── password-hash-strategy.port.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   └── login.dto.ts
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   └── __tests__/
│   │       └── auth.service.test.ts
│   └── user/
│       ├── user.module.ts
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── dto/
│       │   ├── register-user.dto.ts
│       │   └── update-user-profile.dto.ts
│       ├── utils/
│       │   ├── validation.util.ts
│       │   ├── username-suggestions.util.ts
│       │   └── __tests__/
│       │       └── username-suggestions.util.test.ts
│       └── __tests__/
│           └── user.service.test.ts
└── shared/
    ├── shared.module.ts
    ├── config/
    │   ├── app-config.service.ts
    │   └── config.module.ts
    ├── filters/
    │   └── global-exception.filter.ts
    └── logger/
        ├── logger.module.ts
        └── logger.service.ts
```

## What Does Not Change

- `src/domain/user/` — entity and repository port are correct domain concepts
- `src/shared/` — no structural changes
- `src/modules/user/` — no structural changes
- All test files — only import paths update

## Future Considerations

- If a second persistence technology is added (e.g., Drizzle, Redis), a `persistence.module.ts` at the `persistence/` level may be warranted as an abstraction layer
- Switching from Prisma to another ORM is isolated entirely to `src/infrastructure/persistence/prisma/`
