import { Request, Response } from "express";
import * as authService from "../service/auth.service";
import { sendSuccess } from "../util/response";
import {
  LoginSchema,
  SignUpSchema,
  VerifyOtpSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "../schema/auth.schema";

export const refreshAuth = async (req: Request, res: Response) => {
  const { user, accessToken } = await authService.refreshAccessToken(
    req.cookies?.refreshToken
  );

  return sendSuccess(res, { user, accessToken });
};

export const signUp = async (req: Request, res: Response) => {
  const data = SignUpSchema.parse(req.body);
  await authService.signUp(data);
  return sendSuccess(res, { message: "OTP sent to email" }, 200);
};

export const verifyUser = async (req: Request, res: Response) => {
  const input = VerifyOtpSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.verifyEmailOtp(
    input
  );

  setRefreshCookie(res, refreshToken);

  return sendSuccess(res, { user, accessToken }, 200);
};

export const loginUser = async (req: Request, res: Response) => {
  const data = LoginSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.loginUser(data);

  setRefreshCookie(res, refreshToken);

  return sendSuccess(res, { user, accessToken }, 200);
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  return sendSuccess(res, { message: "Logged out" });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const data = ForgotPasswordSchema.parse(req.body);
  await authService.requestPasswordReset(data);
  return sendSuccess(res, { message: "OTP sent to email" }, 200);
};

export const resetPassword = async (req: Request, res: Response) => {
  const data = ResetPasswordSchema.parse(req.body);
  await authService.resetPassword(data);
  return sendSuccess(res, { message: "Password reset successfully" }, 200);
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie("refreshToken", token, {
    path: "/api/auth/refresh",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
