import { Response, NextFunction, Request } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { sendError } from "../util/response";
import prisma from "../lib/db";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "";

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return sendError(res, "UNAUTHORIZED", 401);
    }

    req.userId = user.id;
    req.userRole = user.role;
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
