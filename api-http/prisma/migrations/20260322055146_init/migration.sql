-- CreateEnum
CREATE TYPE "Role" AS ENUM ('creator', 'contestee');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error');

-- CreateEnum
CREATE TYPE "ContestType" AS ENUM ('practice', 'competitive');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('draft', 'published', 'cancelled');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('in_progress', 'submitted', 'timed_out', 'abandoned');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'contestee',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contests" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "maxDurationMs" INTEGER,
    "type" "ContestType" NOT NULL DEFAULT 'competitive',
    "status" "ContestStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" INTEGER NOT NULL,

    CONSTRAINT "contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "contestId" INTEGER NOT NULL,
    "currentProblemId" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "status" "AttemptStatus" NOT NULL DEFAULT 'in_progress',

    CONSTRAINT "ContestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcq_questions" (
    "id" SERIAL NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOptionIndex" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "maxDurationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" INTEGER NOT NULL,

    CONSTRAINT "mcq_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dsa_problems" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "points" INTEGER NOT NULL DEFAULT 100,
    "timeLimit" INTEGER NOT NULL DEFAULT 2000,
    "memoryLimit" INTEGER NOT NULL DEFAULT 256,
    "difficulty" "Difficulty",
    "maxDurationMs" INTEGER,
    "signature" JSONB NOT NULL,
    "inputFormat" TEXT,
    "outputFormat" TEXT,
    "constraints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" INTEGER NOT NULL,

    CONSTRAINT "dsa_problems_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "test_cases" (
    "id" SERIAL NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "problemId" INTEGER NOT NULL,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcq_submissions" (
    "id" SERIAL NOT NULL,
    "selectedOptionIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "contestId" INTEGER NOT NULL,
    "attemptId" INTEGER NOT NULL,

    CONSTRAINT "mcq_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dsa_submissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "testCasesPassed" INTEGER NOT NULL DEFAULT 0,
    "totalTestCases" INTEGER NOT NULL DEFAULT 0,
    "executionTime" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "problemId" INTEGER NOT NULL,
    "contestId" INTEGER NOT NULL,
    "attemptId" INTEGER NOT NULL,

    CONSTRAINT "dsa_submissions_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "contests_creatorId_idx" ON "contests"("creatorId");

-- CreateIndex
CREATE INDEX "contests_startTime_endTime_idx" ON "contests"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "ContestAttempt_userId_idx" ON "ContestAttempt"("userId");

-- CreateIndex
CREATE INDEX "ContestAttempt_contestId_idx" ON "ContestAttempt"("contestId");

-- CreateIndex
CREATE INDEX "ContestQuestion_contestId_idx" ON "ContestQuestion"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestQuestion_contestId_mcqId_key" ON "ContestQuestion"("contestId", "mcqId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestQuestion_contestId_dsaId_key" ON "ContestQuestion"("contestId", "dsaId");

-- CreateIndex
CREATE INDEX "test_cases_problemId_idx" ON "test_cases"("problemId");

-- CreateIndex
CREATE INDEX "mcq_submissions_questionId_idx" ON "mcq_submissions"("questionId");

-- CreateIndex
CREATE INDEX "mcq_submissions_contestId_idx" ON "mcq_submissions"("contestId");

-- CreateIndex
CREATE INDEX "mcq_submissions_attemptId_idx" ON "mcq_submissions"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "mcq_submissions_attemptId_questionId_key" ON "mcq_submissions"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "dsa_submissions_problemId_idx" ON "dsa_submissions"("problemId");

-- CreateIndex
CREATE INDEX "dsa_submissions_contestId_idx" ON "dsa_submissions"("contestId");

-- CreateIndex
CREATE INDEX "dsa_submissions_attemptId_idx" ON "dsa_submissions"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "dsa_submissions_attemptId_problemId_key" ON "dsa_submissions"("attemptId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestLeaderboard_contestId_userId_key" ON "ContestLeaderboard"("contestId", "userId");

-- CreateIndex
CREATE INDEX "EmailOtp_email_used_idx" ON "EmailOtp"("email", "used");

-- CreateIndex
CREATE INDEX "EmailOtp_expiresAt_idx" ON "EmailOtp"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DraftAnswer_attemptId_problemId_key" ON "DraftAnswer"("attemptId", "problemId");

-- AddForeignKey
ALTER TABLE "contests" ADD CONSTRAINT "contests_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAttempt" ADD CONSTRAINT "ContestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAttempt" ADD CONSTRAINT "ContestAttempt_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcq_questions" ADD CONSTRAINT "mcq_questions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsa_problems" ADD CONSTRAINT "dsa_problems_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestQuestion" ADD CONSTRAINT "ContestQuestion_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestQuestion" ADD CONSTRAINT "ContestQuestion_mcqId_fkey" FOREIGN KEY ("mcqId") REFERENCES "mcq_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestQuestion" ADD CONSTRAINT "ContestQuestion_dsaId_fkey" FOREIGN KEY ("dsaId") REFERENCES "dsa_problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "dsa_problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcq_submissions" ADD CONSTRAINT "mcq_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcq_submissions" ADD CONSTRAINT "mcq_submissions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "mcq_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcq_submissions" ADD CONSTRAINT "mcq_submissions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcq_submissions" ADD CONSTRAINT "mcq_submissions_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ContestAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsa_submissions" ADD CONSTRAINT "dsa_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsa_submissions" ADD CONSTRAINT "dsa_submissions_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "dsa_problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsa_submissions" ADD CONSTRAINT "dsa_submissions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsa_submissions" ADD CONSTRAINT "dsa_submissions_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ContestAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLeaderboard" ADD CONSTRAINT "ContestLeaderboard_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestLeaderboard" ADD CONSTRAINT "ContestLeaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
