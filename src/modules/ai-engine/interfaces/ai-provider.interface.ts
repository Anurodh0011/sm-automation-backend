export interface GenerateContentOptions {
  prompt: string;
  systemPrompt?: string;
  platform?: string;
  tone?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GeneratedContentResult {
  text: string;
  tokensUsed?: number;
  model: string;
  provider: string;
  rawResponse?: unknown;
}

export const AI_PROVIDER_TOKEN = Symbol("AI_PROVIDER_TOKEN");

export interface IAiProvider {
  generateContent(
    options: GenerateContentOptions,
  ): Promise<GeneratedContentResult>;
}
