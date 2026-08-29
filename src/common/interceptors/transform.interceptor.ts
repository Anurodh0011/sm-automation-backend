import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponse } from "../interfaces/api-response.interface";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((res: unknown) => {
        const timestamp = new Date().toISOString();

        // If controller returned paginated object with data and meta
        if (
          res &&
          typeof res === "object" &&
          "data" in res &&
          "meta" in res &&
          !("success" in res)
        ) {
          const paginatedRes = res as {
            data: T;
            meta: Record<string, unknown>;
          };
          return {
            success: true,
            data: paginatedRes.data,
            meta: paginatedRes.meta,
            timestamp,
          };
        }

        // If controller already returned structured ApiResponse
        if (
          res &&
          typeof res === "object" &&
          "success" in res &&
          "data" in res
        ) {
          return {
            ...(res as ApiResponse<T>),
            timestamp,
          };
        }

        // Standard direct payload
        return {
          success: true,
          data: res as T,
          timestamp,
        };
      }),
    );
  }
}
