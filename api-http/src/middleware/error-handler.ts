import { ZodError } from "zod";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  console.error("Unhandled error:", err);

  return res.status(500).json({
    message: "Internal server error",
  });
}
