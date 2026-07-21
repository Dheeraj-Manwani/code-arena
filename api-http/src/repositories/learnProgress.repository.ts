import type { Prisma, CompletionSource } from "@prisma/client";
import prisma from "../lib/db";
import { logger } from "../lib/logger";

/**
 * Learn progress writes (LEARN_PATHS.md Phase 4).
 *
 * This is the phase that touches a code path live contests share — the verdict
 * fan-out below runs inside the same request that records a contest submission's
 * result. Two rules follow from that and are not negotiable:
 *
 *  1. **Every entry point has a `…Safe` wrapper.** A drifted counter is a
 *     cosmetic inaccuracy on a learn page; a thrown error here would cost a user
 *     their verdict. Same precedent as `recordVerdictForStatsSafe`.
 *  2. **Counters are recomputed, not incremented.** Rolling a container's count
 *     up from its children makes a partial failure self-healing on the next
 *     write, where `{ increment: 1 }` would bake the error in permanently.
 */

type Tx = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Rollup
// ---------------------------------------------------------------------------

/**
 * Recomputes every per-user counter for one path from `UserLearnQuestionProgress`.
 *
 * Deliberately a recount over the path's questions rather than arithmetic on the
 * container that changed. The path is a few hundred rows, this runs on a
 * completion (not a page load), and it means the counters cannot drift away from
 * the rows that justify them — which is the whole reason Phase 3 was built
 * read-only first: this is validated against that derivation.
 */
const rollup = async (tx: Tx, userId: number, pathId: number): Promise<void> => {
  const modules = await tx.learnModule.findMany({
    where: { pathId },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: {
      id: true,
      lessons: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: { id: true, questions: { select: { id: true } } },
      },
    },
  });

  const questionIds = modules.flatMap((m) => m.lessons.flatMap((l) => l.questions.map((q) => q.id)));

  const done = questionIds.length
    ? await tx.userLearnQuestionProgress.findMany({
        where: { userId, questionId: { in: questionIds } },
        select: { questionId: true, source: true },
      })
    : [];

  const completedIds = new Set(done.map((row) => row.questionId));
  const verifiedCount = done.filter((row) => row.source === "verified").length;

  let pathCompleted = 0;
  let pathLessons = 0;
  let pathModules = 0;
  let current: { moduleId: number; lessonId: number; questionId: number } | null = null;

  for (const learnModule of modules) {
    let moduleCompleted = 0;
    let moduleLessonsDone = 0;

    for (const lesson of learnModule.lessons) {
      const total = lesson.questions.length;
      const completed = lesson.questions.filter((q) => completedIds.has(q.id)).length;
      const isComplete = total > 0 && completed === total;

      if (current === null) {
        const next = lesson.questions.find((q) => !completedIds.has(q.id));
        if (next) {
          current = { moduleId: learnModule.id, lessonId: lesson.id, questionId: next.id };
        }
      }

      // `completedAt` is set once and never cleared (§5.1 rule 2): adding a
      // question to a lesson a user finished must not un-complete it, and must
      // not re-fire its milestone. `celebratedAt` is likewise left alone here.
      await tx.userLearnLessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
        create: {
          userId,
          lessonId: lesson.id,
          completedQuestions: completed,
          completedAt: isComplete ? new Date() : null,
        },
        // `completedAt` is deliberately absent from `update`. Writing it here
        // would either re-stamp it on every rollup (losing when it happened) or
        // clear it when a curator adds a question to a finished lesson — which
        // §5.1 rule 2 forbids. The conditional `updateMany` below sets it exactly
        // once, the first time the lesson is complete.
        update: { completedQuestions: completed },
      });

      if (isComplete) {
        await tx.userLearnLessonProgress.updateMany({
          where: { userId, lessonId: lesson.id, completedAt: null },
          data: { completedAt: new Date() },
        });
        moduleLessonsDone += 1;
      }

      moduleCompleted += completed;
    }

    const moduleTotal = learnModule.lessons.reduce((sum, l) => sum + l.questions.length, 0);
    const moduleComplete = moduleTotal > 0 && moduleCompleted === moduleTotal;

    await tx.userLearnModuleProgress.upsert({
      where: { userId_moduleId: { userId, moduleId: learnModule.id } },
      create: {
        userId,
        moduleId: learnModule.id,
        completedQuestions: moduleCompleted,
        completedLessons: moduleLessonsDone,
        completedAt: moduleComplete ? new Date() : null,
      },
      update: {
        completedQuestions: moduleCompleted,
        completedLessons: moduleLessonsDone,
      },
    });

    if (moduleComplete) {
      await tx.userLearnModuleProgress.updateMany({
        where: { userId, moduleId: learnModule.id, completedAt: null },
        data: { completedAt: new Date() },
      });
      pathModules += 1;
    }

    pathCompleted += moduleCompleted;
    pathLessons += moduleLessonsDone;
  }

  const totalQuestions = questionIds.length;
  const pathComplete = totalQuestions > 0 && pathCompleted === totalQuestions;

  await tx.userLearnPathProgress.upsert({
    where: { userId_pathId: { userId, pathId } },
    create: {
      userId,
      pathId,
      completedQuestions: pathCompleted,
      verifiedQuestions: verifiedCount,
      completedLessons: pathLessons,
      completedModules: pathModules,
      currentModuleId: current?.moduleId ?? null,
      currentLessonId: current?.lessonId ?? null,
      currentQuestionId: current?.questionId ?? null,
      completedAt: pathComplete ? new Date() : null,
    },
    update: {
      completedQuestions: pathCompleted,
      verifiedQuestions: verifiedCount,
      completedLessons: pathLessons,
      completedModules: pathModules,
      currentModuleId: current?.moduleId ?? null,
      currentLessonId: current?.lessonId ?? null,
      currentQuestionId: current?.questionId ?? null,
    },
  });

  if (pathComplete) {
    await tx.userLearnPathProgress.updateMany({
      where: { userId, pathId, completedAt: null },
      data: { completedAt: new Date() },
    });
  }
};

