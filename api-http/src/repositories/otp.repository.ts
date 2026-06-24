import prisma from "../lib/db";

/** Lock the active OTP after this many incorrect verification guesses (issues.md §3.5). */
export const MAX_OTP_ATTEMPTS = 5;

export type OtpVerifyResult = "ok" | "invalid" | "locked";

export const createOtp = async (email: string, otpHash: string) => {
  await prisma.emailOtp.create({
    data: { email, otpHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });
};

/**
 * Verify an OTP guess against the most-recent active code for the email.
 *
 * Unlike the previous exact-hash lookup, this counts wrong guesses against the
 * active OTP and locks it after MAX_OTP_ATTEMPTS misses, closing the brute-force
 * window (6 digits = 1M combos). The per-IP throttle on the route complements this.
 */
export const verifyOtp = async (
  email: string,
  otpHash: string
): Promise<OtpVerifyResult> => {
  return prisma.$transaction(async (tx) => {
    const record = await tx.emailOtp.findFirst({
      where: {
        email,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return "invalid";
    }

    if (record.failedAttempts >= MAX_OTP_ATTEMPTS) {
      return "locked";
    }

    if (record.otpHash === otpHash) {
      await tx.emailOtp.updateMany({
        where: { email, used: false },
        data: { used: true },
      });
      return "ok";
    }

    const updated = await tx.emailOtp.update({
      where: { id: record.id },
      data: { failedAttempts: { increment: 1 } },
    });

    return updated.failedAttempts >= MAX_OTP_ATTEMPTS ? "locked" : "invalid";
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
