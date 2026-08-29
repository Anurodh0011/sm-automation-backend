import { ContentService } from "./content.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiEngineService } from "../ai-engine/ai-engine.service";
import { ContentStatus, ContentType, TargetPlatform } from "@prisma/client";
import { GenerateContentDto } from "./dto/generate-content.dto";

describe("ContentService", () => {
  let contentService: ContentService;
  let mockPrismaService: {
    workspace: { findFirst: jest.Mock };
    content: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
    contentGeneration: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let mockAiEngineService: { generateContent: jest.Mock };

  beforeEach(() => {
    mockPrismaService = {
      workspace: {
        findFirst: jest.fn(),
      },
      content: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      contentGeneration: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb(mockPrismaService),
      ),
    };

    mockAiEngineService = {
      generateContent: jest.fn(),
    };

    contentService = new ContentService(
      mockPrismaService as unknown as PrismaService,
      mockAiEngineService as unknown as AiEngineService,
    );
  });

  const testDto: GenerateContentDto = {
    topic: "Automating Social Media with AI",
    platform: TargetPlatform.LINKEDIN,
    contentType: ContentType.POST,
    tone: "Professional",
  };

  it("should successfully build prompt, invoke AI provider, and store Content + Generation in transaction", async () => {
    const mockWorkspace = {
      id: "ws-1",
      organizationId: "org-1",
      name: "General",
    };
    mockPrismaService.workspace.findFirst.mockResolvedValue(mockWorkspace);

    mockAiEngineService.generateContent.mockResolvedValue({
      text: "AI Generated LinkedIn Post Copy",
      tokensUsed: 150,
      model: "mock-v1",
      provider: "mock",
    });

    const mockContent = {
      id: "cnt-1",
      workspaceId: "ws-1",
      createdById: "usr-1",
      title: testDto.topic,
      body: "AI Generated LinkedIn Post Copy",
      contentType: ContentType.POST,
      platform: TargetPlatform.LINKEDIN,
      tone: "Professional",
      status: ContentStatus.DRAFT,
    };

    const mockGeneration = {
      id: "gen-1",
      workspaceId: "ws-1",
      createdById: "usr-1",
      contentId: "cnt-1",
      prompt:
        "Topic: Automating Social Media with AI\nPlatform: LINKEDIN\nFormat: POST\nTone: Professional",
      provider: "MOCK",
      model: "mock-v1",
      totalTokens: 150,
    };

    mockPrismaService.content.create.mockResolvedValue(mockContent);
    mockPrismaService.contentGeneration.create.mockResolvedValue(
      mockGeneration,
    );

    const result = await contentService.generateContent(
      "usr-1",
      "org-1",
      testDto,
    );

    expect(mockAiEngineService.generateContent).toHaveBeenCalled();
    expect(mockPrismaService.content.create).toHaveBeenCalled();
    expect(mockPrismaService.contentGeneration.create).toHaveBeenCalled();
    expect(result.content.id).toBe("cnt-1");
    expect(result.generation.id).toBe("gen-1");
  });
});