/**
 * Standalone rollup for the boot reconciler.
 *
 * Returns whether anything actually changed, so the sweep can report how many
 * pairs it repaired rather than how many it looked at. Compares the path-level
 * counters before and after — a container count can only be wrong if the path
 * total is, since both are recomputed from the same question rows.
 */
export const rollupPathProgress = async (
  userId: number,
  pathId: number,
): Promise<boolean> => {
  const before = await prisma.userLearnPathProgress.findUnique({
    where: { userId_pathId: { userId, pathId } },
    select: { completedQuestions: true, verifiedQuestions: true, completedModules: true },
  });

  await prisma.$transaction(async (tx) => {
    await rollup(tx, userId, pathId);
  });

  const after = await prisma.userLearnPathProgress.findUnique({
    where: { userId_pathId: { userId, pathId } },
    select: { completedQuestions: true, verifiedQuestions: true, completedModules: true },
  });

  return (
    before?.completedQuestions !== after?.completedQuestions ||
    before?.verifiedQuestions !== after?.verifiedQuestions ||
    before?.completedModules !== after?.completedModules
  );
};

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

interface CompleteParams {
  userId: number;
  questionId: number;
  source: CompletionSource;
  completedAt?: Date;
}

/**
 * Marks one question complete and rolls the counters up.
 *
 * `verified` wins over `self_marked`: a user who ticked a box and then actually
 * solved the problem should end up recorded as having solved it. The reverse is
 * a no-op — nothing downgrades a verified completion.
 */
export const recordQuestionCompletion = async ({
  userId,
  questionId,
  source,
  completedAt = new Date(),
}: CompleteParams): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    // Serialise concurrent writes for this (user, question). Without it, two
    // accepted submissions landing together both read "not complete", both
    // insert, and the rollup races.
    //
    // Two-key overload is (int4, int4). Casting to ::bigint resolves to an
    // overload that does not exist — the bug PRACTICE_MODE Phase 5 shipped and
    // its unit tests could not see, because they mocked Prisma.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::int, ${questionId}::int)`;

    const question = await tx.learnQuestion.findUnique({
      where: { id: questionId },
      select: { lesson: { select: { module: { select: { pathId: true } } } } },
    });
    if (!question) return;

    const existing = await tx.userLearnQuestionProgress.findUnique({
      where: { userId_questionId: { userId, questionId } },
      select: { source: true },
    });

    if (existing) {
      const upgrade = existing.source === "self_marked" && source === "verified";
      if (upgrade) {
        await tx.userLearnQuestionProgress.update({
          where: { userId_questionId: { userId, questionId } },
          data: { source: "verified" },
        });
      }
    } else {
      await tx.userLearnQuestionProgress.create({
        data: { userId, questionId, source, completedAt },
      });
    }

    await rollup(tx, userId, question.lesson.module.pathId);
  });
};

