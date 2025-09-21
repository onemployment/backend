import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { logger as pinoLogger } from '../../common/logger/logger';

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    pinoLogger.info(message, context ? { context } : undefined);
  }

  error(message: string, trace?: string, context?: string) {
    const metadata: Record<string, unknown> = {};
    if (context) metadata.context = context;
    if (trace) metadata.trace = trace;
    pinoLogger.error(
      message,
      Object.keys(metadata).length > 0 ? metadata : undefined
    );
  }

  warn(message: string, context?: string) {
    pinoLogger.warn(message, context ? { context } : undefined);
  }

  debug(message: string, context?: string) {
    pinoLogger.debug(message, context ? { context } : undefined);
  }

  verbose(message: string, context?: string) {
    pinoLogger.debug(message, context ? { context } : undefined);
  }
}
