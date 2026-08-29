import { Injectable, Logger } from "@nestjs/common";
import {
  GenerateContentOptions,
  GeneratedContentResult,
  IAiProvider,
} from "../interfaces/ai-provider.interface";

@Injectable()
export class MockAiProvider implements IAiProvider {
  private readonly logger = new Logger(MockAiProvider.name);

  async generateContent(
    options: GenerateContentOptions,
  ): Promise<GeneratedContentResult> {
    this.logger.log(
      `[MockAiProvider] Generating mock content for prompt: "${options.prompt}"`,
    );

    const mockResponseText =
      `🚀 [Mock AI Generated Post for ${options.platform || "General"}]\n\n` +
      `Here is a ${options.tone || "engaging"} post generated from your prompt: "${options.prompt}".\n\n` +
      `#SaaS #SocialMediaAutomation #AI`;

    return Promise.resolve({
      text: mockResponseText,
      tokensUsed: 150,
      model: "mock-v1",
      provider: "mock",
    });
  }
}