/** Un-tick a self-marked question. Verified completions are not removable. */
export const removeSelfMarkedCompletion = async (
  userId: number,
  questionId: number,
): Promise<{ removed: boolean }> =>
  prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::int, ${questionId}::int)`;

    const existing = await tx.userLearnQuestionProgress.findUnique({
      where: { userId_questionId: { userId, questionId } },
      select: { source: true },
    });

    if (!existing || existing.source !== "self_marked") return { removed: false };

    const question = await tx.learnQuestion.findUnique({
      where: { id: questionId },
      select: { lesson: { select: { module: { select: { pathId: true } } } } },
    });
    if (!question) return { removed: false };

    await tx.userLearnQuestionProgress.delete({
      where: { userId_questionId: { userId, questionId } },
    });

    await rollup(tx, userId, question.lesson.module.pathId);
    return { removed: true };
  });

// ---------------------------------------------------------------------------
// Verdict fan-out (LEARN_PATHS.md §5.2 hazard 2)
// ---------------------------------------------------------------------------

/**
 * Credit every learn question that references a just-solved problem.
 *
 * A problem may appear in several paths, and in several lessons within one — so
 * this is a `findMany` and a loop, never a `findFirst`. Getting that wrong is
 * silent: one path ticks, the others quietly don't.
 *
 * Only accepted verdicts do anything. A wrong answer never un-completes.
 */
export const recordVerdictForLearn = async (
  userId: number,
  problemId: number,
  isAccepted: boolean,
  submittedAt: Date,
): Promise<void> => {
  if (!isAccepted) return;

  const questions = await prisma.learnQuestion.findMany({
    where: { problemId },
    select: { id: true },
  });

  for (const question of questions) {
    await recordQuestionCompletion({
      userId,
      questionId: question.id,
      source: "verified",
      completedAt: submittedAt,
    });
  }
};

/**
 * Never let a learn-counter failure cost a user their verdict.
 *
 * This runs inside contest submission handling, so the blast radius of an
 * unhandled throw here is a contest participant losing a scored result over a
 * progress bar on an unrelated page. Mirrors `recordVerdictForStatsSafe`.
 */
export const recordVerdictForLearnSafe = async (
  userId: number,
  problemId: number,
  isAccepted: boolean,
  submittedAt: Date,
): Promise<void> => {
  try {
    await recordVerdictForLearn(userId, problemId, isAccepted, submittedAt);
  } catch (err) {
    logger.error(
      { userId, problemId, err: err instanceof Error ? err.message : String(err) },
      "Failed to record learn progress for verdict — counters may drift",
    );
  }
};

// ---------------------------------------------------------------------------
// Historical backfill (LEARN_PATHS.md §5.2 hazard 1)
// ---------------------------------------------------------------------------

/**
 * Folds a user's pre-existing `UserProblemStatus` into this path, once.
 *
 * Gated on the absence of `UserLearnPathProgress`, which doubles as the
 * enrolment marker (D8). One mechanism for two jobs on purpose: there is no way
 * for "enrolled" and "backfilled" to disagree.
 *
 * Returns whether it ran, so callers can avoid a redundant re-read.
 */
export const backfillPathProgress = async (
  userId: number,
  pathId: number,
): Promise<boolean> => {
  const existing = await prisma.userLearnPathProgress.findUnique({
    where: { userId_pathId: { userId, pathId } },
    select: { userId: true },
  });
  if (existing) return false;

  await prisma.$transaction(async (tx) => {
    // Path-scoped lock so two concurrent first-views can't both backfill.
    // Negated pathId keeps this key space distinct from the (user, question)
    // locks above, which would otherwise collide for small ids.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::int, ${-pathId}::int)`;

    const again = await tx.userLearnPathProgress.findUnique({
      where: { userId_pathId: { userId, pathId } },
      select: { userId: true },
    });
    if (again) return;

    const questions = await tx.learnQuestion.findMany({
      where: { lesson: { module: { pathId } }, problemId: { not: null } },
      select: { id: true, problemId: true },
    });

    const solved = await tx.userProblemStatus.findMany({
      where: {
        userId,
        status: "solved",
        problemId: { in: questions.map((q) => q.problemId!) },
      },
      select: { problemId: true },
    });
    const solvedIds = new Set(solved.map((row) => row.problemId));

    for (const question of questions) {
      if (!solvedIds.has(question.problemId!)) continue;

      await tx.userLearnQuestionProgress.upsert({
        where: { userId_questionId: { userId, questionId: question.id } },
        create: { userId, questionId: question.id, source: "verified" },
        update: {},
      });
    }

    await rollup(tx, userId, pathId);
  });

  return true;
};

