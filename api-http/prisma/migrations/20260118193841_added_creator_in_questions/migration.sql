/*
  Warnings:

  - Added the required column `creatorId` to the `dsa_problems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `mcq_questions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dsa_problems" ADD COLUMN     "creatorId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "mcq_questions" ADD COLUMN     "creatorId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "mcq_questions" ADD CONSTRAINT "mcq_questions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsa_problems" ADD CONSTRAINT "dsa_problems_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
