import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId: string =
      ('requestId' in req && typeof req.requestId === 'string'
        ? req.requestId
        : undefined) ??
      (req.headers['x-request-id'] as string) ??
      randomUUID();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : 500;

    let message: string;
    let error: string;

    if (isHttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        error = exception.name;
      } else {
        const obj = body as Record<string, unknown>;
        message = (Array.isArray(obj.message) ? obj.message.join(', ') : obj.message as string) ?? exception.message;
        error = (obj.error as string) ?? exception.name;
      }
    } else {
      message = 'Internal server error';
      error = 'Internal Server Error';
    }

    const logPayload = {
      requestId,
      method: req.method,
      url: req.url,
      statusCode,
      ...(statusCode >= 500 && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    };

    if (statusCode >= 500) {
      this.logger.error(
        `${req.method} ${req.url} ${statusCode} — ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        JSON.stringify(logPayload),
      );
    } else {
      this.logger.warn(
        `${req.method} ${req.url} ${statusCode} — ${message}`,
        JSON.stringify(logPayload),
      );
    }

    res.status(statusCode).json({
      statusCode,
      message,
      error,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
