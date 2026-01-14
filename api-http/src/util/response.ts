import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  error: string,
  statusCode: number = 400
) {
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error,
  };
  return res.status(statusCode).json(response);
}
