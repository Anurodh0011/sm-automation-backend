import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { WorkspacesService } from "./workspaces.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { ActiveOrgId } from "../../common/decorators/active-org.decorator";

@Controller("workspaces")
@UseGuards(TenantGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  async createWorkspace(
    @ActiveOrgId() organizationId: string,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.createWorkspace(organizationId, dto);
  }

  @Get()
  async getOrganizationWorkspaces(@ActiveOrgId() organizationId: string) {
    return this.workspacesService.getOrganizationWorkspaces(organizationId);
  }

  @Get(":id")
  async getWorkspaceById(
    @Param("id") id: string,
    @ActiveOrgId() organizationId: string,
  ) {
    return this.workspacesService.getWorkspaceById(id, organizationId);
  }
}
