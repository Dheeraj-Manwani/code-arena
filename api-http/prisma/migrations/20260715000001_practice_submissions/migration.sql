-- Standalone practice submissions + drafts (PRACTICE_MODE_AND_NAVIGATION.md §4.1, §4.7).
--
-- Separate tables rather than nullable contest/attempt FKs on the existing
-- submission tables: the contest tables keep their NOT NULL invariants, and no
-- existing contest query changes meaning. Nothing here touches dsa_submissions,
-- mcq_submissions, contest_attempts, or draft_answers.

CREATE TABLE "practice_submissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "testCasesPassed" INTEGER NOT NULL DEFAULT 0,
    "totalTestCases" INTEGER NOT NULL DEFAULT 0,
    "executionTime" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "problemId" INTEGER NOT NULL,

    CONSTRAINT "practice_submissions_pkey" PRIMARY KEY ("id")
);

-- A user's submission history for one problem.
CREATE INDEX "practice_submissions_userId_problemId_submittedAt_idx"
    ON "practice_submissions"("userId", "problemId", "submittedAt");

-- The boot reconciler sweeps status='pending' (jobs/reconcile.ts); without this
-- index that sweep is a sequential scan over every practice submission ever made.
CREATE INDEX "practice_submissions_status_idx" ON "practice_submissions"("status");

ALTER TABLE "practice_submissions"
    ADD CONSTRAINT "practice_submissions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "practice_submissions"
    ADD CONSTRAINT "practice_submissions_problemId_fkey"
    FOREIGN KEY ("problemId") REFERENCES "dsa_problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------

CREATE TABLE "practice_drafts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "problemId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_drafts_pkey" PRIMARY KEY ("id")
);

-- Both columns are NOT NULL, so this unique constraint actually holds — the
-- reason practice drafts don't reuse draft_answers (§4.7).
CREATE UNIQUE INDEX "practice_drafts_userId_problemId_key"
    ON "practice_drafts"("userId", "problemId");

ALTER TABLE "practice_drafts"
    ADD CONSTRAINT "practice_drafts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "practice_drafts"
    ADD CONSTRAINT "practice_drafts_problemId_fkey"
    FOREIGN KEY ("problemId") REFERENCES "dsa_problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
