# Backend Repository - Implementation Guide

## Repository Context

**Purpose**: Production-ready Node.js/TypeScript API providing authentication and core platform services
**Current Status**: ✅ Production deployment on AWS ECS with Redis authentication
**Key Technologies**: Node.js, Express.js, TypeScript, Redis, PostgreSQL (Prisma), JWT, bcrypt, Zod

**Production Environment**:

- **Live API**: https://api.onemployment.org (ECS Fargate + Application Load Balancer)
- **Health Check**: https://api.onemployment.org/health
- **Container Registry**: `062440546828.dkr.ecr.us-east-2.amazonaws.com/onemployment/api`
- **Redis**: ElastiCache cluster for sessions and caching

## Development Environment

### Local Setup Commands

```bash
# Development with hot reload
npm run dev

# Full Docker environment (Redis + PostgreSQL + API)
npm run dev:build
npm run dev:start

# Stop and clean Docker environment
npm run dev:stop
npm run dev:clean
```

### Database Management

```bash
# Automated database setup
npm run setup:db          # Containers + migrations
npm run seed:db           # Sample data
npm run setup             # Complete setup

# Database operations
npm run db:migrate:dev     # Development migrations
npm run db:generate        # Generate Prisma client
npm run db:studio          # Open Prisma Studio UI
npm run db:push            # Push schema changes
```

### Testing & Quality Validation Sequence

**Required sequence before committing**:

```bash
npm run lint              # ESLint validation
npm run build             # TypeScript compilation
npm run test:unit         # Unit tests (21 test files)
npm run test:int          # Integration tests (6 test files)
npm run format            # Prettier formatting
```

**Watch modes for development**:

```bash
npm run test:unit:watch   # Unit tests in watch mode
npm run test:int:watch    # Integration tests in watch mode
npm run test:coverage     # Coverage report
```

## Architecture & Patterns

### Layered Architecture

```
src/
├── api/                    # Business logic modules
│   ├── auth/              # Authentication (JWT, bcrypt strategies)
│   │   ├── strategies/    # Password hashing strategies
│   │   ├── utils/         # JWT utilities
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   └── auth.schema.ts # Zod validation schemas
│   └── user/              # User management
│       ├── utils/         # Username validation
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.repository.ts
│       └── user.schema.ts
├── common/                # Shared utilities
│   ├── error/            # HTTP error classes & handling
│   └── logger/           # Structured logging (Pino)
├── config/               # Environment configuration
├── infra/                # Infrastructure services
│   └── redis/            # Redis client & utilities
├── middleware/           # Express middleware
├── types/                # TypeScript definitions
└── utils.ts              # Utility functions
```

### Design Patterns Used

- **Dependency Injection**: Manual DI in `src/index.ts` with interface abstractions
- **Strategy Pattern**: `BcryptStrategy` for password hashing with configurable salt rounds
- **Repository Pattern**: Data access abstraction (`*.repository.ts` files)
- **Service Layer**: Business logic orchestration (`*.service.ts` files)
- **Controller Pattern**: HTTP request/response handling (`*.controller.ts` files)

### Validation & Type Safety

- **Zod Schemas**: Request/response validation in `*.schema.ts` files
- **TypeScript Strict Mode**: Compile-time type safety with strict configuration
- **Prisma Types**: Database type safety with generated client types
- **Custom Error Classes**: Structured error handling with HTTP status codes

## Testing Strategy

### Test Organization

- **Unit Tests**: `src/**/__tests__/` - 21 test files covering business logic
- **Integration Tests**: `test/integration/` - 6 test files using Testcontainers
- **Test Database**: Isolated PostgreSQL and Redis via Docker containers

### Testing Approach

- **Testcontainers**: Docker-based integration testing with real databases
- **Jest Configuration**: ts-jest for TypeScript execution
- **Mocking Strategy**: Interface-based mocking for external dependencies
- **Coverage Requirements**: Comprehensive coverage of business logic and API endpoints

### Test Execution

```bash
npm test                   # Full test suite (unit + integration)
npm run test:unit         # Unit tests only (fast feedback)
npm run test:int          # Integration tests only (real databases)
```

## Deployment Context

### Production Infrastructure

