# Project Context

## High Level Context

This is the backend API for the OnEmployment platform - a comprehensive job search and employment matching system. The project demonstrates a production-ready Node.js API with TypeScript, authentication, database integration, and containerized deployment.

## Technologies Used

### Core Technologies

- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework for Node.js
- **TypeScript** - Typed superset of JavaScript for enhanced development experience
- **ts-node** - TypeScript execution environment for Node.js development
- **npm** - Package manager for dependency management

### Database & Caching

- **PostgreSQL** - Primary database (via Prisma ORM)
- **Prisma** - Database ORM and migration tool
- **Redis** - Caching and session storage

### Authentication & Security

- **bcrypt** - Password hashing strategy
- **Zod** - Schema validation and type safety
- **Helmet** - Security headers middleware
- **CORS** - Cross-origin resource sharing

### Development & Testing

- **Jest** - Testing framework (unit and integration tests)
- **Testcontainers** - Docker-based integration testing
- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting
- **Nodemon** - Development hot-reload

### Infrastructure & Deployment

- **Docker** - Containerization for development and production
- **Docker Compose** - Multi-service development environment
- **AWS ECS/Fargate** - Production container orchestration
- **Pino** - Structured logging for production monitoring

### Test Configuration

- **Unit Tests**: Located in `src/**/__tests__/`, using Jest with ts-jest
- **Integration Tests**: Located in `test/integration/`, using Testcontainers for Redis
- **Coverage**: Available via `npm run test:coverage`
- **Watch Mode**: Available for both unit (`npm run test:unit:watch`) and integration (`npm run test:int:watch`)

## Commit Message Rules

### Format

```
<imperative title>

- <concise bullet point describing important change and brief why>
- <concise bullet point describing important change and brief why>
- <concise bullet point describing important change and brief why>
```

### Guidelines

- Commit title should be imperative and concise (50 characters or less)
- Use bullet points in description to list important changes
- Explain what changed and briefly why
- No emojis, Claude collaboration lines, or extra text
- Keep bullet points concise and focused

### Example

```
Add user authentication flow

- Implement login/logout functionality to secure user access
- Add JWT token management for session handling
- Create protected route wrapper for authenticated pages
- Add form validation to prevent invalid submissions
```

## Commit Workflow

When preparing to commit changes, follow this standardized workflow:

1. **Review commit template**: Reference the commit message rules above
2. **Analyze local changes**: Compare current branch changes with the remote branch to understand what has been modified
3. **Prepare commit message**: Create a commit message following the Commit Template Rules with:
   - Concise imperative title summarizing the change
   - Bullet points detailing specific modifications made
4. **Execute commit and push**: Stage all changes, commit with the exact prepared message, and push to the current branch's remote

## Issue Template

### What

Describe what needs to be done or what problem needs to be solved.

### Why

Explain the business value, user need, or technical necessity behind this issue.

### How

Outline the general approach or solution strategy for addressing this issue.

### Implementation Plan

- [ ] Specific task 1
- [ ] Specific task 2
- [ ] Specific task 3
- [ ] Testing and validation
- [ ] Documentation updates

### Acceptance Criteria

Checkboxes for that define the outcomes of the issue

## Project Structure

```
src/
├── api/                    # API routes and business logic
│   ├── auth/              # Authentication module
│   │   ├── __tests__/     # Unit tests
│   │   ├── strategies/    # Password hashing strategies
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   └── auth.schema.ts # Zod validation schemas
│   └── index.ts           # API route registration
├── common/                # Shared utilities
│   ├── error/            # Error handling
│   └── logger/           # Structured logging
├── config/               # Configuration management
├── infra/                # Infrastructure services
│   └── redis/            # Redis client and utilities
├── middleware/           # Express middleware
├── __tests__/            # Server-level tests
├── index.ts              # Application entry point
├── server.ts             # Express app configuration
└── utils.ts              # Utility functions

test/                     # Integration tests
├── integration/
│   ├── helpers/         # Test setup and utilities
│   └── *.int.test.ts    # Integration test files

prisma/                   # Database schema and migrations
├── schema.prisma        # Database schema definition
└── migrations/          # Database migration files

scripts/                  # Development scripts
├── setup-db.sh          # Database setup automation
└── seed.ts              # Database seeding
```

## Development Commands

### Local Development

- `npm run dev` - Start development server with hot reload
- `npm run dev:build` - Build and start full Docker environment
- `npm run dev:start` - Start existing Docker containers
- `npm run dev:stop` - Stop Docker containers
- `npm run dev:clean` - Clean Docker containers and images

### Database Management

- `npm run setup:db` - Automated database setup (containers + migrations)
- `npm run seed:db` - Populate database with sample data
- `npm run setup` - Complete setup (database + seed data)
- `npm run db:migrate:dev` - Run development migrations
- `npm run db:migrate:deploy` - Run production migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio database UI

### Docker Database Operations

- `npm run docker:db:migrate` - Run migrations in Docker container
- `npm run docker:db:generate` - Generate Prisma client in container
- `npm run docker:db:studio` - Open Prisma Studio from container
- `npm run docker:shell` - Access container shell
- `npm run docker:logs` - View container logs

## Architecture Patterns

### Layered Architecture

- **Controller Layer**: HTTP request/response handling and validation
- **Service Layer**: Business logic and orchestration
- **Repository Layer**: Data access abstraction
- **Infrastructure Layer**: External service integration (Redis, database)

### Dependency Injection

- Manual dependency injection in `src/index.ts`
- Strategy pattern for password hashing (`BcryptStrategy`)
- Interface-based abstractions for testability

### Error Handling

- Custom HTTP error classes in `src/common/error/`
- Centralized error handling middleware
- Structured error responses with proper HTTP status codes

### Validation & Type Safety

- **Zod schemas** for request/response validation
- **TypeScript strict mode** for compile-time safety
- **Prisma types** for database type safety

## Production Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production/test)
- `REDIS_URL` - Redis connection string
- `POSTGRES_DB_URL` - PostgreSQL connection string
- `SALT_ROUNDS` - bcrypt salt rounds (default: 12)

### Health Monitoring

- Health check endpoint: `/health`
- Structured logging with Pino
- Graceful shutdown handling (SIGTERM/SIGINT)
- Redis connection health monitoring

### Security Features

- Helmet middleware for security headers
- CORS configuration for cross-origin requests
- bcrypt password hashing with configurable salt rounds
- Input validation with Zod schemas
- Error message sanitization

## Deployment Context

### Production Infrastructure

- **AWS ECS/Fargate**: Container orchestration
- **ElastiCache Redis**: Session and cache storage
- **RDS PostgreSQL**: Persistent data storage
- **Application Load Balancer**: HTTPS termination and routing
- **ECR**: Container image registry
- **Production URL**: https://api.onemployment.org

### Container Configuration

- **Development**: Docker Compose with hot reload
- **Production**: Multi-stage Docker build
- **Health Checks**: Built into Docker Compose and ECS
- **Resource Limits**: 256 CPU units, 512 MB memory (Fargate)
