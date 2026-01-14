import prisma from "../lib/db";

export const getUserFromEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: {
      email,
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
  role?: string;
}) => {
  return await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: data.password,
      role: (data.role || "contestee") as "creator" | "contestee",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
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
