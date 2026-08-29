import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Response } from "express";
import { RequestWithId } from "../middleware/request-id.middleware";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const req = ctx.getRequest<RequestWithId>();
    const res = ctx.getResponse<Response>();

    const method = req.method;
    const url = req.url;
    const requestId =
      req.requestId || (req.headers["x-request-id"] as string) || "N/A";
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;

        this.logger.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            requestId,
            method,
            url,
            statusCode,
            responseTimeMs: responseTime,
          }),
        );
      }),
    );
  }
}
