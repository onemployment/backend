import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { LoggerService as ILoggerService } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LOGGER } from '../../../shared/logger/logger.port';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(@Inject(LOGGER) private readonly logger: ILoggerService) {
    super();
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL database');
    } catch (error) {
      this.logger.error(
        'Failed to connect to PostgreSQL database',
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL database');
  }
}
