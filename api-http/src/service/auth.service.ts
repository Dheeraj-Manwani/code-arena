import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "@prisma/client";
import { generateOtp, hashOtp, sendEmail } from "../util/otp";
import * as otpRepo from "../repositories/otp.repository";
import * as userRepo from "../repositories/user.repository";
import {
  InvalidOtpError,
  InvalidTokenError,
  RefreshTokenNotFoundError,
  TooManyOtpRequestsError,
  UserNotFoundError,
} from "../errors/auth.errors";
import { LoginUserInput, VerifyUserInput } from "../schema/user.schema";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error("JWT secrets not configured");
}

export const refreshAccessToken = async (refreshToken?: string) => {
  let payload: JwtPayload;

  if (!refreshToken) {
    throw new RefreshTokenNotFoundError();
  }
  try {
    payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as JwtPayload;
  } catch {
    throw new InvalidTokenError();
  }

  if (payload.type !== "refresh" || !payload.sub) {
    throw new InvalidTokenError();
  }

  const user = await userRepo.getUserFromId(payload.sub);
  if (!user) {
    throw new UserNotFoundError();
  }

  const accessToken = signAccessToken(user);
  return { user, accessToken };
};

export const verifyEmailOtp = async ({ email, otp }: VerifyUserInput) => {
  const otpHash = hashOtp(otp);

  const user = await otpRepo.verifyOtp(email, otpHash);

  if (!user) {
    throw new InvalidOtpError();
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return { user, accessToken, refreshToken };
};

export const requestEmailOtp = async (email: string) => {
  const recentOtps = await otpRepo.countRecentOtps(email);
  console.warn("recentOtps ", recentOtps);
  if (recentOtps >= 5) {
    throw new TooManyOtpRequestsError();
  }
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  await otpRepo.createOtp(email, otpHash);
  await sendEmail(email, otp);
};

export const loginUser = async ({ email }: LoginUserInput) => {
  const user = await userRepo.getUserFromEmail(email);

  if (!user || !user.emailVerified) {
    throw new UserNotFoundError();
  }

  await requestEmailOtp(email);
};

function signAccessToken(user: User) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: "access",
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: "30m" }
  );
}

function signRefreshToken(user: User) {
  return jwt.sign(
    {
      sub: user.id,
      type: "refresh",
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
}
