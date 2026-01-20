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