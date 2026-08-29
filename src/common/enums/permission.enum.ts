import { Role } from "@prisma/client";

export enum Permission {
  // Content permissions
  CONTENT_READ = "content.read",
  CONTENT_CREATE = "content.create",
  CONTENT_UPDATE = "content.update",
  CONTENT_DELETE = "content.delete",
  CONTENT_GENERATE = "content.generate",

  // Workspace permissions
  WORKSPACE_READ = "workspace.read",
  WORKSPACE_CREATE = "workspace.create",
  WORKSPACE_UPDATE = "workspace.update",
  WORKSPACE_DELETE = "workspace.delete",

  // Organization permissions
  ORG_READ = "org.read",
  ORG_UPDATE = "org.update",
  ORG_MEMBERS_MANAGE = "org.members.manage",
}

export const ROLE_PERMISSIONS_MAP: Record<Role, Permission[]> = {
  [Role.OWNER]: [
    Permission.CONTENT_READ,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.CONTENT_DELETE,
    Permission.CONTENT_GENERATE,
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_CREATE,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_DELETE,
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_MEMBERS_MANAGE,
  ],
  [Role.ADMIN]: [
    Permission.CONTENT_READ,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.CONTENT_DELETE,
    Permission.CONTENT_GENERATE,
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_CREATE,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_DELETE,
    Permission.ORG_READ,
    Permission.ORG_MEMBERS_MANAGE,
  ],
  [Role.MEMBER]: [
    Permission.CONTENT_READ,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.CONTENT_GENERATE,
    Permission.WORKSPACE_READ,
    Permission.ORG_READ,
  ],
};
