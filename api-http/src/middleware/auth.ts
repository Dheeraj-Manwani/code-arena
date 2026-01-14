import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "../util/response";
import prisma from "../lib/db";
import { AuthRequest } from "../types/express.d";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return sendError(res, "UNAUTHORIZED", 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return sendError(res, "UNAUTHORIZED", 401);
    }

    req.userId = user.id;
    req.userRole = user.role as "creator" | "contestee";
    next();
  } catch (error) {
    return sendError(res, "UNAUTHORIZED", 401);
  }
}

export function requireCreator(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.userRole !== "creator") {
    return sendError(res, "FORBIDDEN", 403);
  }
  next();
}

export function requireContestee(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.userRole !== "contestee") {
    return sendError(res, "FORBIDDEN", 403);
  }
  next();
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}
