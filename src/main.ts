import {
  BadRequestException,
  ValidationPipe,
  VersioningType,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
void bootstrap();
