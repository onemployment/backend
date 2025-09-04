# Backend - Authentication API

A secure, production-ready Node.js TypeScript API service that implements user authentication with Redis data persistence. Built with clean architecture principles, comprehensive testing, modern development practices, and automated CI/CD deployment to AWS.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [CI/CD & Deployment](#cicd--deployment)
- [Contributing](#contributing)

## Features

- **User Authentication**: Secure registration and login endpoints
- **Password Security**: bcrypt hashing with configurable salt rounds
- **Input Validation**: Runtime schema validation with Zod
- **Error Handling**: Centralized error handling with structured logging
- **Security Middleware**: Helmet for security headers, CORS protection
- **Testing**: Comprehensive unit and integration tests
- **Containerization**: Docker and Docker Compose for development
- **Type Safety**: Full TypeScript implementation with strict configuration

## Technology Stack

**Core**

- Node.js 23+ with TypeScript 5.9
- Express.js 5.1 for HTTP server and routing
- Redis 8 for data persistence

**Security & Validation**

- bcrypt for password hashing
- Zod for request/response validation
- Helmet for security headers
- CORS for cross-origin protection

**Testing & Development**

- Jest with ts-jest for testing framework
- Supertest for API testing
- Testcontainers for integration tests
- ESLint + Prettier for code quality
- Docker + Docker Compose for containerization

**Logging & Monitoring**

- Pino for structured logging
- Health check endpoints

## Prerequisites

- **Node.js**: Version 23.x or higher
- **Docker**: Version 20.x or higher
- **Docker Compose**: Version 2.x or higher
- **npm**: Version 10.x or higher

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/onemployment/backend.git
cd backend
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.template .env

# Install dependencies (optional - for local development)
npm install
```

### 3. Start with Docker (Recommended)

```bash
# Build and start all services
npm run dev:build

# Or start existing containers
npm run dev:start
```

### 4. Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response: {"status":"ok","timestamp":"...","uptime":...,"environment":"..."}
```

### 5. Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit      # Unit tests only
npm run test:int       # Integration tests only
```

## API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Endpoints

#### Register User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "password": "SecurePassword123!"
}
```

**Response (201 Created)**

```json
{
  "message": "User registered successfully",
  "username": "johndoe"
}
```

#### Login User

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "SecurePassword123!"
}
```

**Response (200 OK)**

```json
{
  "message": "Login successful",
  "username": "johndoe"
}
```

#### Health Check

```http
GET /health
```

**Response (200 OK)**

```json
{
  "status": "ok",
  "timestamp": "2025-09-03T22:41:21.556Z",
  "uptime": 276.84896395,
  "environment": "development"
}
```

### Error Responses

**Validation Error (400)**

```json
{
  "message": "Invalid request",
  "statusCode": 400
}
```

**User Already Exists (409)**

```json
{
  "message": "Resource already exists",
  "statusCode": 409
}
```

**Invalid Credentials (401)**

```json
{
  "message": "Authentication failed",
  "statusCode": 401
}
```

## Development

### Local Development Setup

```bash
# Install dependencies
npm install

# Start Redis (required for local development)
docker run -d --name redis -p 6379:6379 redis:8-alpine

# Set environment variables
export NODE_ENV=development
export REDIS_URL=redis://localhost:6379

# Start development server with auto-reload
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start development server with nodemon
npm run build        # Compile TypeScript to JavaScript
npm run start        # Start production server
npm test             # Run all tests
npm run test:coverage # Run tests with coverage report
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Docker Commands

```bash
npm run dev:build    # Build and start containers
npm run dev:start    # Start existing containers
npm run dev:stop     # Stop containers
npm run dev:clean    # Stop containers and remove images
```

## Testing

### Test Structure

- **Unit Tests**: Located in `src/**/__tests__/` alongside source code
- **Integration Tests**: Located in `test/integration/`
- **Test Utilities**: Located in `test/integration/helpers/`

### Running Tests

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:int

# Watch mode
npm run test:unit:watch
npm run test:int:watch

# Coverage report
npm run test:coverage
```

### Test Environment

Integration tests use Testcontainers to spin up real Redis instances, ensuring tests run against actual dependencies rather than mocks.

## Project Structure

```
src/
├── index.ts                 # Application entry point
├── server.ts               # Express app factory
├── config/                 # Configuration management
├── api/                    # API routes and controllers
│   ├── index.ts           # API router factory
│   └── auth/              # Authentication module
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       ├── auth.repository.ts
│       ├── auth.model.ts
│       ├── auth.schema.ts
│       └── strategies/    # Password hashing strategies
├── middleware/            # Express middleware
├── common/               # Shared utilities
│   ├── error/           # Error handling
│   └── logger/          # Logging utilities
└── infra/               # Infrastructure layer
    └── redis/          # Redis client
```

## Architecture

### Design Principles

The project follows **Clean Architecture** principles with clear separation of concerns:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic
- **Repositories**: Manage data persistence
- **Middleware**: Handle cross-cutting concerns

### SOLID Principles

- **Single Responsibility**: Each class has one reason to change
- **Open/Closed**: Extensible through interfaces without modification
- **Liskov Substitution**: Implementations are interchangeable
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions

### Dependency Injection

Constructor-based dependency injection enables:

- Loose coupling between components
- Easy testing through mock injection
- Flexible configuration and swappable implementations

## Configuration

### Environment Variables

Create a `.env` file based on `.env.template`:

```bash
# Server Configuration
NODE_ENV=development
HOST=0.0.0.0
PORT=3000

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Authentication Configuration
SALT_ROUNDS=12
```

### Configuration Management

- Environment-specific configurations in `src/config/`
- Validation of required environment variables at startup
- Type-safe configuration access throughout the application

## CI/CD & Deployment

### GitHub Actions Workflow

The project includes a comprehensive CI/CD pipeline that automatically:

**Continuous Integration (CI)**

- Runs on every push and pull request to main branch
- Executes linting, formatting, building, and testing
- Uses Redis 8-alpine service container for integration tests
- Validates code quality with ESLint and Prettier

**Continuous Deployment (CD)**

- Deploys to AWS ECR in us-east-2 region on successful main branch pushes
- Uses OIDC authentication for secure AWS access
- Builds and pushes Docker images with both `latest` and commit SHA tags
- Images available at: `062440546828.dkr.ecr.us-east-2.amazonaws.com/onemployment/api`

### AWS Infrastructure

**ECR Repository**

- Region: us-east-2
- Repository: `onemployment/api`
- Supports both latest and SHA-tagged images

**IAM Permissions**

- GitHub Actions role with comprehensive AWS service access
- ECR, ECS, S3, CloudWatch, and CodeDeploy permissions
- PowerUser access for future service integrations

### Workflow Status

Check the [Actions tab](https://github.com/onemployment/backend/actions) for current build status and deployment history.

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes following the coding standards
4. Run validation sequence:
   ```bash
   npm run lint      # ESLint validation
   npm run build     # TypeScript compilation
   npm run test:unit # Unit tests
   npm run test:int  # Integration tests
   npm run format:check # Prettier formatting
   ```
5. Commit changes with descriptive messages following CLAUDE.md template
6. Push to your fork and create a pull request
7. CI/CD pipeline will automatically validate and deploy on merge to main
