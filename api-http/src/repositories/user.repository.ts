import prisma from "../lib/db";
import { Role } from "@prisma/client";

export const getUserFromEmail = async (email: string, isVerified?: boolean) => {
  return await prisma.user.findUnique({
    where: {
      email,
      ...(typeof isVerified === "boolean" ? { isVerified } : {}),
    },
  });
};

export const getUserFromId = async (id: number) => {
  return await prisma.user.findUnique({
    where: { id },
  });
};

export const getUserFromGoogleId = async (googleId: string) => {
  return await prisma.user.findUnique({
    where: { googleId },
  });
};

/**
 * A new account created from a Google profile.
 *
 * `password: null` — there is nothing to hash — and `isVerified: true`, because
 * Google has already proven the user controls the address. The caller must have
 * checked `email_verified` first.
 */
export const createGoogleUser = async (data: {
  name: string;
  email: string;
  googleId: string;
  imageUrl?: string | null;
}) => {
  return await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      googleId: data.googleId,
      imageUrl: data.imageUrl ?? null,
      password: null,
      role: "contestee",
      isVerified: true,
    },
  });
};

/**
 * Attach a Google identity to an existing account.
 *
 * Also flips `isVerified`: reaching here means Google vouched for the address,
 * which is the same proof our OTP flow was after. Any existing password is left
 * untouched, so the user keeps both sign-in methods.
 */
export const linkGoogleToUser = async (
  userId: number,
  data: { googleId: string; imageUrl?: string | null },
) => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      googleId: data.googleId,
      isVerified: true,
      // Never clobber an existing avatar with an empty Google one.
      ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
    },
  });
};

export const createUser = async (data: {
  name: string;
  email: string;
  password: string;
  role: Role;
  isVerified?: boolean;
}) => {
  return await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      isVerified: data.isVerified ?? false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
    },
  });
};

export const getUsersByIds = async (ids: number[]) => {
  return await prisma.user.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });
};

export const markUserVerified = async (userId: number) => {
  return prisma.user.update({
    where: { id: userId },
    data: { isVerified: true },
  });
};

export const updateUserPassword = async (userId: number, passwordHash: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { password: passwordHash },
  });
};

/** Refresh an unverified account's name/password when the user re-signs up (issues.md §3.6). */
export const updateUnverifiedUser = async (
  userId: number,
  data: { name: string; password: string },
) => {
  return prisma.user.update({
    where: { id: userId },
    data: { name: data.name, password: data.password },
  });
};