import { ConfigService } from "@nestjs/config";
import { GeminiProvider } from "./gemini.provider";

describe("GeminiProvider", () => {
  let provider: GeminiProvider;
  let mockConfigService: { get: jest.Mock };
  const globalFetch = global.fetch;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    };

    provider = new GeminiProvider(
      mockConfigService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  it("should call Gemini REST API and return candidate text with token counts", async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === "AI_API_KEY") return "test-gemini-key";
      if (key === "AI_MODEL") return "gemini-2.5-flash";
      return null;
    });

    const mockResponseData = {
      candidates: [
        {
          content: {
            parts: [{ text: "🚀 Gemini generated social media post" }],
          },
        },
      ],
      usageMetadata: {
        totalTokenCount: 180,
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponseData),
    });

    const result = await provider.generateContent({
      prompt: "Write a Gemini launch post",
      systemPrompt: "You are an AI assistant",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test-gemini-key",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(result.text).toBe("🚀 Gemini generated social media post");
    expect(result.tokensUsed).toBe(180);
    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-2.5-flash");
  });

  it("should throw an error if AI_API_KEY is not configured", async () => {
    mockConfigService.get.mockReturnValue(null);

    await expect(
      provider.generateContent({ prompt: "Test prompt" }),
    ).rejects.toThrow("Gemini API Key is not configured");
  });
});
