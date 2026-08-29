import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import {
  AI_PROVIDER_TOKEN,
  GenerateContentOptions,
  GeneratedContentResult,
} from "./interfaces/ai-provider.interface";
import type { IAiProvider } from "./interfaces/ai-provider.interface";
import { MockAiProvider } from "./providers/mock-ai.provider";

@Injectable()
export class AiEngineService {
  private readonly logger = new Logger(AiEngineService.name);

  constructor(
    @Inject(AI_PROVIDER_TOKEN)
    private readonly primaryProvider: IAiProvider,
    private readonly fallbackProvider: MockAiProvider,
  ) {}

  async generateContent(
    options: GenerateContentOptions,
  ): Promise<GeneratedContentResult> {
    try {
      return await this.primaryProvider.generateContent(options);
    } catch (primaryError) {
      this.logger.warn(
        `[AiEngineService] Primary AI provider failed: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}. Attempting fallback provider...`,
      );

      try {
        const fallbackResult =
          await this.fallbackProvider.generateContent(options);
        return {
          ...fallbackResult,
          text: `${fallbackResult.text}\n\n(Note: Generated via fallback provider due to primary provider unavailability)`,
        };
      } catch (fallbackError) {
        this.logger.error(
          `[AiEngineService] Fallback AI provider also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        throw new BadGatewayException(
          `AI content generation failed across primary and fallback providers.`,
        );
      }
    }
  }
}
