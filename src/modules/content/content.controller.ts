import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ContentService } from "./content.service";
import { GenerateContentDto } from "./dto/generate-content.dto";
import { CreateContentDto } from "./dto/create-content.dto";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { Permission } from "../../common/enums/permission.enum";
import { ActiveOrgId } from "../../common/decorators/active-org.decorator";
import type { RequestWithUser } from "../auth/auth.controller";

@Controller("content")
@UseGuards(TenantGuard, PermissionsGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post("generate")
  @RequirePermissions(Permission.CONTENT_GENERATE)
  async generateContent(
    @Request() req: RequestWithUser,
    @ActiveOrgId() organizationId: string,
    @Body() dto: GenerateContentDto,
  ) {
    return this.contentService.generateContent(
      req.user.id,
      organizationId,
      dto,
    );
  }

  @Post()
  @RequirePermissions(Permission.CONTENT_CREATE)
  async createContent(
    @Request() req: RequestWithUser,
    @ActiveOrgId() organizationId: string,
    @Body() dto: CreateContentDto,
  ) {
    return this.contentService.createContent(req.user.id, organizationId, dto);
  }

  @Get()
  @RequirePermissions(Permission.CONTENT_READ)
  async getWorkspaceContents(
    @ActiveOrgId() organizationId: string,
    @Query("workspaceId") workspaceId?: string,
  ) {
    return this.contentService.getWorkspaceContents(
      organizationId,
      workspaceId,
    );
  }

  @Get(":id")
  @RequirePermissions(Permission.CONTENT_READ)
  async getContentById(
    @Param("id") id: string,
    @ActiveOrgId() organizationId: string,
  ) {
    return this.contentService.getContentById(id, organizationId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CONTENT_DELETE)
  async deleteContent(
    @Param("id") id: string,
    @ActiveOrgId() organizationId: string,
  ) {
    return this.contentService.deleteContent(id, organizationId);
  }
}