/** Backfill must never block a page render. */
export const backfillPathProgressSafe = async (
  userId: number,
  pathId: number,
): Promise<void> => {
  try {
    await backfillPathProgress(userId, pathId);
  } catch (err) {
    logger.error(
      { userId, pathId, err: err instanceof Error ? err.message : String(err) },
      "Failed to backfill learn progress — the path will render from live derivation",
    );
  }
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const getPathProgress = (userId: number, pathId: number) =>
  prisma.userLearnPathProgress.findUnique({
    where: { userId_pathId: { userId, pathId } },
  });

/** Every stored path counter for one user — one query for the whole gallery. */
export const getAllPathProgress = async (userId: number) => {
  const rows = await prisma.userLearnPathProgress.findMany({
    where: { userId },
    select: { pathId: true, completedQuestions: true, verifiedQuestions: true },
  });
  return new Map(rows.map((row) => [row.pathId, row]));
};

export const getQuestionKind = (questionId: number) =>
  prisma.learnQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, kind: true },
  });

/**
 * The MCQ with its answer key — the *only* query in the learner path that reads
 * `correctOptionIndex`.
 *
 * Its result must never be returned to a caller. It exists so `gradeMcqAnswer`
 * can compare server-side; anything it returns beyond a boolean is a leak.
 */
export const getMcqForGrading = (questionId: number) =>
  prisma.learnQuestion.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      kind: true,
      mcq: { select: { id: true, correctOptionIndex: true, options: true } },
    },
  });

export const recordMcqAttempt = (
  userId: number,
  questionId: number,
  selectedOptionIndex: number,
  isCorrect: boolean,
) =>
  prisma.learnMcqAttempt.create({
    data: { userId, questionId, selectedOptionIndex, isCorrect },
  });

export const countMcqAttempts = (userId: number, questionId: number) =>
  prisma.learnMcqAttempt.count({ where: { userId, questionId } });

export const moduleExists = async (moduleId: number): Promise<boolean> =>
  (await prisma.learnModule.count({ where: { id: moduleId } })) > 0;

export const getQuestionProgress = async (
  userId: number,
  questionIds: readonly number[],
): Promise<Map<number, CompletionSource>> => {
  if (questionIds.length === 0) return new Map();

  const rows = await prisma.userLearnQuestionProgress.findMany({
    where: { userId, questionId: { in: [...questionIds] } },
    select: { questionId: true, source: true },
  });

  return new Map(rows.map((row) => [row.questionId, row.source]));
};

export const getModuleProgress = async (userId: number, pathId: number) => {
  const rows = await prisma.userLearnModuleProgress.findMany({
    where: { userId, module: { pathId } },
    select: { moduleId: true, unlockedAt: true, celebratedAt: true, completedAt: true },
  });
  return new Map(rows.map((row) => [row.moduleId, row]));
};

export const getLessonProgress = async (userId: number, pathId: number) => {
  const rows = await prisma.userLearnLessonProgress.findMany({
    where: { userId, lesson: { module: { pathId } } },
    select: { lessonId: true, celebratedAt: true, completedAt: true },
  });
  return new Map(rows.map((row) => [row.lessonId, row]));
};

/**
 * Containers this user has completed but not yet been shown a celebration for
 * (§5.5).
 *
 * Derived from stored state rather than returned by the completing call, which
 * is what makes the milestone survive the things that actually happen: the
 * verdict lands on the *solve* page, not the path page; the user reloads; the
 * tab was closed mid-confetti. Any client that later loads the path sees the
 * pending flag and plays it.
 *
 * `celebratedAt` is the idempotency key and is server-side precisely so a phone
 * and a laptop don't each celebrate once.
 */
