/*
  Warnings:

  - A unique constraint covering the columns `[userId,contestId,status]` on the table `ContestAttempt` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `deadlineAt` to the `ContestAttempt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ContestAttempt" ADD COLUMN     "deadlineAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "DraftAnswer" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "problemId" INTEGER NOT NULL,
    "code" TEXT,
    "language" TEXT,
    "mcqOption" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DraftAnswer_attemptId_problemId_key" ON "DraftAnswer"("attemptId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestAttempt_userId_contestId_status_key" ON "ContestAttempt"("userId", "contestId", "status");
