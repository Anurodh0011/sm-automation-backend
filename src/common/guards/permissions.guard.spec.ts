import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { PermissionsGuard } from "./permissions.guard";
import { Permission } from "../enums/permission.enum";
import { RequestWithOrgContext } from "../decorators/active-org.decorator";

describe("PermissionsGuard", () => {
  let permissionsGuard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    permissionsGuard = new PermissionsGuard(reflector);
  });

  const createMockContext = (membership?: { role: Role }): ExecutionContext => {
    const req = {
      membership,
    } as unknown as RequestWithOrgContext;

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  it("should allow access if no permissions or roles are specified on route", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

    const context = createMockContext({ role: Role.MEMBER });
    expect(permissionsGuard.canActivate(context)).toBe(true);
  });

  it("should throw ForbiddenException if request membership context is missing", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue([Permission.CONTENT_READ]);

    const context = createMockContext(undefined);
    expect(() => permissionsGuard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it("should throw ForbiddenException if MEMBER role attempts to manage org members", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockImplementation((key) =>
        key === "permissions" ? [Permission.ORG_MEMBERS_MANAGE] : undefined,
      );

    const context = createMockContext({ role: Role.MEMBER });
    expect(() => permissionsGuard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it("should allow ADMIN role to manage org members", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockImplementation((key) =>
        key === "permissions" ? [Permission.ORG_MEMBERS_MANAGE] : undefined,
      );

    const context = createMockContext({ role: Role.ADMIN });
    expect(permissionsGuard.canActivate(context)).toBe(true);
  });

  it("should allow OWNER role to delete workspace", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockImplementation((key) =>
        key === "permissions" ? [Permission.WORKSPACE_DELETE] : undefined,
      );

    const context = createMockContext({ role: Role.OWNER });
    expect(permissionsGuard.canActivate(context)).toBe(true);
  });
});
