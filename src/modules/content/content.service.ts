import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AiProvider, ContentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AiEngineService } from "../ai-engine/ai-engine.service";
import { UsageService } from "../usage/usage.service";
import { GenerateContentDto } from "./dto/generate-content.dto";
import { CreateContentDto } from "./dto/create-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";
import { RegenerateContentDto } from "./dto/regenerate-content.dto";
import { ChangeContentStatusDto } from "./dto/change-content-status.dto";
import { ContentStatusMachine } from "./domain/content-status-machine";

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngineService: AiEngineService,
    private readonly usageService: UsageService,
  ) {}

  async generateContent(
    userId: string,
    activeOrgId: string,
    dto: GenerateContentDto,
  ) {
    // 1. Resolve target workspace safely in active organization
    const workspace = await this.resolveWorkspace(activeOrgId, dto.workspaceId);

    // 2. Build structured prompt
    const promptParts = [
      `Topic: ${dto.topic}`,
      `Platform: ${dto.platform}`,
      `Format: ${dto.contentType}`,
      `Tone: ${dto.tone}`,
    ];

    if (dto.targetAudience) {
      promptParts.push(`Target Audience: ${dto.targetAudience}`);
    }

    if (dto.keywords && dto.keywords.length > 0) {
      promptParts.push(`Keywords to include: ${dto.keywords.join(", ")}`);
    }

    if (dto.instructions) {
      promptParts.push(`Additional Instructions: ${dto.instructions}`);
    }

    const fullPrompt = promptParts.join("\n");
    const systemPrompt = `You are a social media copywriter creating high-converting ${dto.platform} ${dto.contentType} content in a ${dto.tone} tone.`;

    // 3. Invoke AI Provider via Abstraction Layer
    const aiResult = await this.aiEngineService.generateContent({
      prompt: fullPrompt,
      systemPrompt,
      platform: dto.platform,
      tone: dto.tone,
    });

    const mappedProvider = this.mapProviderEnum(aiResult.provider);

    // 4. Persist Generation, Content, and Usage Tracking in a database transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create Content record with GENERATED status
      const content = await tx.content.create({
        data: {
          workspaceId: workspace.id,
          createdById: userId,
          title: dto.topic,
          body: aiResult.text,
          contentType: dto.contentType,
          platform: dto.platform,
          tone: dto.tone,
          status: ContentStatus.GENERATED,
          generationMetadata: {
            provider: aiResult.provider,
            model: aiResult.model,
            tokensUsed: aiResult.tokensUsed,
            generationCount: 1,
          },
        },
      });

      // Create ContentGeneration tracking record linked to Content
      const generation = await tx.contentGeneration.create({
        data: {
          workspaceId: workspace.id,
          createdById: userId,
          contentId: content.id,
          prompt: fullPrompt,
          systemPrompt,
          provider: mappedProvider,
          model: aiResult.model,
          totalTokens: aiResult.tokensUsed || 0,
          rawResponse:
            (aiResult.rawResponse as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });

      return {
        content,
        generation,
      };
    });

    // 5. Record Usage Log and deduct organization credits
    await this.usageService.recordUsage({
      organizationId: activeOrgId,
      userId,
      contentGenerationId: result.generation.id,
      provider: mappedProvider,
      model: aiResult.model,
      totalTokens: aiResult.tokensUsed || 0,
    });

    return result;
  }

  async regenerateContent(
    contentId: string,
    userId: string,
    activeOrgId: string,
    dto: RegenerateContentDto,
  ) {
    const existingContent = await this.getContentById(contentId, activeOrgId);

    const tone = dto.tone || existingContent.tone || "Professional";

    const promptParts = [
      `Topic: ${existingContent.title}`,
      `Platform: ${existingContent.platform}`,
      `Format: ${existingContent.contentType}`,
      `Tone: ${tone}`,
    ];

    if (dto.instructions) {
      promptParts.push(
        `Modified Instructions for Regeneration: ${dto.instructions}`,
      );
    } else if (dto.prompt) {
      promptParts.push(`Additional Context: ${dto.prompt}`);
    }

    const fullPrompt = promptParts.join("\n");
    const systemPrompt = `You are a social media copywriter revising and regenerating ${existingContent.platform} ${existingContent.contentType} content in a ${tone} tone.`;

    const aiResult = await this.aiEngineService.generateContent({
      prompt: fullPrompt,
      systemPrompt,
      platform: existingContent.platform,
      tone,
    });

    const mappedProvider = this.mapProviderEnum(aiResult.provider);

    const result = await this.prisma.$transaction(async (tx) => {
      // Append new generation to ContentGeneration history log
      const generation = await tx.contentGeneration.create({
        data: {
          workspaceId: existingContent.workspaceId,
          createdById: userId,
          contentId: existingContent.id,
          prompt: fullPrompt,
          systemPrompt,
          provider: mappedProvider,
          model: aiResult.model,
          totalTokens: aiResult.tokensUsed || 0,
          rawResponse:
            (aiResult.rawResponse as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });

      // Update active Content draft with new body and generation metadata
      const currentMeta =
        (existingContent.generationMetadata as Record<string, unknown>) || {};
      const currentCount =
        typeof currentMeta["generationCount"] === "number"
          ? currentMeta["generationCount"]
          : 1;

      const content = await tx.content.update({
        where: { id: existingContent.id },
        data: {
          body: aiResult.text,
          tone,
          status: ContentStatus.GENERATED,
          generationMetadata: {
            ...currentMeta,
            provider: aiResult.provider,
            model: aiResult.model,
            tokensUsed: aiResult.tokensUsed,
            lastRegeneratedAt: new Date().toISOString(),
            generationCount: currentCount + 1,
          },
        },
        include: {
          workspace: true,
          createdBy: { select: { id: true, email: true, firstName: true } },
          generations: { orderBy: { createdAt: "desc" } },
        },
      });

      return {
        content,
        generation,
      };
    });

    // Record Usage Log and deduct organization credits
    await this.usageService.recordUsage({
      organizationId: activeOrgId,
      userId,
      contentGenerationId: result.generation.id,
      provider: mappedProvider,
      model: aiResult.model,
      totalTokens: aiResult.tokensUsed || 0,
    });

    return result;
  }

  async updateContent(
    contentId: string,
    activeOrgId: string,
    dto: UpdateContentDto,
  ) {
    const existing = await this.getContentById(contentId, activeOrgId);

    if (dto.status && dto.status !== existing.status) {
      ContentStatusMachine.assertValidTransition(existing.status, dto.status);
    }

    return this.prisma.content.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.contentType !== undefined
          ? { contentType: dto.contentType }
          : {}),
        ...(dto.platform !== undefined ? { platform: dto.platform } : {}),
        ...(dto.tone !== undefined ? { tone: dto.tone } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: {
        workspace: true,
        createdBy: { select: { id: true, email: true, firstName: true } },
        generations: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async changeStatus(
    contentId: string,
    activeOrgId: string,
    dto: ChangeContentStatusDto,
  ) {
    const existing = await this.getContentById(contentId, activeOrgId);

    ContentStatusMachine.assertValidTransition(existing.status, dto.status);

    return this.prisma.content.update({
      where: { id: existing.id },
      data: {
        status: dto.status,
      },
      include: {
        workspace: true,
        createdBy: { select: { id: true, email: true, firstName: true } },
        generations: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async createContent(
    userId: string,
    activeOrgId: string,
    dto: CreateContentDto,
  ) {
    const workspace = await this.resolveWorkspace(activeOrgId, dto.workspaceId);

    return this.prisma.content.create({
      data: {
        workspaceId: workspace.id,
        createdById: userId,
        title: dto.title,
        body: dto.body,
        contentType: dto.contentType,
        platform: dto.platform,
        tone: dto.tone,
        status: dto.status || ContentStatus.DRAFT,
      },
    });
  }

  async getWorkspaceContents(activeOrgId: string, workspaceId?: string) {
    return this.prisma.content.findMany({
      where: {
        workspace: {
          organizationId: activeOrgId,
          ...(workspaceId ? { id: workspaceId } : {}),
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getContentById(contentId: string, activeOrgId: string) {
    // SAFE MULTI-TENANT QUERY: Enforces organization boundary
    const content = await this.prisma.content.findFirst({
      where: {
        id: contentId,
        workspace: {
          organizationId: activeOrgId,
        },
      },
      include: {
        workspace: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        generations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!content) {
      throw new NotFoundException(
        "Content record was not found in active organization context",
      );
    }

    return content;
  }

  async deleteContent(contentId: string, activeOrgId: string) {
    const existing = await this.getContentById(contentId, activeOrgId);

    await this.prisma.content.delete({
      where: { id: existing.id },
    });

    return { message: "Content deleted successfully", id: existing.id };
  }

  private async resolveWorkspace(activeOrgId: string, workspaceId?: string) {
    if (workspaceId) {
      const workspace = await this.prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          organizationId: activeOrgId,
        },
      });

      if (!workspace) {
        throw new BadRequestException(
          `Workspace with ID '${workspaceId}' does not belong to active organization`,
        );
      }
      return workspace;
    }

    const defaultWorkspace = await this.prisma.workspace.findFirst({
      where: { organizationId: activeOrgId },
      orderBy: { createdAt: "asc" },
    });

    if (!defaultWorkspace) {
      throw new BadRequestException(
        "No workspace found for active organization",
      );
    }

    return defaultWorkspace;
  }

  private mapProviderEnum(providerStr: string): AiProvider {
    switch (providerStr.toLowerCase()) {
      case "openai":
        return AiProvider.OPENAI;
      case "gemini":
        return AiProvider.GEMINI;
      case "claude":
        return AiProvider.CLAUDE;
      default:
        return AiProvider.MOCK;
    }
  }
}
