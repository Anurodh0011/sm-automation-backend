import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export interface RequestWithOrgContext extends Request {
  user?: { id: string; email: string };
  organizationId?: string;
  organization?: { id: string; name: string; slug: string };
  membership?: { id: string; role: string };
}

export const ActiveOrgId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithOrgContext>();
    const headerOrgId = request.headers["x-organization-id"];
    const headerValue = Array.isArray(headerOrgId)
      ? headerOrgId[0]
      : headerOrgId;
    return request.organizationId || headerValue;
  },
);

export const ActiveOrg = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithOrgContext>();
    return request.organization;
  },
);
