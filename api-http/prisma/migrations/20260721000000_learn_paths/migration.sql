-- Learn paths (LEARN_PATHS.md) — curriculum + per-user progress.
--
-- Path → Module → Lesson → Question. A *question* is the only thing that can be
-- completed; containers are complete when all their children are. There is no
-- reading credit and no participation credit, which is what makes the progress
-- numbers on the learn pages trustworthy (LEARN_PATHS.md §1, D2).
--
-- Everything below the "hand-written" divider is not expressible in the Prisma
-- schema and must survive future `migrate diff` runs — see the note there.

-- CreateEnum
CREATE TYPE "LearnQuestionKind" AS ENUM ('problem', 'mcq');

-- CreateEnum
CREATE TYPE "LearnPathStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "CompletionSource" AS ENUM ('verified', 'self_marked');

-- CreateTable
CREATE TABLE "learn_paths" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "LearnPathStatus" NOT NULL DEFAULT 'draft',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "unlockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalModules" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learn_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_modules" (
    "id" SERIAL NOT NULL,
    "pathId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "order" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "learn_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_lessons" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "order" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "learn_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_questions" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "kind" "LearnQuestionKind" NOT NULL,
    "order" INTEGER NOT NULL,
    "problemId" INTEGER,
    "mcqId" INTEGER,
    "note" TEXT,

    CONSTRAINT "learn_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_learn_question_progress" (
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "source" "CompletionSource" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_learn_question_progress_pkey" PRIMARY KEY ("userId","questionId")
);

-- CreateTable
CREATE TABLE "user_learn_lesson_progress" (
    "userId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "completedQuestions" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "celebratedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_learn_lesson_progress_pkey" PRIMARY KEY ("userId","lessonId")
);

-- CreateTable
CREATE TABLE "user_learn_module_progress" (
    "userId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "completedQuestions" INTEGER NOT NULL DEFAULT 0,
    "completedLessons" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "celebratedAt" TIMESTAMP(3),
    "unlockedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_learn_module_progress_pkey" PRIMARY KEY ("userId","moduleId")
);

-- CreateTable
CREATE TABLE "user_learn_path_progress" (
    "userId" INTEGER NOT NULL,
    "pathId" INTEGER NOT NULL,
    "completedQuestions" INTEGER NOT NULL DEFAULT 0,
    "verifiedQuestions" INTEGER NOT NULL DEFAULT 0,
    "completedLessons" INTEGER NOT NULL DEFAULT 0,
    "completedModules" INTEGER NOT NULL DEFAULT 0,
    "currentModuleId" INTEGER,
    "currentLessonId" INTEGER,
    "currentQuestionId" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_learn_path_progress_pkey" PRIMARY KEY ("userId","pathId")
);

-- CreateTable
CREATE TABLE "learn_mcq_attempts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "selectedOptionIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learn_mcq_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learn_paths_slug_key" ON "learn_paths"("slug");

-- CreateIndex
CREATE INDEX "learn_paths_status_order_idx" ON "learn_paths"("status", "order");

