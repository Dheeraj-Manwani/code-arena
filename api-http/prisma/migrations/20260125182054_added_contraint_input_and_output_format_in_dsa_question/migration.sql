-- AlterTable
ALTER TABLE "dsa_problems" ADD COLUMN     "boilerplate" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "constraints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "inputFormat" TEXT,
ADD COLUMN     "outputFormat" TEXT;
