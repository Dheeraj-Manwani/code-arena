import { Request } from "express";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: "creator" | "contestee";
}

export {};
