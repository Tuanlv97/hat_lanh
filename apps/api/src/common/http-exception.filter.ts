import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

const CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE',
  429: 'TOO_MANY_REQUESTS',
};

/** Consistent error JSON: { statusCode, error, message } (+ extra fields such as `fields`). */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (!(exception instanceof HttpException)) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      res.status(500).json({ statusCode: 500, error: 'INTERNAL_ERROR', message: 'Internal server error' });
      return;
    }
    const status = exception.getStatus();
    const raw = exception.getResponse();
    const obj: Record<string, unknown> =
      typeof raw === 'string' ? { message: raw } : { ...(raw as Record<string, unknown>) };
    const message = Array.isArray(obj.message) ? obj.message.join('; ') : obj.message;
    const error =
      typeof obj.error === 'string' && /^[A-Z_]+$/.test(obj.error)
        ? obj.error
        : (CODES[status] ?? HttpStatus[status] ?? 'ERROR');
    res.status(status).json({ ...obj, statusCode: status, error, message: message ?? exception.message });
  }
}
