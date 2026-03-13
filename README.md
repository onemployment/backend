# onemployment Backend API

A production-ready Node.js TypeScript API for user management and authentication. Built with PostgreSQL, JWT tokens, comprehensive validation, and automated testing.

## Technology Stack

- **Runtime**: Node.js 23+ with TypeScript 5.9
- **Framework**: NestJS 10
- **Database**: PostgreSQL 15.8 with Prisma ORM 6.15+
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: class-validator with class-transformer
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
npm run dev:build

# Verify installation
curl http://localhost:3000/api/v1/health
```

### Run Tests

```bash
npm test                 # All tests
npm run test:unit        # Unit tests only
npm run test:int         # Integration tests only
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
