import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AiEngineService } from "./ai-engine.service";
import { MockAiProvider } from "./providers/mock-ai.provider";
import { OpenAiProvider } from "./providers/openai.provider";
import { GeminiProvider } from "./providers/gemini.provider";
import {
  AI_PROVIDER_TOKEN,
  IAiProvider,
} from "./interfaces/ai-provider.interface";

@Module({
  imports: [ConfigModule],
  providers: [
    MockAiProvider,
    OpenAiProvider,
    GeminiProvider,
    {
      provide: AI_PROVIDER_TOKEN,
      useFactory: (
        configService: ConfigService,
        mockProvider: MockAiProvider,
        openAiProvider: OpenAiProvider,
        geminiProvider: GeminiProvider,
      ): IAiProvider => {
        const providerName =
          configService.get<string>("AI_PROVIDER")?.toLowerCase() || "mock";

        if (providerName === "gemini") {
          return geminiProvider;
        }

        if (providerName === "openai") {
          return openAiProvider;
        }

        return mockProvider;
      },
      inject: [ConfigService, MockAiProvider, OpenAiProvider, GeminiProvider],
    },
    AiEngineService,
  ],
  exports: [AiEngineService, AI_PROVIDER_TOKEN],
})
export class AiEngineModule {}
