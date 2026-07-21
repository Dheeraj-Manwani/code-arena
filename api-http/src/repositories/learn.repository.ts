import { Prisma } from "@prisma/client";
import prisma from "../lib/db";

/**
 * Curriculum reads and writes for the admin builder (LEARN_PATHS.md Phase 2).
 *
 * Learner-facing reads land in a separate module in Phase 3 — they need a
 * different projection (no answer keys, per-user progress folded in) and
 * sharing one here is how the creator query ends up serving learners, which is
 * the trap PRACTICE_MODE §4.4 documents.
 */

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export const listPaths = () =>
  prisma.learnPath.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      order: true,
      isFeatured: true,
      unlockThreshold: true,
      totalQuestions: true,
      totalModules: true,
      createdAt: true,
      updatedAt: true,
    },
  });

/** The whole tree for the builder. Small by construction — one path. */
export const getPathTree = (pathId: number) =>
  prisma.learnPath.findUnique({
    where: { id: pathId },
    include: {
      modules: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        include: {
          lessons: {
            orderBy: [{ order: "asc" }, { id: "asc" }],
            include: {
              questions: {
                orderBy: [{ order: "asc" }, { id: "asc" }],
                include: {
                  problem: {
                    select: {
                      id: true,
                      slug: true,
                      title: true,
                      difficulty: true,
                      visibility: true,
                    },
                  },
                  mcq: {
                    // Never `correctOptionIndex` — this response reaches a
                    // browser, and a creator's browser is still a browser.
                    select: { id: true, questionText: true, visibility: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

export const getPathById = (pathId: number) =>
  prisma.learnPath.findUnique({ where: { id: pathId } });

export const findPathBySlug = (slug: string) =>
  prisma.learnPath.findUnique({ where: { slug } });

export const createPath = (data: Prisma.LearnPathUncheckedCreateInput) =>
  prisma.learnPath.create({ data });

export const updatePath = (
  pathId: number,
  data: Prisma.LearnPathUncheckedUpdateInput,
) => prisma.learnPath.update({ where: { id: pathId }, data });

export const deletePath = (pathId: number) =>
  prisma.learnPath.delete({ where: { id: pathId } });

// ---------------------------------------------------------------------------
// Modules / lessons / questions
// ---------------------------------------------------------------------------

export const getModule = (moduleId: number) =>
  prisma.learnModule.findUnique({ where: { id: moduleId } });

export const getModuleSiblings = (pathId: number) =>
  prisma.learnModule.findMany({
    where: { pathId },
    select: { id: true, order: true },
    orderBy: { order: "asc" },
  });

export const createModule = (data: Prisma.LearnModuleUncheckedCreateInput) =>
  prisma.learnModule.create({ data });

export const updateModule = (
  moduleId: number,
  data: Prisma.LearnModuleUncheckedUpdateInput,
) => prisma.learnModule.update({ where: { id: moduleId }, data });

export const deleteModule = (moduleId: number) =>
  prisma.learnModule.delete({ where: { id: moduleId } });

export const getLesson = (lessonId: number) =>
  prisma.learnLesson.findUnique({ where: { id: lessonId } });

export const getLessonSiblings = (moduleId: number) =>
  prisma.learnLesson.findMany({
    where: { moduleId },
    select: { id: true, order: true },
    orderBy: { order: "asc" },
  });

export const createLesson = (data: Prisma.LearnLessonUncheckedCreateInput) =>
  prisma.learnLesson.create({ data });

export const updateLesson = (
  lessonId: number,
  data: Prisma.LearnLessonUncheckedUpdateInput,
) => prisma.learnLesson.update({ where: { id: lessonId }, data });

export const deleteLesson = (lessonId: number) =>
  prisma.learnLesson.delete({ where: { id: lessonId } });

export const getQuestion = (questionId: number) =>
  prisma.learnQuestion.findUnique({ where: { id: questionId } });

export const getQuestionSiblings = (lessonId: number) =>
  prisma.learnQuestion.findMany({
    where: { lessonId },
    select: { id: true, order: true },
    orderBy: { order: "asc" },
  });

export const createQuestion = (data: Prisma.LearnQuestionUncheckedCreateInput) =>
  prisma.learnQuestion.create({ data });

export const updateQuestion = (
  questionId: number,
  data: Prisma.LearnQuestionUncheckedUpdateInput,
) => prisma.learnQuestion.update({ where: { id: questionId }, data });

export const deleteQuestion = (questionId: number) =>
  prisma.learnQuestion.delete({ where: { id: questionId } });

/** Bulk order rewrite, used only when a rebalance is needed (§5.9). */
export const applyOrders = async (
  table: "module" | "lesson" | "question",
  updates: Array<{ id: number; order: number }>,
) => {
  if (updates.length === 0) return;

  await prisma.$transaction(
    updates.map(({ id, order }) => {
      if (table === "module")
        return prisma.learnModule.update({ where: { id }, data: { order } });
      if (table === "lesson")
        return prisma.learnLesson.update({ where: { id }, data: { order } });
      return prisma.learnQuestion.update({ where: { id }, data: { order } });
    }),
  );
};

// ---------------------------------------------------------------------------
// Totals (LEARN_PATHS.md §5.10)
// ---------------------------------------------------------------------------

/**
 * Recomputes the denormalised `totalQuestions` counters for a whole path, from
 * the rows that actually exist.
 *
 * Deliberately a full recount rather than incremental arithmetic at each call
 * site. A wrong total is a wrong denominator, and a wrong denominator is the
 * trust problem in §5.1 arriving by a different route — so this trades a little
 * work per edit for the guarantee that the numbers cannot drift. Paths are
 * hundreds of rows, not millions, and this runs on curator writes, not on
 * learner reads.
 */
export const recomputePathTotals = async (pathId: number) => {
  await prisma.$transaction(async (tx) => {
    const lessons = await tx.learnLesson.findMany({
      where: { module: { pathId } },
      select: {
        id: true,
        moduleId: true,
        _count: { select: { questions: true } },
      },
    });

    for (const lesson of lessons) {
      await tx.learnLesson.update({
        where: { id: lesson.id },
        data: { totalQuestions: lesson._count.questions },
      });
    }

    const modules = await tx.learnModule.findMany({
      where: { pathId },
      select: { id: true },
    });

    const perModule = new Map<number, number>();
    for (const lesson of lessons) {
      perModule.set(
        lesson.moduleId,
        (perModule.get(lesson.moduleId) ?? 0) + lesson._count.questions,
      );
    }

    for (const learnModule of modules) {
      await tx.learnModule.update({
        where: { id: learnModule.id },
        // A module with no lessons must land on 0, not be skipped — otherwise
        // deleting a module's last lesson leaves the old count behind.
        data: { totalQuestions: perModule.get(learnModule.id) ?? 0 },
      });
    }

    await tx.learnPath.update({
      where: { id: pathId },
      data: {
        totalQuestions: [...perModule.values()].reduce((a, b) => a + b, 0),
        totalModules: modules.length,
      },
    });
  });
};

/** Walks up from a lesson/module to the owning path id. */
export const pathIdForModule = async (moduleId: number) =>
  (await prisma.learnModule.findUnique({
    where: { id: moduleId },
    select: { pathId: true },
  }))?.pathId ?? null;

export const pathIdForLesson = async (lessonId: number) =>
  (await prisma.learnLesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { pathId: true } } },
  }))?.module.pathId ?? null;

export const pathIdForQuestion = async (questionId: number) =>
  (await prisma.learnQuestion.findUnique({
    where: { id: questionId },
    select: { lesson: { select: { module: { select: { pathId: true } } } } },
  }))?.lesson.module.pathId ?? null;

// ---------------------------------------------------------------------------
// Contest-integrity guard (LEARN_PATHS.md §5.6)
// ---------------------------------------------------------------------------

/**
 * The competitive contest, if any, that currently withholds a problem.
 *
 * This is the inverse of `practiceableWhere`'s `NOT` clause and must stay in
 * step with it: a problem is withheld while it is linked to a *published*,
 * *competitive* contest that has not finished. Returning the contest rather
 * than a boolean is what lets the error name it (§5.6) — a curator told only
 * "no" will assume the tool is broken.
 */
export const blockingContestForProblem = async (problemId: number, now: Date) => {
  const link = await prisma.contestQuestion.findFirst({
    where: {
      dsaId: problemId,
      contest: {
        status: "published",
        type: "competitive",
        // Null endTime means never-finished, so it withholds — matching
        // practiceableWhere exactly.
        OR: [{ endTime: { gt: now } }, { endTime: null }],
      },
    },
    select: { contest: { select: { id: true, title: true } } },
  });

  return link?.contest ?? null;
};

/** Every published path a problem appears in — the blast radius for §5.6. */
export const pathsContainingProblem = (problemId: number) =>
  prisma.learnPath.findMany({
    where: {
      modules: { some: { lessons: { some: { questions: { some: { problemId } } } } } },
    },
    select: { id: true, slug: true, title: true, status: true },
  });

// ---------------------------------------------------------------------------
// Publish validation (LEARN_PATHS.md §7)
// ---------------------------------------------------------------------------

/** Everything publish validation needs, in one read. */
export const getPathForValidation = (pathId: number) =>
  prisma.learnPath.findUnique({
    where: { id: pathId },
    select: {
      id: true,
      title: true,
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              questions: {
                select: {
                  id: true,
                  kind: true,
                  problemId: true,
                  problem: { select: { title: true, visibility: true } },
                  mcq: { select: { questionText: true, visibility: true } },
                },
              },
            },
          },
        },
      },
    },
  });

/** How many learners have progress on this path — the §5.1 blast radius. */
export const countLearnersOnPath = (pathId: number) =>
  prisma.userLearnPathProgress.count({ where: { pathId } });
