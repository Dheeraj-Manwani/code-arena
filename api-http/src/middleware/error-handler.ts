import { ZodError } from "zod";
import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/app-error";
import { sendError } from "../util/response";
import { ApiErrorCode } from "../schema/error.schema";

const isProduction = process.env.NODE_ENV === "production";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return sendError(res, ApiErrorCode.INVALID_REQUEST, 400);
  }

  if (err instanceof AppError) {
    return sendError(
      res,
      (err.code as ApiErrorCode) || ApiErrorCode.INTERNAL_SERVER_ERROR,
      err.statusCode
    );
  }

  // Prisma errors: never surface table/column names or query internals to the
  // client (issues.md §5.7). Map the few we care about to clean codes; everything
  // else collapses to a generic 500.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return sendError(res, ApiErrorCode.ALREADY_SUBMITTED, 400);
    }
    if (err.code === "P2025") {
      return sendError(res, ApiErrorCode.CONTEST_NOT_FOUND, 404);
    }
    logUnhandled(err);
    return sendError(res, ApiErrorCode.INTERNAL_SERVER_ERROR, 500);
  }

  if (
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    logUnhandled(err);
    return sendError(res, ApiErrorCode.INTERNAL_SERVER_ERROR, 500);
  }

  logUnhandled(err);
  return sendError(res, ApiErrorCode.INTERNAL_SERVER_ERROR, 500);
}

function logUnhandled(err: unknown) {
  // Log full detail server-side; in production keep it terse to avoid noisy stacks.
  if (isProduction) {
    const name = err instanceof Error ? err.name : "Error";
    const code = (err as { code?: string })?.code;
    console.error(`Unhandled error: ${name}${code ? ` (${code})` : ""}`);
  } else {
    console.error("Unhandled error:", err);
  }
}
