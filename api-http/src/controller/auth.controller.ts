import { Request, Response } from "express";
import * as authService from "../service/auth.service";
import * as userRepo from "../repositories/user.repository";
import { getSessionUser } from "../util/mappers";

export const refreshAuth = async (req: Request, res: Response) => {
  const { user, accessToken } = await authService.refreshAccessToken(
    req.cookies.refreshToken
  );

  return res.json({
    user: getSessionUser(user),
    accessToken,
  });
};

export const registerUser = async (req: Request, res: Response) => {
  const { email } = req.body;

  await authService.requestEmailOtp(email);
  return res.json({ message: "OTP sent to email" });
};

export const verifyUser = async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.verifyEmailOtp(
    req.body
  );

  setRefreshCookie(res, refreshToken);

  return res.json({
    user: getSessionUser(user),
    accessToken,
  });
};

export const loginUser = async (req: Request, res: Response) => {
  authService.loginUser(req.body);
  return res.json({ message: "OTP sent to email" });
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  return res.json({ message: "Logged out" });
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
