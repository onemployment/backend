import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../src/common/logger/logger';

declare global {
  var postgresContainer: StartedPostgreSqlContainer;
  var prismaClient: PrismaClient;
}

const globalWithPostgres = global as typeof globalThis & {
  postgresContainer: StartedPostgreSqlContainer;
  prismaClient: PrismaClient;
};

beforeAll(async () => {
  logger.info('Starting PostgreSQL container for integration tests...');

  globalWithPostgres.postgresContainer = await new PostgreSqlContainer(
    'postgres:15.8-alpine'
  )
    .withDatabase('test_onemployment')
    .withUsername('test_user')
    .withPassword('test_password')
    .withExposedPorts(5432)
    .start();

  const databaseUrl = globalWithPostgres.postgresContainer.getConnectionUri();
  logger.info(`PostgreSQL container started at: ${databaseUrl}`);

  globalWithPostgres.prismaClient = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  await globalWithPostgres.prismaClient.$connect();

  // Push schema to test database
  const { execSync } = require('child_process');
  execSync('npx prisma db push --force-reset', {
    stdio: 'inherit',
    env: { ...process.env, POSTGRES_DB_URL: databaseUrl },
  });

  logger.info('Connected to test PostgreSQL instance and ran migrations');
}, 120000);

afterAll(async () => {
  logger.info('Cleaning up PostgreSQL container...');

  if (globalWithPostgres.prismaClient) {
    await globalWithPostgres.prismaClient.$disconnect();
  }

  if (globalWithPostgres.postgresContainer) {
    await globalWithPostgres.postgresContainer.stop();
  }

  logger.info('PostgreSQL container cleanup completed');
}, 30000);

afterEach(async () => {
  if (globalWithPostgres.prismaClient) {
    // Clean up test data after each test
    await globalWithPostgres.prismaClient.user.deleteMany({});
  }
});
