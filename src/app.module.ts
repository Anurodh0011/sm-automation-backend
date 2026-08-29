import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { validateEnv } from "./config/env.config";
import { PrismaModule } from "./prisma/prisma.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";
import { ContentModule } from "./modules/content/content.module";
import { AiEngineModule } from "./modules/ai-engine/ai-engine.module";
import { UsageModule } from "./modules/usage/usage.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: "default",
          ttl: (configService.get<number>("THROTTLE_TTL") ?? 60) * 1000,
          limit: configService.get<number>("THROTTLE_LIMIT") ?? 100,
        },
        {
          name: "auth",
          ttl: (configService.get<number>("THROTTLE_TTL") ?? 60) * 1000,
          limit: configService.get<number>("AUTH_THROTTLE_LIMIT") ?? 5,
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    WorkspacesModule,
    ContentModule,
    AiEngineModule,
    UsageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
