# Design: Introduce User Domain Entity (Incremental Hexagonal Slice)

**Date**: 2026-03-12
**Status**: Approved
**Scope**: First incremental slice toward hexagonal architecture — domain entity + repository port + folder restructure

---

## Context

The codebase currently uses Prisma-generated types (`User` from `@prisma/client`) as domain types throughout all layers — repositories, services, and controllers. This couples business logic to the ORM and makes the architecture harder to evolve independently.

This design introduces the first hexagonal slice: a domain `User` entity defined in pure TypeScript, decoupled from Prisma. It does not change any business logic, API contracts, or database schema.

---

## Target Folder Structure

```
src/
├── domain/
│   └── user/
│       ├── user.entity.ts              # plain TS interface — no NestJS
│       └── user.repository.port.ts    # IUserRepository interface
│
├── infrastructure/
│   └── persistence/
│       └── prisma/
│           ├── user.repository.ts      # implements IUserRepository (merged)
│           └── mappers/
│               └── user.mapper.ts      # PrismaUser → domain User
│
├── modules/
│   ├── user/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── dto/
│   │   └── user.module.ts
│   └── auth/
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       ├── guards/
│       ├── strategies/
│       └── auth.module.ts
│
├── shared/                             # logger, config, filters — unchanged
└── database/                           # prisma.service.ts — unchanged
```

---

## Architectural Decisions

### No separate auth repository port

`AuthService` is a use case with no domain entity of its own — it operates entirely on `User`. It will depend on `IUserRepository` directly. There is no `IAuthRepository`.

### Consolidate auth + user repositories

The current split (`auth.repository.ts`, `user.repository.ts`) is an artifact of route-based folder organization, not a domain boundary. Both operate on the same `users` table and `User` entity. They will be merged into a single `PrismaUserRepository` in infrastructure. `findByEmail` is currently duplicated across both — the merge eliminates that.

### Domain layer is framework-free

`domain/` contains only plain TypeScript interfaces and types. No `@Injectable`, no NestJS decorators, no Prisma imports. This is the boundary that makes the domain swappable.

### Hybrid structure scales incrementally

Root-level `domain/` and `infrastructure/` give explicit hexagonal signal. Feature modules under `modules/` stay slim (controller + service + DTOs). As features grow, organization can evolve based on actual needs.

---

## Dependency Rule

```
modules/        → domain/           ✅
modules/        → infrastructure/   ✅ (via DI token, never direct import)
infrastructure/ → domain/           ✅
domain/         → anything          ❌ never
```

---

## Changes

### Files to create

| File | Purpose |
|---|---|
| `src/domain/user/user.entity.ts` | `User` interface in plain TypeScript |
| `src/domain/user/user.repository.port.ts` | `IUserRepository` interface |
| `src/infrastructure/persistence/prisma/mappers/user.mapper.ts` | Maps `PrismaUser` → domain `User` |
| `src/infrastructure/persistence/prisma/user.repository.ts` | Merged Prisma implementation of `IUserRepository` |

### Files to move/update

| File | Change |
|---|---|
| `src/routes/auth/auth.service.ts` → `src/modules/auth/auth.service.ts` | Inject `IUserRepository`, remove `@prisma/client` import |
| `src/routes/auth/auth.controller.ts` → `src/modules/auth/auth.controller.ts` | Relocate, no logic change |
| `src/routes/auth/auth.module.ts` → `src/modules/auth/auth.module.ts` | Update import paths |
| `src/routes/auth/guards/` → `src/modules/auth/guards/` | Relocate |
| `src/routes/auth/strategies/` → `src/modules/auth/strategies/` | Relocate |
| `src/routes/auth/dto/` → `src/modules/auth/dto/` | Relocate |
| `src/routes/user/user.service.ts` → `src/modules/user/user.service.ts` | Inject `IUserRepository`, remove `@prisma/client` import |
| `src/routes/user/user.controller.ts` → `src/modules/user/user.controller.ts` | Relocate, no logic change |
| `src/routes/user/user.module.ts` → `src/modules/user/user.module.ts` | Update import paths |
| `src/routes/user/dto/` → `src/modules/user/dto/` | Relocate |
| `src/routes/user/utils/` → `src/modules/user/utils/` | Relocate |

### Files to delete

| File | Reason |
|---|---|
| `src/routes/auth/auth.repository.ts` | Merged into `infrastructure/persistence/prisma/user.repository.ts` |
| `src/routes/user/user.repository.ts` | Merged into `infrastructure/persistence/prisma/user.repository.ts` |
| `src/routes/auth/__tests__/auth.repository.test.ts` | Replaced by infrastructure-level test |
| `src/routes/user/__tests__/user.repository.test.ts` | Replaced by infrastructure-level test |

### Tests to update

| File | Change |
|---|---|
| `src/routes/auth/__tests__/auth.service.test.ts` | Mock `IUserRepository` instead of `AuthRepository` |
| `src/routes/user/__tests__/user.service.test.ts` | Mock `IUserRepository` instead of `UserRepository` |

---

## What does not change

- All business logic in services
- All controllers and DTOs (request/response contracts)
- Prisma schema and migrations
- Database behaviour
- Health check module
- Shared module (logger, config, filters)
