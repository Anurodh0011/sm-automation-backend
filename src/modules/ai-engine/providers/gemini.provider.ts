import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GenerateContentOptions,
  GeneratedContentResult,
  IAiProvider,
} from "../interfaces/ai-provider.interface";

@Injectable()
export class GeminiProvider implements IAiProvider {
  readonly providerName = "gemini";
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async generateContent(
    options: GenerateContentOptions,
  ): Promise<GeneratedContentResult> {
    const apiKey = this.configService.get<string>("AI_API_KEY");
    const model =
      this.configService.get<string>("AI_MODEL") || "gemini-2.5-flash";

    if (!apiKey) {
      this.logger.error(
        "Gemini API Key is missing in AI_API_KEY environment variable",
      );
      throw new Error("Gemini API Key is not configured");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
      ...(options.systemPrompt
        ? {
            systemInstruction: {
              parts: [{ text: options.systemPrompt }],
            },
          }
        : {}),
      contents: [
        {
          role: "user",
          parts: [{ text: options.prompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1000,
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Gemini API call failed (${response.status}): ${errorText}`,
        );
        throw new Error(
          `Gemini API HTTP Error ${response.status}: ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
        usageMetadata?: {
          totalTokenCount?: number;
          promptTokenCount?: number;
          candidatesTokenCount?: number;
        };
      };

      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || "";
      const usage = data.usageMetadata;

      return {
        text,
        tokensUsed: usage?.totalTokenCount || 0,
        model,
        provider: this.providerName,
        rawResponse: data,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Gemini API execution error: ${message}`, stack);
      throw err;
    }
  }
}
