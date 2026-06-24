/**
 * OTP failed-attempt lockout coverage (issues.md §3.5, ROADMAP Sprint 2).
 * The Prisma client is mocked so this is a pure, DB-free unit test of the
 * verify/increment/lock state machine.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const tx = {
  emailOtp: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("../lib/db", () => ({
  default: {
    $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  },
}));

import { verifyOtp, MAX_OTP_ATTEMPTS } from "./otp.repository";

const EMAIL = "user@example.com";
const RIGHT = "right-hash";
const WRONG = "wrong-hash";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("verifyOtp lockout", () => {
  it("returns 'invalid' when there is no active OTP", async () => {
    tx.emailOtp.findFirst.mockResolvedValue(null);

    expect(await verifyOtp(EMAIL, RIGHT)).toBe("invalid");
  });

  it("returns 'locked' once the active OTP already hit the attempt cap", async () => {
    tx.emailOtp.findFirst.mockResolvedValue({
      id: "a",
      otpHash: RIGHT,
      failedAttempts: MAX_OTP_ATTEMPTS,
    });

    expect(await verifyOtp(EMAIL, RIGHT)).toBe("locked");
    expect(tx.emailOtp.update).not.toHaveBeenCalled();
  });

  it("returns 'ok' and consumes the OTP on a correct guess", async () => {
    tx.emailOtp.findFirst.mockResolvedValue({ id: "a", otpHash: RIGHT, failedAttempts: 0 });

    expect(await verifyOtp(EMAIL, RIGHT)).toBe("ok");
    expect(tx.emailOtp.updateMany).toHaveBeenCalledWith({
      where: { email: EMAIL, used: false },
      data: { used: true },
    });
  });

  it("increments and returns 'invalid' on a wrong guess below the cap", async () => {
    tx.emailOtp.findFirst.mockResolvedValue({ id: "a", otpHash: RIGHT, failedAttempts: 0 });
    tx.emailOtp.update.mockResolvedValue({ failedAttempts: 1 });

    expect(await verifyOtp(EMAIL, WRONG)).toBe("invalid");
    expect(tx.emailOtp.update).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { failedAttempts: { increment: 1 } },
    });
  });

  it("returns 'locked' when a wrong guess reaches the cap", async () => {
    tx.emailOtp.findFirst.mockResolvedValue({
      id: "a",
      otpHash: RIGHT,
      failedAttempts: MAX_OTP_ATTEMPTS - 1,
    });
    tx.emailOtp.update.mockResolvedValue({ failedAttempts: MAX_OTP_ATTEMPTS });

    expect(await verifyOtp(EMAIL, WRONG)).toBe("locked");
  });
});
