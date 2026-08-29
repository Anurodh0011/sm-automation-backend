import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { AddMemberDto } from "./dto/add-member.dto";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const slug = dto.slug || this.slugify(dto.name);

    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      throw new ConflictException(
        `An organization with slug '${slug}' already exists`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
        },
      });

      await tx.organizationMembership.create({
        data: {
          userId,
          organizationId: organization.id,
          role: Role.OWNER,
        },
      });

      const defaultWorkspace = await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: "General",
          slug: "general",
          description: "Default general workspace",
        },
      });

      return {
        ...organization,
        defaultWorkspace,
      };
    });
  }

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            workspaces: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return memberships.map((m) => ({
      ...m.organization,
      userRole: m.role,
    }));
  }

  async getOrganizationById(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        organization: {
          include: {
            workspaces: true,
            memberships: {
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
            },
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "Access denied: You are not a member of this organization",
      );
    }

    return {
      ...membership.organization,
      userRole: membership.role,
    };
  }

  async addMember(
    organizationId: string,
    requestingUserId: string,
    dto: AddMemberDto,
  ) {
    const requesterMembership =
      await this.prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: requestingUserId,
            organizationId,
          },
        },
      });

    if (
      !requesterMembership ||
      (requesterMembership.role !== Role.OWNER &&
        requesterMembership.role !== Role.ADMIN)
    ) {
      throw new ForbiddenException(
        "Only Organization Owners or Admins can invite new members",
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!targetUser) {
      throw new NotFoundException(
        `User with email '${dto.email}' was not found`,
      );
    }

    const existingMembership =
      await this.prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: targetUser.id,
            organizationId,
          },
        },
      });

    if (existingMembership) {
      throw new ConflictException(
        "User is already a member of this organization",
      );
    }

    return this.prisma.organizationMembership.create({
      data: {
        userId: targetUser.id,
        organizationId,
        role: dto.role || Role.MEMBER,
      },
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
