import {
  BadRequestException,
  ValidationPipe,
  VersioningType,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 1. Security Headers via Helmet
  app.use(helmet());

  // 2. Request Payload Size Limits (Default 1MB)
  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ limit: "1mb", extended: true }));

  // 3. Dynamic Environment-Based CORS Configuration
  const allowedOriginsStr =
    configService.get<string>("CORS_ALLOWED_ORIGINS") ||
    "http://localhost:3000,http://localhost:3001";
  const allowedOrigins = allowedOriginsStr
    .split(",")
    .map((origin) => origin.trim());

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like server-to-server or curl) or if origin is in whitelist
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS Error: Origin '${origin}' is not allowed`));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Organization-Id"],
  });

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map((err) => ({
          field: err.property,
          constraints: err.constraints ? Object.values(err.constraints) : [],
        }));
        return new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Request payload validation failed",
          details: formattedErrors,
        });
      },
    }),
  );

  const port = configService.get<number>("PORT") ?? 3000;
  await app.listen(port);
}
void bootstrap();
