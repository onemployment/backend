# OnEmployment Backend API

A production-ready Node.js TypeScript API for user management and authentication. Built with PostgreSQL, JWT tokens, comprehensive validation, and automated testing.

## Features

- **Email-based Authentication**: Secure registration and login with JWT tokens
- **User Profile Management**: Complete user profile CRUD operations with validation
- **Username & Email Validation**: Real-time availability checking and suggestions
- **JWT Security**: 8-hour tokens with proper validation middleware
- **PostgreSQL Integration**: Prisma ORM with type-safe database access and migrations
- **Comprehensive Testing**: Unit and integration tests with Testcontainers
- **Production Deployment**: Automated CI/CD pipeline to AWS ECS

## Technology Stack

- **Runtime**: Node.js 23+ with TypeScript 5.9
- **Framework**: Express.js 5.1
- **Database**: PostgreSQL 15.8 with Prisma ORM 6.15+
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Zod schemas with runtime type checking
- **Testing**: Jest with Testcontainers for integration tests
- **Security**: Helmet, CORS, and comprehensive input validation

## Quick Start

### Prerequisites

- Node.js 23+
- Docker & Docker Compose
- npm 10+

### Setup

```bash
# Clone repository
git clone https://github.com/onemployment/backend.git
cd backend

# Configure environment
cp .env.template .env
# Edit .env to set JWT_SECRET and database URLs

# Install dependencies
npm install

# Start services and setup database
npm run setup

# Start development environment
docker compose up -d

# Verify installation
curl http://localhost:3000/health
```

### Run Tests

```bash
npm test                 # All tests
npm run test:unit        # Unit tests only
npm run test:int         # Integration tests only
```

## API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

#### User Registration

```http
POST /api/v1/user
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "username": "john_doe",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201 Created)**

```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": false,
    "createdAt": "2025-09-09T..."
  }
}
```

#### User Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK)**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe",
    "lastLoginAt": "2025-09-09T..."
  }
}
```

### User Management (Protected Routes)

Include JWT token in Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Get User Profile

```http
GET /api/v1/user/me
```

#### Update Profile

```http
PUT /api/v1/user/me
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "displayName": "Johnny"
}
```

#### Validation Endpoints

```http
GET /api/v1/user/validate/username?username=john_doe
GET /api/v1/user/validate/email?email=john@example.com
GET /api/v1/user/suggest-usernames?username=john_doe
```

### Health Check

```http
GET /health
```

## Development

### Environment Variables

Key variables in `.env`:

```bash
NODE_ENV=development
PORT=3000
POSTGRES_DB_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-secure-jwt-secret-here
SALT_ROUNDS=12
```

### Development Commands

```bash
npm run dev              # Start development server
npm run build            # Compile TypeScript
npm run lint             # Run ESLint
npm run format           # Format with Prettier

# Database operations
npm run setup:db         # Initialize database
npm run seed:db          # Add sample data
npm run docker:db:studio # Open Prisma Studio

# Container management
npm run dev:build        # Build and start containers
npm run dev:stop         # Stop containers
npm run docker:logs      # View logs
```

## Architecture

This project follows Clean Architecture principles with clear separation of concerns across controllers, services, repositories, and middleware layers. JWT authentication, comprehensive validation, and domain-driven design ensure maintainable, testable code.

For detailed architectural decisions, design patterns, and implementation guidelines, see [architecture.md](./architecture.md).

## Sample Data

Development environment includes test users:

- `john_doe` / `password123`
- `jane_smith` / `password123`
- `admin_user` / `password123`

## Deployment

The project includes automated CI/CD pipeline for AWS ECS deployment. Production environment uses:

- AWS ECS/Fargate for container orchestration
- RDS PostgreSQL for database
- ECR for container registry
