import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
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

export default async (): Promise<void> => {
  logger.info('Global teardown: Cleaning up all test resources...');

  try {
    if (globalWithPostgres.prismaClient) {
      await globalWithPostgres.prismaClient.$disconnect();
      logger.info('Disconnected from Prisma client');
    }
  } catch (error) {
    logger.error('Error disconnecting Prisma client:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    if (globalWithPostgres.postgresContainer) {
      await globalWithPostgres.postgresContainer.stop();
      logger.info('Stopped PostgreSQL container');
    }
  } catch (error) {
    logger.error('Error stopping PostgreSQL container:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info('Global teardown completed');
};
