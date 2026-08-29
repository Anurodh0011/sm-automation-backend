import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "An unexpected internal server error occurred";
    let errorCode = "INTERNAL_SERVER_ERROR";
    let details: unknown = undefined;

    const isProduction = process.env.NODE_ENV === "production";

    // 1. NestJS Standard HttpExceptions (including ValidationPipe errors)
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const resPayload = exception.getResponse();

      if (typeof resPayload === "string") {
        message = resPayload;
        errorCode = exception.name;
      } else if (typeof resPayload === "object" && resPayload !== null) {
        const payloadObj = resPayload as Record<string, unknown>;
        message = (payloadObj["message"] as string) || exception.message;
        errorCode =
          (payloadObj["code"] as string) ||
          (payloadObj["error"] as string) ||
          exception.name;
        details = payloadObj["details"];
      }
    }
    // 2. Prisma Known Database Request Errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case "P2002": {
          statusCode = HttpStatus.CONFLICT;
          errorCode = "UNIQUE_CONSTRAINT_VIOLATION";
          const target = exception.meta?.target;
          const targetStr = Array.isArray(target)
            ? target.map(String).join(", ")
            : typeof target === "string"
              ? target
              : "field";
          message = `A record with this ${targetStr} already exists`;
          break;
        }
        case "P2025": {
          statusCode = HttpStatus.NOT_FOUND;
          errorCode = "RESOURCE_NOT_FOUND";
          message = "The requested record was not found";
          break;
        }
        case "P2003": {
          statusCode = HttpStatus.BAD_REQUEST;
          errorCode = "FOREIGN_KEY_CONSTRAINT_FAILED";
          message = "Invalid reference ID provided";
          break;
        }
        default: {
          statusCode = HttpStatus.BAD_REQUEST;
          errorCode = "DATABASE_ERROR";
          message = "A database error occurred while processing the request";
          break;
        }
      }
    }
    // 3. Unexpected Runtime Errors
    else if (exception instanceof Error) {
      this.logger.error(
        `[Unhandled Exception] ${exception.message}`,
        exception.stack,
      );
      message = isProduction
        ? "An unexpected internal server error occurred"
        : exception.message;
    }

    // Log internal server errors (500s)
    if (statusCode >= 500) {
      this.logger.error(
        `HTTP ${statusCode} ${request.method} ${request.url} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const responsePayload = {
      success: false,
      statusCode,
      message,
      error: errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details !== undefined ? { details } : {}),
    };

    response.status(statusCode).json(responsePayload);
  }
}
