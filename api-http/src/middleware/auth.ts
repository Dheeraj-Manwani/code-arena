import { Response, NextFunction, Request } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Role } from "@prisma/client";
import { sendError } from "../util/response";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "";

const isValidRole = (value: unknown): value is Role =>
  value === Role.creator || value === Role.contestee;

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token || !ACCESS_TOKEN_SECRET) {
      return sendError(res, "UNAUTHORIZED", 401);
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
    if (decoded.type !== "access" || !decoded.sub) {
      return sendError(res, "UNAUTHORIZED", 401);
    }

    const userId =
      typeof decoded.sub === "string" ? parseInt(decoded.sub, 10) : decoded.sub;

    // Trust the signed JWT claims instead of hitting the DB on every request
    // (issues.md §3.1). id + role are both signed at login; there is no
    // revocation list, so a lookup buys cost without benefit.
    if (!userId || Number.isNaN(userId) || !isValidRole(decoded.role)) {
      return sendError(res, "UNAUTHORIZED", 401);
    }

    req.userId = userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return sendError(res, "UNAUTHORIZED", 401);
  }
}

export function requireCreator(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.userRole !== "creator") {
    return sendError(res, "FORBIDDEN", 403);
  }
  next();
}

export function requireContestee(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.userRole !== "contestee") {
    return sendError(res, "FORBIDDEN", 403);
  }
  next();
}
