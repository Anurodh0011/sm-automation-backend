import { BadGatewayException } from "@nestjs/common";
import { AiEngineService } from "./ai-engine.service";
import {
  GenerateContentOptions,
  GeneratedContentResult,
  IAiProvider,
} from "./interfaces/ai-provider.interface";
import { MockAiProvider } from "./providers/mock-ai.provider";

describe("AiEngineService (Provider Abstraction)", () => {
  let aiEngineService: AiEngineService;
  let mockPrimaryProvider: jest.Mocked<IAiProvider>;
  let mockFallbackProvider: MockAiProvider;

  beforeEach(() => {
    mockPrimaryProvider = {
      generateContent: jest.fn(),
    };
    mockFallbackProvider = new MockAiProvider();

    aiEngineService = new AiEngineService(
      mockPrimaryProvider,
      mockFallbackProvider,
    );
  });

  const testOptions: GenerateContentOptions = {
    prompt: "Write a launch post for SaaS",
    platform: "LinkedIn",
    tone: "Professional",
  };

  it("should successfully delegate generation to the injected primary provider", async () => {
    const mockPrimaryResult: GeneratedContentResult = {
      text: "Sample primary provider output",
      tokensUsed: 120,
      model: "gpt-4o-mini",
      provider: "openai",
    };

    mockPrimaryProvider.generateContent.mockResolvedValue(mockPrimaryResult);

    const result = await aiEngineService.generateContent(testOptions);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockPrimaryProvider.generateContent).toHaveBeenCalledWith(
      testOptions,
    );
    expect(result.provider).toBe("openai");
    expect(result.text).toBe("Sample primary provider output");
  });

  it("should seamlessly switch to fallback provider if primary provider throws an error", async () => {
    mockPrimaryProvider.generateContent.mockRejectedValue(
      new BadGatewayException("OpenAI rate limit exceeded"),
    );

    const result = await aiEngineService.generateContent(testOptions);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockPrimaryProvider.generateContent).toHaveBeenCalledWith(
      testOptions,
    );
    expect(result.provider).toBe("mock");
    expect(result.text).toContain("Mock AI Generated Post");
    expect(result.text).toContain("fallback provider");
  });
});
