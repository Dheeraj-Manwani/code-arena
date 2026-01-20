import { ZodError } from "zod";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";
import { sendError } from "../util/response";
import { ApiErrorCode } from "../schema/error.schema";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return sendError(res, ApiErrorCode.INVALID_REQUEST, 400);
  }

  if ((err as any).code === "P2002") {
    return sendError(res, ApiErrorCode.ALREADY_SUBMITTED, 400);
  }

  if (err instanceof AppError) {
    return sendError(
      res,
      (err.code as ApiErrorCode) || ApiErrorCode.INTERNAL_SERVER_ERROR,
      err.statusCode
    );
  }

  console.error("Unhandled error:", err);
  return sendError(res, ApiErrorCode.INTERNAL_SERVER_ERROR, 500);
}
