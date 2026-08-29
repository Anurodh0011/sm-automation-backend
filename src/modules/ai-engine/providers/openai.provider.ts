import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GenerateContentOptions,
  GeneratedContentResult,
  IAiProvider,
} from "../interfaces/ai-provider.interface";

@Injectable()
export class OpenAiProvider implements IAiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async generateContent(
    options: GenerateContentOptions,
  ): Promise<GeneratedContentResult> {
    const apiKey = this.configService.get<string>("AI_API_KEY");
    const model = this.configService.get<string>("AI_MODEL") || "gpt-4o-mini";

    if (!apiKey || apiKey === "mock-api-key") {
      throw new BadGatewayException(
        "OpenAI API Key is missing or invalid in environment",
      );
    }

    try {
      this.logger.log(
        `[OpenAiProvider] Calling OpenAI API with model: ${model}`,
      );

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  options.systemPrompt ||
                  `You are an expert social media manager writing copy for ${options.platform || "social media"} in a ${options.tone || "professional"} tone.`,
              },
              {
                role: "user",
                content: options.prompt,
              },
            ],
            max_tokens: options.maxTokens || 500,
            temperature: options.temperature || 0.7,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `[OpenAiProvider] API Error (${response.status}): ${errorText}`,
        );
        throw new BadGatewayException(
          `OpenAI API request failed with status ${response.status}: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
      };

      const text = data.choices?.[0]?.message?.content || "";
      const tokensUsed = data.usage?.total_tokens || 0;

      return {
        text,
        tokensUsed,
        model,
        provider: "openai",
        rawResponse: data,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      this.logger.error(
        `[OpenAiProvider] Unexpected Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException(
        `Failed to generate content via OpenAI: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