- **AWS ECS Fargate**: Container orchestration with `onemployment-cluster`
- **Service Configuration**: `backend-service` (1 task, 256 CPU, 512 MB memory)
- **ElastiCache Redis**: Session storage and caching layer
- **RDS PostgreSQL**: Persistent data storage (integration pending)
- **Application Load Balancer**: HTTPS termination and health checks

### Automated Deployment Pipeline

**Trigger**: Push to main branch
**Pipeline Steps**:

1. ESLint validation
2. TypeScript compilation
3. Unit test execution
4. Integration test execution
5. Docker image build
6. ECR push
7. ECS service deployment
8. Health check verification

### Environment Configuration

```bash
# Required environment variables
PORT=3000                    # Server port
HOST=0.0.0.0                # Server host
NODE_ENV=production          # Environment mode
REDIS_URL=                   # Redis connection string
POSTGRES_DB_URL=             # PostgreSQL connection string
SALT_ROUNDS=12               # bcrypt salt rounds
```

### Health Monitoring

- **Health Endpoint**: `/health` with Redis connection verification
- **Structured Logging**: Pino logger for production monitoring
- **Graceful Shutdown**: SIGTERM/SIGINT handling
- **ECS Health Checks**: Container-level health monitoring

## AI Agent Instructions

### Before Starting Backend Development

1. **Read planning context**: Start from [`onemployment-planning/CLAUDE.md`](https://github.com/onemployment/onemployment-planning/blob/main/CLAUDE.md)
2. **Understand the task**: Review Feature Request and Technical Design issues
3. **Set up environment**: Run `npm run setup` for complete local development setup
4. **Verify health**: Check `http://localhost:3000/health` after startup

### Development Workflow

1. **Follow layered architecture**: Controller → Service → Repository pattern
2. **Use existing patterns**: Reference `auth` and `user` modules for consistency
3. **Validate inputs**: Create Zod schemas for all API endpoints
4. **Write tests**: Unit tests for business logic, integration tests for APIs
5. **Follow validation sequence**: lint → build → test before committing

### API Development Patterns

- **Controllers**: Handle HTTP requests, validate inputs, return responses
- **Services**: Implement business logic, orchestrate repository calls
- **Repositories**: Abstract data access, handle database operations
- **Schemas**: Define Zod validation schemas for type safety
- **Error Handling**: Use custom HTTP error classes with proper status codes

### Database Development

- **Schema Changes**: Update `prisma/schema.prisma`, run migrations
- **Queries**: Use Prisma client with type safety
- **Testing**: Use Testcontainers for integration tests with real databases
- **Seeding**: Add sample data in `scripts/seed.ts` for development

### Security Considerations

- **Authentication**: Use JWT tokens with proper expiration
- **Password Hashing**: Use bcrypt with configurable salt rounds
- **Input Validation**: Validate all inputs with Zod schemas
- **Error Messages**: Sanitize error responses to prevent information leakage

## Quick Reference

### Common Development Commands

```bash
npm run dev               # Start development server
npm run db:studio         # Open database UI
npm run docker:shell      # Access container shell
npm run docker:logs       # View container logs
npm test                  # Run all tests
npm run lint:fix          # Fix linting issues
```

### API Endpoints

```bash
GET  /health              # Health check
POST /api/auth/login      # User authentication
POST /api/auth/logout     # User logout
GET  /api/users/profile   # Get user profile
```

### Debugging & Troubleshooting

- **Database Issues**: Check `docker-compose` services, run `npm run setup:db`
- **Redis Connection**: Verify Redis container is running and accessible
- **Type Errors**: Run `npm run db:generate` to update Prisma client
- **Test Failures**: Check Testcontainer logs, verify database setup

### Production Debugging

- **ECS Service**: Check service status in AWS Console (us-east-2 region)
- **Container Logs**: Use CloudWatch logs for production debugging
- **Health Checks**: Monitor `/health` endpoint for Redis connectivity
- **Load Balancer**: Verify ALB target health and routing configuration

---

**Integration with Planning**: Always reference issues from [`onemployment-planning`](https://github.com/onemployment/onemployment-planning) repository using format: `Epic: onemployment-planning#X`, `Design: onemployment-planning#Y`
