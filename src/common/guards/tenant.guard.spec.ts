import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { TenantGuard } from "./tenant.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestWithOrgContext } from "../decorators/active-org.decorator";

describe("TenantGuard", () => {
  let tenantGuard: TenantGuard;
  let mockPrismaService: {
    organizationMembership: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrismaService = {
      organizationMembership: {
        findUnique: jest.fn(),
      },
    };
    tenantGuard = new TenantGuard(
      mockPrismaService as unknown as PrismaService,
    );
  });

  const createMockContext = (
    headers: Record<string, string | undefined>,
    user?: { id: string; email: string },
    params?: Record<string, string>,
  ): ExecutionContext => {
    const req = {
      headers,
      user,
      params: params || {},
      query: {},
    } as unknown as RequestWithOrgContext;

    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  it("should throw BadRequestException if X-Organization-Id header and org params are missing", async () => {
    const context = createMockContext(
      {},
      { id: "user-1", email: "user@test.com" },
    );
    await expect(tenantGuard.canActivate(context)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("should throw ForbiddenException if user is not a member of target organization", async () => {
    mockPrismaService.organizationMembership.findUnique.mockResolvedValue(null);

    const context = createMockContext(
      { "x-organization-id": "org-99" },
      { id: "user-1", email: "user@test.com" },
    );
    await expect(tenantGuard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should allow access and attach org context when user is a valid member", async () => {
    const mockMembership = {
      id: "m-1",
      userId: "user-1",
      organizationId: "org-1",
      role: "MEMBER",
      organization: { id: "org-1", name: "Acme Corp", slug: "acme-corp" },
    };

    mockPrismaService.organizationMembership.findUnique.mockResolvedValue(
      mockMembership,
    );

    const req = {
      headers: { "x-organization-id": "org-1" },
      user: { id: "user-1", email: "user@acme.com" },
      params: {},
      query: {},
    } as unknown as RequestWithOrgContext;

    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    const result = await tenantGuard.canActivate(context);

    expect(result).toBe(true);
    expect(req.organizationId).toBe("org-1");
    expect(req.organization?.name).toBe("Acme Corp");
    expect(req.membership?.role).toBe("MEMBER");
  });
});
