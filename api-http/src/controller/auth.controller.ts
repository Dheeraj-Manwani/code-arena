import { Request, Response } from "express";
import * as authService from "../service/auth.service";
import { sendSuccess } from "../util/response";
import { SignUpSchema, LoginSchema } from "../schema/auth.schema";

export const signUp = async (req: Request, res: Response) => {
  const data = SignUpSchema.parse(req.body);
  const user = await authService.signUp(data);
  return sendSuccess(res, user, 201);
};

export const login = async (req: Request, res: Response) => {
  const data = LoginSchema.parse(req.body);
  const result = await authService.login(data);
  return sendSuccess(res, result, 200);
};
