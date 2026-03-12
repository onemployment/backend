import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

const pinoLogger = pino({ level: process.env.LOG_LEVEL || 'info', serializers: pino.stdSerializers });

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    pinoLogger.info(context ? { context } : undefined, message);
  }

  error(message: string, trace?: string, context?: string) {
    const metadata: Record<string, unknown> = {};
    if (context) metadata.context = context;
    if (trace) metadata.trace = trace;
    pinoLogger.error(Object.keys(metadata).length > 0 ? metadata : undefined, message);
  }

  warn(message: string, context?: string) {
    pinoLogger.warn(context ? { context } : undefined, message);
  }

  debug(message: string, context?: string) {
    pinoLogger.debug(context ? { context } : undefined, message);
  }

  verbose(message: string, context?: string) {
    pinoLogger.debug(context ? { context } : undefined, message);
  }
}
