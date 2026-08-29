import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export interface RequestWithId extends Request {
  id?: string;
  requestId?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    const existingId = req.headers["x-request-id"];
    const requestId = Array.isArray(existingId)
      ? existingId[0]
      : existingId || randomUUID();

    req.id = requestId;
    req.requestId = requestId;
    req.headers["x-request-id"] = requestId;

    res.setHeader("X-Request-ID", requestId);

    next();
  }
}