export const getPendingCelebrations = async (userId: number, pathId: number) => {
  const [lessons, modules] = await Promise.all([
    prisma.userLearnLessonProgress.findMany({
      where: {
        userId,
        celebratedAt: null,
        completedAt: { not: null },
        lesson: { module: { pathId } },
      },
      select: {
        lessonId: true,
        lesson: {
          select: {
            title: true,
            totalQuestions: true,
            module: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.userLearnModuleProgress.findMany({
      where: { userId, celebratedAt: null, completedAt: { not: null }, module: { pathId } },
      select: {
        moduleId: true,
        completedQuestions: true,
        completedLessons: true,
        module: { select: { title: true } },
      },
    }),
  ]);

  return { lessons, modules };
};

/**
 * Acknowledge a celebration. Idempotent: a second call is a no-op, not an error.
 *
 * `updateMany` with a `celebratedAt: null` guard rather than `update`, so two
 * clients racing to acknowledge the same milestone both succeed and only the
 * first writes.
 */
export const markLessonCelebrated = async (userId: number, lessonId: number) => {
  await prisma.userLearnLessonProgress.updateMany({
    where: { userId, lessonId, celebratedAt: null },
    data: { celebratedAt: new Date() },
  });
};

export const markModuleCelebrated = async (userId: number, moduleId: number) => {
  await prisma.userLearnModuleProgress.updateMany({
    where: { userId, moduleId, celebratedAt: null },
    data: { celebratedAt: new Date() },
  });
};

/** Every lesson in a module — for the module-supersedes-lesson rule (§3.6). */
export const lessonIdsForModule = async (moduleId: number): Promise<number[]> =>
  (
    await prisma.learnLesson.findMany({ where: { moduleId }, select: { id: true } })
  ).map((row) => row.id);

/** "Open anyway" — the sticky, one-way unlock from §5.4. */
export const unlockModule = async (userId: number, moduleId: number): Promise<void> => {
  await prisma.userLearnModuleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: { userId, moduleId, unlockedAt: new Date() },
    update: { unlockedAt: new Date() },
  });
};

/**
 * Applies a batch of self-marks and un-marks in one transaction, then rolls up
 * once (the spreadsheet import in §3.9).
 *
 * Not a loop over `recordQuestionCompletion` / `removeSelfMarkedCompletion`:
 * those each open their own transaction and recount the entire path, so a
 * 474-row import would run 474 full rollups and leave the path visibly
 * half-imported the whole way through. One transaction also means a failure
 * partway leaves the user exactly where they started, which matters far more
 * for a bulk overwrite than for a single tick.
 *
 * The verified rule from §3 D3 is enforced here rather than trusted from the
 * caller: `deleteMany` is scoped to `source: 'self_marked'`, so a sheet asking
 * to clear a verified completion cannot do it however the file was edited.
 * `createMany … skipDuplicates` likewise leaves an existing row's source alone,
 * so importing never downgrades a verified completion to a self-marked one.
 */
export const applyProgressImport = async (
  userId: number,
  pathId: number,
  complete: number[],
  clear: number[],
): Promise<void> => {
  if (complete.length === 0 && clear.length === 0) return;

  await prisma.$transaction(async (tx) => {
    // One path-scoped lock rather than the per-question locks the single-question
    // writers take: this touches many questions at once, and taking them
    // one-by-one against a concurrent verdict fan-out is a deadlock waiting to
    // happen. Negated pathId keeps this lock space distinct from the
    // (userId, questionId) pairs those writers use.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::int, ${-pathId}::int)`;

    if (clear.length > 0) {
      await tx.userLearnQuestionProgress.deleteMany({
        where: { userId, questionId: { in: clear }, source: "self_marked" },
      });
    }

    if (complete.length > 0) {
      await tx.userLearnQuestionProgress.createMany({
        data: complete.map((questionId) => ({
          userId,
          questionId,
          source: "self_marked" as CompletionSource,
        })),
        skipDuplicates: true,
      });
    }

    await rollup(tx, userId, pathId);
  });
};

/** Wipes one path's progress for one user (the Reset control in §3.2). */
export const resetPathProgress = async (userId: number, pathId: number): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    await tx.userLearnQuestionProgress.deleteMany({
      where: { userId, question: { lesson: { module: { pathId } } } },
    });
    await tx.userLearnLessonProgress.deleteMany({
      where: { userId, lesson: { module: { pathId } } },
    });
    await tx.userLearnModuleProgress.deleteMany({ where: { userId, module: { pathId } } });
    await tx.userLearnPathProgress.deleteMany({ where: { userId, pathId } });
  });
};
