/*
  Warnings:

  - A unique constraint covering the columns `[contestId,mcqId]` on the table `ContestQuestion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[contestId,dsaId]` on the table `ContestQuestion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[attemptId,problemId]` on the table `dsa_submissions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[attemptId,questionId]` on the table `mcq_submissions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ContestAttempt_userId_contestId_status_key";

-- CreateIndex
CREATE UNIQUE INDEX "ContestQuestion_contestId_mcqId_key" ON "ContestQuestion"("contestId", "mcqId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestQuestion_contestId_dsaId_key" ON "ContestQuestion"("contestId", "dsaId");

-- CreateIndex
CREATE UNIQUE INDEX "dsa_submissions_attemptId_problemId_key" ON "dsa_submissions"("attemptId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "mcq_submissions_attemptId_questionId_key" ON "mcq_submissions"("attemptId", "questionId");
