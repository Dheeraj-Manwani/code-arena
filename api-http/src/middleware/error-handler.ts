import { ZodError } from "zod";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";
import { sendError } from "../util/response";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return sendError(res, "INVALID_REQUEST", 400);
  }

  if ((err as any).code === "P2002") {
    return sendError(res, "ALREADY_SUBMITTED", 400);
  }

  if (err instanceof AppError) {
    return sendError(
      res,
      err.code || err.message.toUpperCase().replace(/\s+/g, "_"),
      err.statusCode
    );
  }

  console.error("Unhandled error:", err);
  return sendError(res, "INTERNAL_SERVER_ERROR", 500);
}
