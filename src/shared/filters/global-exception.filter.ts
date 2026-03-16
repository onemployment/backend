import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  LoggerService as ILoggerService,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: ILoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      message =
        typeof responseBody === 'string'
          ? responseBody
          : (responseBody as { message?: string }).message || 'Unknown error';
    }

    this.logger.error(
      `Exception occurred: ${message}`,
      exception instanceof Error ? exception.stack : String(exception)
    );

    response.status(status).json({ message });
  }
}
