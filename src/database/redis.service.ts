import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisClientService } from '../infra/redis/client';
import { AppConfigService } from '../shared/config/app-config.service';
import { LoggerService } from '../shared/logger/logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientService;

  constructor(
    private readonly config: AppConfigService,
    private readonly logger: LoggerService
  ) {
    this.redisClient = new RedisClientService(this.config.redisUrl);
  }

  async onModuleInit() {
    try {
      await this.redisClient.connect();
      this.logger.log('Connected to Redis');
    } catch (error) {
      this.logger.error(
        'Failed to connect to Redis',
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.redisClient.quit();
      this.logger.log('Disconnected from Redis');
    } catch {
      await this.redisClient.disconnect();
      this.logger.warn('Redis quit failed, used disconnect instead');
    }
  }

  getClient(): RedisClientService {
    return this.redisClient;
  }
}
