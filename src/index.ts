import http from 'node:http';
import { createApp } from './server';
import { AuthRepository } from './api/auth/auth.repository';
import { AuthService } from './api/auth/auth.service';
import { AuthController } from './api/auth/auth.controller';
import { UserRepository } from './api/user/user.repository';
import { UserService } from './api/user/user.service';
import { UserController } from './api/user/user.controller';
import { BcryptStrategy } from './api/auth/strategies/BcryptStrategy';
import { JWTUtil } from './api/auth/utils/jwt.util';
import { UsernameSuggestionsUtil } from './api/user/utils/username-suggestions.util';
import { initializeJwtMiddleware } from './middleware/jwt-auth.middleware';
import { RedisClientService } from './infra/redis/client';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { logger } from './common/logger/logger';

interface ServerWithClients extends http.Server {
  redisClient?: RedisClientService;
  prismaClient?: PrismaClient;
}

async function bootstrap(): Promise<ServerWithClients> {
  const redisClient = new RedisClientService(config.redisUrl);
  const prismaClient = new PrismaClient();

  try {
    await redisClient.connect();
    await prismaClient.$connect();
  } catch (error) {
    logger.error('Bootstrap failed: Database connection error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  // Initialize shared utilities
  const passwordStrategy = new BcryptStrategy(config.saltRounds);
  const jwtUtil = new JWTUtil();

  // Initialize JWT middleware
  initializeJwtMiddleware(jwtUtil);

  // Initialize repositories
  const authRepository = new AuthRepository(prismaClient);
  const userRepository = new UserRepository(prismaClient);

  // Initialize utilities
  const usernameSuggestionsUtil = new UsernameSuggestionsUtil(userRepository);

  // Initialize services
  const authService = new AuthService(
    authRepository,
    passwordStrategy,
    jwtUtil
  );
  const userService = new UserService(
    userRepository,
    passwordStrategy,
    jwtUtil,
    usernameSuggestionsUtil
  );

  // Initialize controllers
  const authController = new AuthController(authService);
  const userController = new UserController(userService);

  const app = createApp({ authController, userController });

  const server = app.listen(config.port, config.host, () => {
    logger.info(
      `HTTP server started on ${config.host}:${config.port} (env: ${config.environment})`
    );
  }) as ServerWithClients;

  server.on('error', (err) => {
    logger.error('HTTP server error:', { err });
    process.exit(1);
  });

  server.redisClient = redisClient;
  server.prismaClient = prismaClient;

  return server;
}

(async () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', { err });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', { reason });
    process.exit(1);
  });

  const server = await bootstrap();

  const shutdown = async (signal: string) => {
    logger.info(`Received shutdown signal: ${signal}`);
    try {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });

      if (server.redisClient) {
        try {
          await server.redisClient.quit();
        } catch (quitError) {
          logger.warn('Redis quit() failed, falling back to disconnect():', {
            error:
              quitError instanceof Error
                ? quitError.message
                : String(quitError),
          });
          await server.redisClient.disconnect();
        }
      }

      if (server.prismaClient) {
        try {
          await server.prismaClient.$disconnect();
        } catch (disconnectError) {
          logger.error('Prisma disconnect failed:', {
            error:
              disconnectError instanceof Error
                ? disconnectError.message
                : String(disconnectError),
          });
        }
      }

      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Shutdown error:', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})().catch((err) => {
  logger.error('Bootstrap failed:', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
