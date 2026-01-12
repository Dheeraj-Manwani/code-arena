import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

type ValidateTarget = "body" | "query" | "params";

export const validate =
  (schema: ZodType, target: ValidateTarget = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      req[target] = schema.parse(req[target]);
      next();
    } catch (err) {
      next(err);
    }
  };
