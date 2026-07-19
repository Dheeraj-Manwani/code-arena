-- Practice catalogue groundwork (PRACTICE_MODE_AND_NAVIGATION.md §4.4, §4.5, §4.9):
-- problems gain a stable slug, an explicit visibility, a non-null difficulty, and
-- the indexes the catalogue's filters and sorts need.

-- ---------------------------------------------------------------------------
-- 1. Visibility
-- ---------------------------------------------------------------------------
CREATE TYPE "ProblemVisibility" AS ENUM ('draft', 'public', 'contest_only');

ALTER TABLE "dsa_problems"
  ADD COLUMN "visibility" "ProblemVisibility" NOT NULL DEFAULT 'draft';

-- Existing problems were all authored for contests and are in use there, so
-- 'contest_only' is the accurate (and safe) backfill: they keep working inside
-- contests and none of them silently appear in the practice catalogue. Making a
-- problem practiceable is an explicit opt-in by its creator.
UPDATE "dsa_problems" SET "visibility" = 'contest_only';

-- ---------------------------------------------------------------------------
-- 2. Difficulty: nullable -> NOT NULL
-- ---------------------------------------------------------------------------
-- Null difficulty landed in no filter bucket, making those problems invisible to
-- a filtered catalogue. 'medium' is the neutral default for unclassified rows.
UPDATE "dsa_problems" SET "difficulty" = 'medium' WHERE "difficulty" IS NULL;

ALTER TABLE "dsa_problems"
  ALTER COLUMN "difficulty" SET DEFAULT 'medium',
  ALTER COLUMN "difficulty" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Slug
-- ---------------------------------------------------------------------------
ALTER TABLE "dsa_problems" ADD COLUMN "slug" TEXT;

-- Slugify the title: lowercase, collapse every run of non-alphanumerics to a
-- single dash, strip leading/trailing dashes.
UPDATE "dsa_problems"
SET "slug" = trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g'));

-- A title with no alphanumerics slugifies to the empty string.
UPDATE "dsa_problems" SET "slug" = 'problem' WHERE "slug" IS NULL OR "slug" = '';

-- Break collisions by suffixing the row id, which is unique by construction, so
-- this resolves in one pass and cannot itself collide. The lowest id keeps the
-- clean slug.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "id") AS rn
  FROM "dsa_problems"
)
UPDATE "dsa_problems" p
SET "slug" = p."slug" || '-' || p."id"
FROM ranked r
WHERE r."id" = p."id" AND r.rn > 1;

ALTER TABLE "dsa_problems" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "dsa_problems_slug_key" ON "dsa_problems"("slug");

-- ---------------------------------------------------------------------------
-- 4. Catalogue indexes
-- ---------------------------------------------------------------------------
CREATE INDEX "dsa_problems_visibility_difficulty_idx"
  ON "dsa_problems"("visibility", "difficulty");

CREATE INDEX "dsa_problems_visibility_createdAt_idx"
  ON "dsa_problems"("visibility", "createdAt");

-- Tag filtering uses array containment; without GIN this is a sequential scan.
CREATE INDEX "dsa_problems_tags_idx" ON "dsa_problems" USING GIN ("tags");
