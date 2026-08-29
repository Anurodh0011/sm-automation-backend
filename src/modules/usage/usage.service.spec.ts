import { ForbiddenException } from "@nestjs/common";
import { AiProvider, Prisma } from "@prisma/client";
import { UsageService } from "./usage.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("UsageService (Credit Tracking)", () => {
  let usageService: UsageService;
  let mockPrismaService: {
    organization: { findUnique: jest.Mock; update: jest.Mock };
    aiUsageLog: {
      create: jest.Mock;
      aggregate: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    mockPrismaService = {
      organization: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      aiUsageLog: {
        create: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb(mockPrismaService),
      ),
    };

    usageService = new UsageService(
      mockPrismaService as unknown as PrismaService,
    );
  });

  it("should record usage log and decrement organization credits", async () => {
    mockPrismaService.organization.findUnique.mockResolvedValue({
      id: "org-1",
      creditsRemaining: 100,
    });

    const mockUsageLog = {
      id: "usg-1",
      organizationId: "org-1",
      userId: "usr-1",
      provider: AiProvider.OPENAI,
      model: "gpt-4o-mini",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      creditsDeducted: 1,
      estimatedCostUsd: new Prisma.Decimal(0.000045),
    };

    mockPrismaService.aiUsageLog.create.mockResolvedValue(mockUsageLog);

    const log = await usageService.recordUsage({
      organizationId: "org-1",
      userId: "usr-1",
      provider: AiProvider.OPENAI,
      model: "gpt-4o-mini",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });

    expect(mockPrismaService.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { creditsRemaining: { decrement: 1 } },
    });
    expect(log.id).toBe("usg-1");
  });

  it("should throw ForbiddenException if organization has zero remaining credits", async () => {
    mockPrismaService.organization.findUnique.mockResolvedValue({
      id: "org-1",
      creditsRemaining: 0,
    });

    await expect(
      usageService.recordUsage({
        organizationId: "org-1",
        userId: "usr-1",
        provider: AiProvider.OPENAI,
        model: "gpt-4o-mini",
        totalTokens: 150,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("should calculate summary metrics for organization usage", async () => {
    mockPrismaService.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "Acme Corp",
      creditsRemaining: 950,
    });

    mockPrismaService.aiUsageLog.aggregate.mockResolvedValue({
      _count: { id: 50 },
      _sum: { totalTokens: 7500, estimatedCostUsd: new Prisma.Decimal(0.125) },
    });

    mockPrismaService.aiUsageLog.findMany.mockResolvedValue([]);

    const summary = await usageService.getOrganizationUsageSummary("org-1");

    expect(summary.totalGenerations).toBe(50);
    expect(summary.totalTokensUsed).toBe(7500);
    expect(summary.totalEstimatedCostUsd).toBe(0.125);
    expect(summary.creditsRemaining).toBe(950);
  });
});
