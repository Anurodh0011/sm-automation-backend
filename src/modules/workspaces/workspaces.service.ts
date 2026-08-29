import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async createWorkspace(organizationId: string, dto: CreateWorkspaceDto) {
    const slug = dto.slug || this.slugify(dto.name);

    const existingWorkspace = await this.prisma.workspace.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
    });

    if (existingWorkspace) {
      throw new ConflictException(
        `A workspace with slug '${slug}' already exists in this organization`,
      );
    }

    return this.prisma.workspace.create({
      data: {
        organizationId,
        name: dto.name,
        slug,
        description: dto.description,
      },
    });
  }

  async getOrganizationWorkspaces(organizationId: string) {
    return this.prisma.workspace.findMany({
      where: {
        organizationId,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getWorkspaceById(workspaceId: string, organizationId: string) {
    // SAFE MULTI-TENANT QUERY: Explicitly enforces organizationId boundary
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        organizationId,
      },
    });

    if (!workspace) {
      throw new NotFoundException(
        "Workspace was not found in active organization context",
      );
    }

    return workspace;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}
