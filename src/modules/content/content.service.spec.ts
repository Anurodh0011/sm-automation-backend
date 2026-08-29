import { ContentService } from "./content.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiEngineService } from "../ai-engine/ai-engine.service";
import { ContentStatus, ContentType, TargetPlatform } from "@prisma/client";
import { GenerateContentDto } from "./dto/generate-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";

describe("ContentService (Editing & Regeneration)", () => {
  let contentService: ContentService;
  let mockPrismaService: {
    workspace: { findFirst: jest.Mock };
    content: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
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
        update: jest.fn(),
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

  it("should generate initial content and store generation history", async () => {
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
  });

  it("should update content body when user edits content", async () => {
    const existingContent = {
      id: "cnt-1",
      workspaceId: "ws-1",
      title: "Original Title",
      body: "Original Body",
    };

    mockPrismaService.content.findFirst.mockResolvedValue(existingContent);

    const updateDto: UpdateContentDto = {
      title: "Updated Title",
      body: "Manually edited copy",
    };

    mockPrismaService.content.update.mockResolvedValue({
      ...existingContent,
      ...updateDto,
    });

    const updated = await contentService.updateContent(
      "cnt-1",
      "org-1",
      updateDto,
    );

    expect(mockPrismaService.content.update).toHaveBeenCalled();
    expect(updated.title).toBe("Updated Title");
    expect(updated.body).toBe("Manually edited copy");
  });

  it("should append a new ContentGeneration record when regenerating content", async () => {
    const existingContent = {
      id: "cnt-1",
      workspaceId: "ws-1",
      title: "Original Title",
      body: "Original Body",
      platform: TargetPlatform.LINKEDIN,
      contentType: ContentType.POST,
      tone: "Professional",
      generationMetadata: { generationCount: 1 },
    };

    mockPrismaService.content.findFirst.mockResolvedValue(existingContent);

    mockAiEngineService.generateContent.mockResolvedValue({
      text: "Regenerated LinkedIn Post Version 2",
      tokensUsed: 160,
      model: "mock-v1",
      provider: "mock",
    });

    const mockRegeneratedContent = {
      ...existingContent,
      body: "Regenerated LinkedIn Post Version 2",
      generationMetadata: { generationCount: 2 },
    };

    const mockNewGeneration = {
      id: "gen-2",
      contentId: "cnt-1",
      prompt:
        "Topic: Original Title\nPlatform: LINKEDIN\nFormat: POST\nTone: Professional\nModified Instructions for Regeneration: Make it funnier",
    };

    mockPrismaService.contentGeneration.create.mockResolvedValue(
      mockNewGeneration,
    );
    mockPrismaService.content.update.mockResolvedValue(mockRegeneratedContent);

    const result = await contentService.regenerateContent(
      "cnt-1",
      "usr-1",
      "org-1",
      {
        instructions: "Make it funnier",
      },
    );

    expect(mockAiEngineService.generateContent).toHaveBeenCalled();
    expect(mockPrismaService.contentGeneration.create).toHaveBeenCalled();
    expect(mockPrismaService.content.update).toHaveBeenCalled();
    expect(result.content.body).toBe("Regenerated LinkedIn Post Version 2");
  });
});
