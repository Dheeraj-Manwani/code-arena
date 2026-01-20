/*
  Warnings:

  - You are about to drop the column `contestId` on the `dsa_problems` table. All the data in the column will be lost.
  - The `tags` column on the `dsa_problems` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `contestId` on the `mcq_questions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,problemId]` on the table `dsa_submissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `contests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `dsa_problems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `mcq_questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContestType" AS ENUM ('practice', 'competitive');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('draft', 'scheduled', 'running', 'ended', 'cancelled');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- DropForeignKey
ALTER TABLE "dsa_problems" DROP CONSTRAINT "dsa_problems_contestId_fkey";

-- DropForeignKey
ALTER TABLE "mcq_questions" DROP CONSTRAINT "mcq_questions_contestId_fkey";

-- DropIndex
DROP INDEX "dsa_submissions_problemId_userId_idx";

-- AlterTable
ALTER TABLE "contests" ADD COLUMN     "status" "ContestStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN     "type" "ContestType" NOT NULL DEFAULT 'competitive',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "dsa_problems" DROP COLUMN "contestId",
ADD COLUMN     "difficulty" "Difficulty",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "tags",
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "mcq_questions" DROP COLUMN "contestId",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "ContestQuestion" (
    "id" SERIAL NOT NULL,
    "contestId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "mcqId" INTEGER,
    "dsaId" INTEGER,

    CONSTRAINT "ContestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestLeaderboard" (
    "id" SERIAL NOT NULL,
    "contestId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "ContestLeaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContestQuestion_contestId_idx" ON "ContestQuestion"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestLeaderboard_contestId_userId_key" ON "ContestLeaderboard"("contestId", "userId");

-- CreateIndex
CREATE INDEX "EmailOtp_email_used_idx" ON "EmailOtp"("email", "used");

-- CreateIndex
CREATE INDEX "EmailOtp_expiresAt_idx" ON "EmailOtp"("expiresAt");

-- CreateIndex
CREATE INDEX "contests_creatorId_idx" ON "contests"("creatorId");

-- CreateIndex
CREATE INDEX "contests_startTime_endTime_idx" ON "contests"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "dsa_submissions_problemId_idx" ON "dsa_submissions"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "dsa_submissions_userId_problemId_key" ON "dsa_submissions"("userId", "problemId");

-- CreateIndex
CREATE INDEX "mcq_submissions_questionId_idx" ON "mcq_submissions"("questionId");

-- CreateIndex
CREATE INDEX "test_cases_problemId_idx" ON "test_cases"("problemId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "ContestQuestion" ADD CONSTRAINT "ContestQuestion_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestQuestion" ADD CONSTRAINT "ContestQuestion_mcqId_fkey" FOREIGN KEY ("mcqId") REFERENCES "mcq_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestQuestion" ADD CONSTRAINT "ContestQuestion_dsaId_fkey" FOREIGN KEY ("dsaId") REFERENCES "dsa_problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLeaderboard" ADD CONSTRAINT "ContestLeaderboard_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLeaderboard" ADD CONSTRAINT "ContestLeaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
