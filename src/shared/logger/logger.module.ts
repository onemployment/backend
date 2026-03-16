import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LOGGER } from './logger.port';

@Module({
  providers: [LoggerService, { provide: LOGGER, useExisting: LoggerService }],
  exports: [LoggerService, LOGGER],
})
export class LoggerModule {}
