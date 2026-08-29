import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Permission, ROLE_PERMISSIONS_MAP } from "../enums/permission.enum";
import { RequestWithOrgContext } from "../decorators/active-org.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no specific permissions or roles are required, allow access
    if (
      (!requiredPermissions || requiredPermissions.length === 0) &&
      (!requiredRoles || requiredRoles.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithOrgContext>();
    const membership = request.membership;

    if (!membership || !membership.role) {
      throw new ForbiddenException("Tenant context or membership role missing");
    }

    const userRole = membership.role as Role;

    // 1. Role Validation Check
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(userRole);
      if (!hasRole) {
        throw new ForbiddenException(
          `Forbidden resource: Requires one of [${requiredRoles.join(", ")}] roles`,
        );
      }
    }

    // 2. Permission Validation Check
    if (requiredPermissions && requiredPermissions.length > 0) {
      const grantedPermissions = ROLE_PERMISSIONS_MAP[userRole] || [];
      const hasAllPermissions = requiredPermissions.every((permission) =>
        grantedPermissions.includes(permission),
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException(
          `Forbidden resource: Your role '${userRole}' lacks required permissions: [${requiredPermissions.join(", ")}]`,
        );
      }
    }

    return true;
  }
}
