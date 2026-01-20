import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "@prisma/client";
import { generateOtp, hashOtp, sendEmail } from "../util/otp";
import * as otpRepo from "../repositories/otp.repository";
import * as userRepo from "../repositories/user.repository";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidOtpError,
  InvalidTokenError,
  RefreshTokenNotFoundError,
  TooManyOtpRequestsError,
  UserNotFoundError,
  UserNotVerifiedError,
} from "../errors/auth.errors";
import {
  LoginInput,
  SignUpInput,
  VerifyOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "../schema/auth.schema";
import { SessionUserSchema, type SessionUser } from "../schema/user.schema";

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

  const userId =
    typeof payload.sub === "string" ? parseInt(payload.sub, 10) : payload.sub;

  if (!userId || Number.isNaN(userId)) {
    throw new InvalidTokenError();
  }

  const user = await userRepo.getUserFromId(userId);
  if (!user) {
    throw new UserNotFoundError();
  }

  const accessToken = signAccessToken(user);
  const sessionUser = toSessionUser(user);

  return { user: sessionUser, accessToken };
};

export const verifyEmailOtp = async (input: VerifyOtpInput) => {
  const otpHash = hashOtp(input.otp);

  const user = await userRepo.getUserFromEmail(input.email);
  if (!user) {
    throw new UserNotFoundError();
  }

  const isValidOtp = await otpRepo.verifyOtp(input.email, otpHash);

  if (!isValidOtp) {
    throw new InvalidOtpError();
  }

  const isUserVerified = user.isVerified;

  const verifiedUser = isUserVerified
    ? user
    : await userRepo.markUserVerified(user.id);
  const sessionUser = toSessionUser(verifiedUser);

  const accessToken = signAccessToken(sessionUser);
  const refreshToken = signRefreshToken(sessionUser);

  return { user: sessionUser, accessToken, refreshToken };
};

export const requestEmailOtp = async (email: string) => {
  const recentOtps = await otpRepo.countRecentOtps(email);
  if (recentOtps >= 5) {
    throw new TooManyOtpRequestsError();
  }
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  await otpRepo.createOtp(email, otpHash);
  await sendEmail(email, otp);
};

export const signUp = async ({ email, name, password }: SignUpInput) => {
  const existingUser = await userRepo.getUserFromEmail(email);

  if (existingUser && existingUser.isVerified) {
    throw new EmailAlreadyExistsError();
  }

  const passwordHash = await bcrypt.hash(password, 10);

  if (!existingUser) {
    await userRepo.createUser({
      email,
      name,
      password: passwordHash,
      role: 'creator',
      isVerified: false,
    });
  }

  await requestEmailOtp(email);
};

export const loginUser = async ({ email, password }: LoginInput) => {
  const user = await userRepo.getUserFromEmail(email);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  if (!user.isVerified) {
    throw new UserNotVerifiedError();
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new InvalidCredentialsError();
  }

  const sessionUser = toSessionUser(user);
  const accessToken = signAccessToken(sessionUser);
  const refreshToken = signRefreshToken(sessionUser);

  return { user: sessionUser, accessToken, refreshToken };
};

function signAccessToken(user: SessionUser) {
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

function signRefreshToken(user: SessionUser) {
  return jwt.sign(
    {
      sub: user.id,
      type: "refresh",
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
}

export const requestPasswordReset = async ({ email }: ForgotPasswordInput) => {
  const user = await userRepo.getUserFromEmail(email);

  // Don't reveal if user exists for security
  if (!user) {
    return;
  }

  // Send OTP for password reset
  await requestEmailOtp(email);
};

export const resetPassword = async ({
  email,
  otp,
  newPassword,
}: ResetPasswordInput) => {
  const user = await userRepo.getUserFromEmail(email);

  if (!user) {
    throw new UserNotFoundError();
  }

  // Verify OTP
  const otpHash = hashOtp(otp);
  const isValidOtp = await otpRepo.verifyOtp(email, otpHash);

  if (!isValidOtp) {
    throw new InvalidOtpError();
  }

  // Update password
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userRepo.updateUserPassword(user.id, passwordHash);
};

function toSessionUser(user: User): SessionUser {
  return SessionUserSchema.parse({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
  });
}
