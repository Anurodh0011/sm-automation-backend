import { Controller, Get, UseGuards } from "@nestjs/common";
import { UsageService } from "./usage.service";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { Permission } from "../../common/enums/permission.enum";
import { ActiveOrgId } from "../../common/decorators/active-org.decorator";

@Controller("usage")
@UseGuards(TenantGuard, PermissionsGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get("summary")
  @RequirePermissions(Permission.ORG_READ)
  async getUsageSummary(@ActiveOrgId() organizationId: string) {
    return this.usageService.getOrganizationUsageSummary(organizationId);
  }
}
