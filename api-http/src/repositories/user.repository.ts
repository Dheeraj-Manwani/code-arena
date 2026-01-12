import prisma from "../lib/db";

export const getUserFromEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: {
      email,
    },
  });
};

export const getUserFromId = async (id: string) => {
  return await prisma.user.findUnique({
    where: { id },
  });
};
