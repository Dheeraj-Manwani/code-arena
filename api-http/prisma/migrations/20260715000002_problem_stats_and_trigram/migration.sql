-- Catalogue counters + trigram search (PRACTICE_MODE_AND_NAVIGATION.md §4.5).
--
-- Acceptance rate, "solved by N users", and the solved/attempted filter are all
-- data we never collected. Computing them live would mean a COUNT over every
-- submission per row per page load, so they're denormalised here and maintained
-- on each verdict (service/stats.service.ts).

-- ---------------------------------------------------------------------------
-- 1. Trigram search
-- ---------------------------------------------------------------------------
-- Catalogue search is `title ILIKE '%q%'`, which a b-tree cannot serve because
-- of the leading wildcard. pg_trgm + GIN makes it an index scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "dsa_problems_title_idx" ON "dsa_problems" USING GIN ("title" gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE "problem_stats" (
    "problemId" INTEGER NOT NULL,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "acceptedSubmissions" INTEGER NOT NULL DEFAULT 0,
    "solvedBy" INTEGER NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_stats_pkey" PRIMARY KEY ("problemId")
);

ALTER TABLE "problem_stats"
    ADD CONSTRAINT "problem_stats_problemId_fkey"
    FOREIGN KEY ("problemId") REFERENCES "dsa_problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TYPE "SolveStatus" AS ENUM ('attempted', 'solved');

CREATE TABLE "user_problem_status" (
    "userId" INTEGER NOT NULL,
    "problemId" INTEGER NOT NULL,
    "status" "SolveStatus" NOT NULL,
    "solvedAt" TIMESTAMP(3),
    "firstAttemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_problem_status_pkey" PRIMARY KEY ("userId", "problemId")
);

-- Serves the catalogue's "solved / attempted / todo" filter.
CREATE INDEX "user_problem_status_userId_status_idx"
    ON "user_problem_status"("userId", "status");

ALTER TABLE "user_problem_status"
    ADD CONSTRAINT "user_problem_status_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_problem_status"
    ADD CONSTRAINT "user_problem_status_problemId_fkey"
    FOREIGN KEY ("problemId") REFERENCES "dsa_problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Backfill
-- ---------------------------------------------------------------------------
-- Without this every rate reads 0/0 on day one despite real submission history.
-- Both tables count: solving a problem inside a contest means you solved it, and
-- a contest attempt is still a submission against that problem.
--
-- `pending` rows are excluded — they have no verdict yet, which matches the write
-- path (counters move when the verdict lands, not when the row is created).

WITH all_subs AS (
    SELECT "userId", "problemId", "status", "submittedAt"
    FROM "dsa_submissions"
    WHERE "status" <> 'pending'
    UNION ALL
    SELECT "userId", "problemId", "status", "submittedAt"
    FROM "practice_submissions"
    WHERE "status" <> 'pending'
),
per_problem AS (
    SELECT
        "problemId",
        count(*)                                                    AS total,
        count(*) FILTER (WHERE "status" = 'accepted')               AS accepted,
        count(DISTINCT "userId") FILTER (WHERE "status" = 'accepted') AS solved_by
    FROM all_subs
    GROUP BY "problemId"
)
-- LEFT JOIN so every problem gets a stat row, including ones nobody has tried.
-- The catalogue orders by this relation, and a missing row would sort as NULL.
INSERT INTO "problem_stats" ("problemId", "totalSubmissions", "acceptedSubmissions", "solvedBy", "acceptanceRate", "updatedAt")
SELECT
    p."id",
    COALESCE(s.total, 0),
    COALESCE(s.accepted, 0),
    COALESCE(s.solved_by, 0),
    CASE WHEN COALESCE(s.total, 0) = 0 THEN 0
         ELSE s.accepted::double precision / s.total
    END,
    now()
FROM "dsa_problems" p
LEFT JOIN per_problem s ON s."problemId" = p."id";

WITH all_subs AS (
    SELECT "userId", "problemId", "status", "submittedAt"
    FROM "dsa_submissions"
    WHERE "status" <> 'pending'
    UNION ALL
    SELECT "userId", "problemId", "status", "submittedAt"
    FROM "practice_submissions"
    WHERE "status" <> 'pending'
)
INSERT INTO "user_problem_status" ("userId", "problemId", "status", "solvedAt", "firstAttemptedAt", "updatedAt")
SELECT
    "userId",
    "problemId",
    -- Solved wins over attempted regardless of submission order.
    CASE WHEN bool_or("status" = 'accepted') THEN 'solved'::"SolveStatus"
         ELSE 'attempted'::"SolveStatus"
    END,
    min("submittedAt") FILTER (WHERE "status" = 'accepted'),
    min("submittedAt"),
    now()
FROM all_subs
GROUP BY "userId", "problemId";
