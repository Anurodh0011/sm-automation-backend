import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { WorkspacesService } from "./workspaces.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { Permission } from "../../common/enums/permission.enum";
import { ActiveOrgId } from "../../common/decorators/active-org.decorator";

@Controller("workspaces")
@UseGuards(TenantGuard, PermissionsGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @RequirePermissions(Permission.WORKSPACE_CREATE)
  async createWorkspace(
    @ActiveOrgId() organizationId: string,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.createWorkspace(organizationId, dto);
  }

  @Get()
  @RequirePermissions(Permission.WORKSPACE_READ)
  async getOrganizationWorkspaces(@ActiveOrgId() organizationId: string) {
    return this.workspacesService.getOrganizationWorkspaces(organizationId);
  }

  @Get(":id")
  @RequirePermissions(Permission.WORKSPACE_READ)
  async getWorkspaceById(
    @Param("id") id: string,
    @ActiveOrgId() organizationId: string,
  ) {
    return this.workspacesService.getWorkspaceById(id, organizationId);
  }
}
