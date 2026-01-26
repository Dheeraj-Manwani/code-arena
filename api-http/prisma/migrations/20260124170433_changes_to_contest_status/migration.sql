/*
  Warnings:

  - The values [scheduled,running,ended] on the enum `ContestStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContestStatus_new" AS ENUM ('draft', 'published', 'cancelled');
ALTER TABLE "contests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "contests" ALTER COLUMN "status" TYPE "ContestStatus_new" USING ("status"::text::"ContestStatus_new");
ALTER TYPE "ContestStatus" RENAME TO "ContestStatus_old";
ALTER TYPE "ContestStatus_new" RENAME TO "ContestStatus";
DROP TYPE "ContestStatus_old";
ALTER TABLE "contests" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;

-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'pending';
