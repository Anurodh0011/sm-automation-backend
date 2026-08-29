import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { AiProvider, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export interface RecordUsageParams {
  organizationId: string;
  userId: string;
  contentGenerationId?: string;
  provider: AiProvider;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordUsage(params: RecordUsageParams) {
    const promptTokens = params.promptTokens || 0;
    const completionTokens = params.completionTokens || 0;
    const totalTokens = params.totalTokens || promptTokens + completionTokens;

    const estimatedCostUsd = this.calculateCostUsd(
      params.provider,
      params.model,
      promptTokens,
      completionTokens,
      totalTokens,
    );

    const creditsDeducted = 1; // Default 1 credit per generation

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: params.organizationId },
        select: { id: true, creditsRemaining: true },
      });

      if (!organization) {
        throw new ForbiddenException("Target organization does not exist");
      }

      if (organization.creditsRemaining < creditsDeducted) {
        throw new ForbiddenException(
          `Organization credit limit reached (${organization.creditsRemaining} credits remaining). Please upgrade your subscription plan.`,
        );
      }

      // 1. Deduct credits from organization balance
      await tx.organization.update({
        where: { id: params.organizationId },
        data: {
          creditsRemaining: {
            decrement: creditsDeducted,
          },
        },
      });

      // 2. Insert detailed AI Usage Log entry
      const log = await tx.aiUsageLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          contentGenerationId: params.contentGenerationId,
          provider: params.provider,
          model: params.model,
          promptTokens,
          completionTokens,
          totalTokens,
          creditsDeducted,
          estimatedCostUsd: new Prisma.Decimal(estimatedCostUsd),
        },
      });

      this.logger.log(
        `[UsageService] Recorded AI usage log ${log.id}: Org=${params.organizationId}, Tokens=${totalTokens}, Cost=$${estimatedCostUsd.toFixed(6)}`,
      );

      return log;
    });
  }

  async getOrganizationUsageSummary(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, creditsRemaining: true },
    });

    if (!organization) {
      throw new ForbiddenException("Organization not found");
    }

    const aggregations = await this.prisma.aiUsageLog.aggregate({
      where: { organizationId },
      _count: { id: true },
      _sum: {
        totalTokens: true,
        estimatedCostUsd: true,
      },
    });

    const recentLogs = await this.prisma.aiUsageLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      creditsRemaining: organization.creditsRemaining,
      totalGenerations: aggregations._count.id || 0,
      totalTokensUsed: aggregations._sum.totalTokens || 0,
      totalEstimatedCostUsd: Number(aggregations._sum.estimatedCostUsd || 0),
      recentLogs,
    };
  }

  private calculateCostUsd(
    provider: AiProvider,
    model: string,
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
  ): number {
    if (provider === AiProvider.MOCK) {
      return 0.0;
    }

    const modelLower = model.toLowerCase();

    if (provider === AiProvider.GEMINI || modelLower.includes("gemini")) {
      // Gemini 2.5/1.5 Flash rates: $0.075 / 1M input tokens, $0.30 / 1M output tokens
      const promptCost = (promptTokens / 1_000_000) * 0.075;
      const completionCost = (completionTokens / 1_000_000) * 0.3;
      return promptCost + completionCost || (totalTokens / 1_000_000) * 0.15;
    }

    if (modelLower.includes("gpt-4o-mini")) {
      // OpenAI gpt-4o-mini rates: $0.15 / 1M input tokens, $0.60 / 1M output tokens
      const promptCost = (promptTokens / 1_000_000) * 0.15;
      const completionCost = (completionTokens / 1_000_000) * 0.6;
      return promptCost + completionCost || (totalTokens / 1_000_000) * 0.3;
    }

    if (modelLower.includes("gpt-4o")) {
      // OpenAI gpt-4o rates: $2.50 / 1M input tokens, $10.00 / 1M output tokens
      const promptCost = (promptTokens / 1_000_000) * 2.5;
      const completionCost = (completionTokens / 1_000_000) * 10.0;
      return promptCost + completionCost || (totalTokens / 1_000_000) * 5.0;
    }

    // Default fallback estimation ($0.002 per 1,000 tokens)
    return (totalTokens / 1_000) * 0.002;
  }
}
