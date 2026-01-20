import { Request } from "express";
import "express";

declare global {
  namespace Express {
    interface Request {
      userId: number;
      userRole: "creator" | "contestee";
    }
  }
}


export interface AuthRequest extends Request {
  userId: number;
  userRole?: "creator" | "contestee";
}

