import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AiEngineService } from "./ai-engine.service";
import { MockAiProvider } from "./providers/mock-ai.provider";
import { OpenAiProvider } from "./providers/openai.provider";
import {
  AI_PROVIDER_TOKEN,
  IAiProvider,
} from "./interfaces/ai-provider.interface";

@Module({
  imports: [ConfigModule],
  providers: [
    MockAiProvider,
    OpenAiProvider,
    {
      provide: AI_PROVIDER_TOKEN,
      useFactory: (
        configService: ConfigService,
        mockProvider: MockAiProvider,
        openAiProvider: OpenAiProvider,
      ): IAiProvider => {
        const providerName =
          configService.get<string>("AI_PROVIDER")?.toLowerCase() || "mock";

        if (providerName === "openai") {
          return openAiProvider;
        }

        return mockProvider;
      },
      inject: [ConfigService, MockAiProvider, OpenAiProvider],
    },
    AiEngineService,
  ],
  exports: [AiEngineService, AI_PROVIDER_TOKEN],
})
export class AiEngineModule {}
