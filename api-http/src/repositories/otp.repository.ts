import prisma from "../lib/db";

export const createOtp = async (email: string, otpHash: string) => {
  await prisma.emailOtp.create({
    data: { email, otpHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });
};

export const verifyOtp = async (
  email: string,
  otpHash: string
): Promise<boolean> => {
  return prisma.$transaction(async (tx) => {
    const record = await tx.emailOtp.findFirst({
      where: {
        email,
        otpHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return false;
    }

    await tx.emailOtp.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    return true;
  });
};

export const countRecentOtps = async (email: string) => {
  return prisma.emailOtp.count({
    where: {
      email,
      createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) },
    },
  });
};
