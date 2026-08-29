import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestWithOrgContext } from "../decorators/active-org.decorator";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithOrgContext>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User identity not established");
    }

    // 1. Resolve Organization ID from Headers, Params, or Query
    const headerOrgId = request.headers["x-organization-id"];
    const headerValue = Array.isArray(headerOrgId)
      ? headerOrgId[0]
      : headerOrgId;
    const params = request.params as
      Record<string, string | undefined> | undefined;
    const query = request.query as
      Record<string, string | undefined> | undefined;

    const paramOrgId = params?.orgId || params?.organizationId;
    const queryOrgId = query?.orgId;

    const organizationId = headerValue || paramOrgId || queryOrgId;

    if (!organizationId) {
      throw new BadRequestException(
        "X-Organization-Id header or organizationId parameter is required",
      );
    }

    // 2. Validate user membership in target organization
    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "Access denied: You are not a member of this organization",
      );
    }

    // 3. Attach tenant context to request
    request.organizationId = membership.organizationId;
    request.organization = membership.organization;
    request.membership = membership;

    return true;
  }
}
