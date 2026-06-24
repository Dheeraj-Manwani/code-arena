-- Add failed-attempt counter for OTP brute-force lockout (issues.md §3.5).
ALTER TABLE "EmailOtp" ADD COLUMN "failedAttempts" INTEGER NOT NULL DEFAULT 0;
