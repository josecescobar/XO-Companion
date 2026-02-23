import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const now = Date.now();

    // Assign requestId: prefer incoming header, otherwise generate
    const requestId =
      (req.headers['x-request-id'] as string) ?? randomUUID();
    req.requestId = requestId;

    const userId = req.user?.id ?? 'anonymous';

    // Log request body for mutations (non-GET) at debug level
    if (method !== 'GET' && req.body) {
      const bodyStr = JSON.stringify(req.body);
      const truncated =
        bodyStr.length > 500 ? bodyStr.slice(0, 500) + '...' : bodyStr;
      this.logger.debug(
        `[${requestId}] ${method} ${url} body=${truncated}`,
      );
    }

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const duration = Date.now() - now;
        this.logger.log(
          `[${requestId}] ${method} ${url} ${res.statusCode} ${duration}ms userId=${userId}`,
        );
      }),
      catchError((err: Error) => {
        const duration = Date.now() - now;
        const statusCode =
          'getStatus' in err && typeof err.getStatus === 'function'
            ? (err.getStatus as () => number)()
            : 500;
        this.logger.error(
          `[${requestId}] ${method} ${url} ${statusCode} ${duration}ms userId=${userId} error=${err.message}`,
        );
        return throwError(() => err);
      }),
    );
  }
}