-- CreateIndex
CREATE INDEX "learn_modules_pathId_order_idx" ON "learn_modules"("pathId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "learn_modules_pathId_slug_key" ON "learn_modules"("pathId", "slug");

-- CreateIndex
CREATE INDEX "learn_lessons_moduleId_order_idx" ON "learn_lessons"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "learn_lessons_moduleId_slug_key" ON "learn_lessons"("moduleId", "slug");

-- CreateIndex
CREATE INDEX "learn_questions_lessonId_order_idx" ON "learn_questions"("lessonId", "order");

-- CreateIndex
CREATE INDEX "learn_questions_problemId_idx" ON "learn_questions"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "learn_questions_lessonId_problemId_key" ON "learn_questions"("lessonId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "learn_questions_lessonId_mcqId_key" ON "learn_questions"("lessonId", "mcqId");

-- CreateIndex
CREATE INDEX "user_learn_question_progress_userId_idx" ON "user_learn_question_progress"("userId");

-- CreateIndex
CREATE INDEX "user_learn_lesson_progress_userId_idx" ON "user_learn_lesson_progress"("userId");

-- CreateIndex
CREATE INDEX "user_learn_module_progress_userId_idx" ON "user_learn_module_progress"("userId");

-- CreateIndex
CREATE INDEX "user_learn_path_progress_userId_lastActiveAt_idx" ON "user_learn_path_progress"("userId", "lastActiveAt");

-- CreateIndex
CREATE INDEX "learn_mcq_attempts_userId_questionId_answeredAt_idx" ON "learn_mcq_attempts"("userId", "questionId", "answeredAt");

-- AddForeignKey
ALTER TABLE "learn_modules" ADD CONSTRAINT "learn_modules_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "learn_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_lessons" ADD CONSTRAINT "learn_lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "learn_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_questions" ADD CONSTRAINT "learn_questions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "learn_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_questions" ADD CONSTRAINT "learn_questions_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "dsa_problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_questions" ADD CONSTRAINT "learn_questions_mcqId_fkey" FOREIGN KEY ("mcqId") REFERENCES "mcq_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learn_question_progress" ADD CONSTRAINT "user_learn_question_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learn_question_progress" ADD CONSTRAINT "user_learn_question_progress_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "learn_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learn_lesson_progress" ADD CONSTRAINT "user_learn_lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learn_lesson_progress" ADD CONSTRAINT "user_learn_lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "learn_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learn_module_progress" ADD CONSTRAINT "user_learn_module_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learn_module_progress" ADD CONSTRAINT "user_learn_module_progress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "learn_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learn_path_progress" ADD CONSTRAINT "user_learn_path_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learn_path_progress" ADD CONSTRAINT "user_learn_path_progress_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "learn_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_mcq_attempts" ADD CONSTRAINT "learn_mcq_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_mcq_attempts" ADD CONSTRAINT "learn_mcq_attempts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "learn_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Hand-written: integrity Prisma cannot express
-- ---------------------------------------------------------------------------
-- Prisma has no CHECK-constraint syntax, so this cannot live in schema.prisma
-- and `prisma migrate diff` will neither generate nor drop it. It survives
-- because nothing later recreates the table. If `learn_questions` is ever
-- rebuilt, this constraint must be re-applied by hand — a `prisma migrate dev`
-- that drops and recreates the table will silently lose it.
--
-- A LearnQuestion is exactly one of a DSA problem or an MCQ. Two nullable FKs
-- alone permit three bad shapes, all of which reach production as a broken
-- lesson page rather than an error:
--
--   1. both null      — a question that points at nothing
--   2. both set       — a question that is two questions
--   3. kind mismatch  — kind = 'problem' while only mcqId is set, so the UI
--                       renders an editor for a multiple-choice question
--
-- Checking `kind` against the FKs (rather than just `num_nonnulls(...) = 1`)
-- is what closes case 3. `kind` is denormalised on purpose — it lets the lesson
-- view order and filter questions without joining both target tables — and a
-- denormalised column is only safe while something forces it to agree with the
-- thing it denormalises.
ALTER TABLE "learn_questions"
    ADD CONSTRAINT "learn_questions_kind_matches_target"
    CHECK (
        ("kind" = 'problem' AND "problemId" IS NOT NULL AND "mcqId" IS NULL)
        OR
        ("kind" = 'mcq'     AND "mcqId"     IS NOT NULL AND "problemId" IS NULL)
    );

-- Note on the two unique indexes Prisma generated above
-- (learn_questions_lessonId_problemId_key / _lessonId_mcqId_key):
--
-- Postgres treats NULLs as distinct, so these enforce nothing on the null side.
-- Here that is exactly right rather than a hazard: every MCQ row has a NULL
-- problemId, and a lesson must be able to hold many MCQs. Uniqueness still
-- binds where it matters — the same problem cannot appear twice in one lesson.
--
-- This is the opposite conclusion to PRACTICE_MODE_AND_NAVIGATION.md §4.7,
-- where NULL-distinctness silently *removed* a guarantee the product needed.
-- The difference is whether the null side is meant to be constrained. It is not
-- here, so no partial unique index is needed.
