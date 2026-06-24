-- DSA problems now allow re-submission (issues.md §4.2). Drop the unique
-- constraint on (attemptId, problemId) so a contestant can submit a problem
-- multiple times; scoring takes MAX(pointsEarned) per (attempt, problem).
DROP INDEX "dsa_submissions_attemptId_problemId_key";

-- Keep a non-unique composite index to keep best-score lookups fast.
CREATE INDEX "dsa_submissions_attemptId_problemId_idx" ON "dsa_submissions"("attemptId", "problemId");
