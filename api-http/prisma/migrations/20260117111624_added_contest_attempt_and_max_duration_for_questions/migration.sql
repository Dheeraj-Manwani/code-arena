/*
  Warnings:

  - Added the required column `attemptId` to the `dsa_submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contestId` to the `dsa_submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attemptId` to the `mcq_submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contestId` to the `mcq_submissions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('in_progress', 'submitted', 'timed_out', 'abandoned');

-- DropIndex
DROP INDEX "dsa_submissions_userId_problemId_key";

-- DropIndex
DROP INDEX "mcq_submissions_userId_questionId_key";

-- AlterTable
ALTER TABLE "contests" ADD COLUMN     "maxDurationMs" INTEGER,
ALTER COLUMN "startTime" DROP NOT NULL,
ALTER COLUMN "endTime" DROP NOT NULL;

-- AlterTable
ALTER TABLE "dsa_problems" ADD COLUMN     "maxDurationMs" INTEGER;

-- AlterTable
ALTER TABLE "dsa_submissions" ADD COLUMN     "attemptId" INTEGER NOT NULL,
ADD COLUMN     "contestId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "mcq_questions" ADD COLUMN     "maxDurationMs" INTEGER;

-- AlterTable
ALTER TABLE "mcq_submissions" ADD COLUMN     "attemptId" INTEGER NOT NULL,
ADD COLUMN     "contestId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "ContestAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "contestId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "status" "AttemptStatus" NOT NULL DEFAULT 'in_progress',

    CONSTRAINT "ContestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContestAttempt_userId_idx" ON "ContestAttempt"("userId");

-- CreateIndex
CREATE INDEX "ContestAttempt_contestId_idx" ON "ContestAttempt"("contestId");

-- CreateIndex
CREATE INDEX "dsa_submissions_contestId_idx" ON "dsa_submissions"("contestId");

-- CreateIndex
CREATE INDEX "dsa_submissions_attemptId_idx" ON "dsa_submissions"("attemptId");

-- CreateIndex
CREATE INDEX "mcq_submissions_contestId_idx" ON "mcq_submissions"("contestId");

-- CreateIndex
CREATE INDEX "mcq_submissions_attemptId_idx" ON "mcq_submissions"("attemptId");

-- AddForeignKey
ALTER TABLE "ContestAttempt" ADD CONSTRAINT "ContestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAttempt" ADD CONSTRAINT "ContestAttempt_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcq_submissions" ADD CONSTRAINT "mcq_submissions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcq_submissions" ADD CONSTRAINT "mcq_submissions_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ContestAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsa_submissions" ADD CONSTRAINT "dsa_submissions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsa_submissions" ADD CONSTRAINT "dsa_submissions_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ContestAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
