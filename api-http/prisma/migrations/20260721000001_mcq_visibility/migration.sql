-- MCQ visibility (LEARN_PATHS.md Phase 0, §5.7).
--
-- `DsaProblem` has had a `visibility` column since
-- `20260715000000_problem_visibility_and_slug`; `McqQuestion` never got one.
-- That gap is what stops a learn path from safely containing a quiz: there was
-- no way to say "this question may be shown to a learner" as distinct from
-- "this question exists in the bank for contest use".

ALTER TABLE "mcq_questions" ADD COLUMN     "visibility" "ProblemVisibility" NOT NULL DEFAULT 'draft';

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- The column default is `draft`, which is the right default for *new* rows but
-- the wrong description of the existing ones: every MCQ in the bank today was
-- authored for a contest, and several are sitting in live ones. `contest_only`
-- states that accurately.
--
-- This mirrors the choice made for `dsa_problems` in
-- `20260715000000_problem_visibility_and_slug`, and for the same reason — the
-- safe read is that nothing becomes learner-visible without a human saying so.
-- Defaulting these to `draft` would be equally safe today but would misdescribe
-- them, and "draft" invites a creator to publish something already in use.
UPDATE "mcq_questions" SET "visibility" = 'contest_only';
