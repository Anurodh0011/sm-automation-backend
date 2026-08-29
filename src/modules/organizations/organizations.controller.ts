import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { AddMemberDto } from "./dto/add-member.dto";
import type { RequestWithUser } from "../auth/auth.controller";
import { TenantGuard } from "../../common/guards/tenant.guard";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async createOrganization(
    @Request() req: RequestWithUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.createOrganization(req.user.id, dto);
  }

  @Get()
  async getUserOrganizations(@Request() req: RequestWithUser) {
    return this.organizationsService.getUserOrganizations(req.user.id);
  }

  @Get(":id")
  @UseGuards(TenantGuard)
  async getOrganizationById(
    @Param("id") id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationsService.getOrganizationById(id, req.user.id);
  }

  @Post(":id/members")
  @UseGuards(TenantGuard)
  async addMember(
    @Param("id") id: string,
    @Request() req: RequestWithUser,
    @Body() dto: AddMemberDto,
  ) {
    return this.organizationsService.addMember(id, req.user.id, dto);
  }
}
