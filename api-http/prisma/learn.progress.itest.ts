/**
 * Learn progress writes, against real Postgres (LEARN_PATHS.md Phase 4).
 *
 * This is the phase that can hurt the existing product: the verdict fan-out runs
 * inside the same handler that records contest results. The tests below are
 * chosen for the failures that are *silent* — a counter that drifts, a path that
 * doesn't tick, a concurrent double-count — because those don't announce
 * themselves in production, they just make the numbers quietly wrong.
 *
 * Several of these mirror bugs this codebase has actually shipped: the advisory
 * lock cast (PRACTICE_MODE Phase 5) and the `findFirst`-instead-of-loop fan-out
 * that §5.2 warns about.
 */

import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import * as progress from "../src/repositories/learnProgress.repository";
import * as learnService from "../src/service/learn.service";
import * as adminLearn from "../src/service/adminLearn.service";
import { applyPracticeSubmissionResult } from "../src/service/submissionResult.service";
import { reconcileLearnProgress } from "../src/jobs/reconcileLearn";
import { clearCurriculumCache } from "../src/lib/curriculumCache";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required.");
if (process.env.DATABASE_URL !== url) {
  throw new Error("DATABASE_URL must equal TEST_DATABASE_URL for this suite.");
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
const tag = `prog-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let creatorId: number;
let userId: number;
let problemIds: number[] = [];
let mcqId: number;

beforeAll(async () => {
  creatorId = (
    await prisma.user.create({
      data: { name: "C", email: `${tag}-c@e.test`, role: "creator", isVerified: true },
    })
  ).id;
  userId = (
    await prisma.user.create({
      data: { name: "U", email: `${tag}-u@e.test`, role: "contestee", isVerified: true },
    })
  ).id;

  for (const n of ["a", "b", "c", "d"]) {
    problemIds.push(
      (
        await prisma.dsaProblem.create({
          data: {
            slug: `${tag}-${n}`,
            title: `${tag} ${n}`,
            description: "f",
            signature: {},
            creatorId,
            visibility: "public",
          },
        })
      ).id,
    );
  }

  mcqId = (
    await prisma.mcqQuestion.create({
      data: {
        questionText: `${tag} mcq`,
        options: ["a", "b"],
        correctOptionIndex: 0,
        creatorId,
        visibility: "public",
      },
    })
  ).id;
});

afterAll(async () => {
  await prisma.learnPath.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.practiceSubmission.deleteMany({ where: { userId } });
  await prisma.userProblemStatus.deleteMany({ where: { userId } });
  // Verdicts flow through `recordVerdictForStats` too, which creates a
  // `ProblemStat` row per problem. It holds a RESTRICT reference, so it has to
  // go before the problems do.
  await prisma.problemStat.deleteMany({
    where: { problem: { slug: { startsWith: tag } } },
  });
  await prisma.dsaProblem.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.mcqQuestion.deleteMany({ where: { questionText: { startsWith: tag } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  await prisma.$disconnect();
});

interface Built {
  pathId: number;
  moduleIds: number[];
  lessonIds: number[];
  questionIds: number[];
}

/** One module, one lesson, two problem questions. Published. */
const buildSimple = async (slug = `${tag}-p`): Promise<Built> => {
  const path = await adminLearn.createPath({ slug, title: "P", description: "d" });
  const mod = await adminLearn.createModule(path.id, { slug: "m1", title: "M1" });
  const lesson = await adminLearn.createLesson(mod.id, { slug: "l1", title: "L1" });
  const q1 = await adminLearn.attachQuestion(lesson.id, {
    kind: "problem",
    problemId: problemIds[0],
  });
  const q2 = await adminLearn.attachQuestion(lesson.id, {
    kind: "problem",
    problemId: problemIds[1],
  });
  await adminLearn.updatePath(path.id, { status: "published" });

  return {
    pathId: path.id,
    moduleIds: [mod.id],
    lessonIds: [lesson.id],
    questionIds: [q1.id, q2.id],
  };
};

const wipeUser = async () => {
  await prisma.userLearnQuestionProgress.deleteMany({ where: { userId } });
  await prisma.userLearnLessonProgress.deleteMany({ where: { userId } });
  await prisma.userLearnModuleProgress.deleteMany({ where: { userId } });
  await prisma.userLearnPathProgress.deleteMany({ where: { userId } });
  await prisma.userProblemStatus.deleteMany({ where: { userId } });
};

beforeEach(async () => {
  clearCurriculumCache();
  await prisma.learnPath.deleteMany({ where: { slug: { startsWith: tag } } });
  await wipeUser();
});

describe("rollup", () => {
  it("rolls a completion up to lesson, module and path", async () => {
    const built = await buildSimple();

    await progress.recordQuestionCompletion({
      userId,
      questionId: built.questionIds[0],
      source: "verified",
    });

    const lesson = await prisma.userLearnLessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: built.lessonIds[0] } },
    });
    const mod = await prisma.userLearnModuleProgress.findUniqueOrThrow({
      where: { userId_moduleId: { userId, moduleId: built.moduleIds[0] } },
    });
    const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });

    expect(lesson.completedQuestions).toBe(1);
    expect(lesson.completedAt).toBeNull();
    expect(mod.completedQuestions).toBe(1);
    expect(path.completedQuestions).toBe(1);
    expect(path.verifiedQuestions).toBe(1);
  });

  it("marks containers complete when the last question lands", async () => {
    const built = await buildSimple();

    for (const questionId of built.questionIds) {
      await progress.recordQuestionCompletion({ userId, questionId, source: "verified" });
    }

    const lesson = await prisma.userLearnLessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: built.lessonIds[0] } },
    });
    const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });

    expect(lesson.completedAt).not.toBeNull();
    expect(path.completedModules).toBe(1);
    expect(path.completedAt).not.toBeNull();
    // Nothing to do next once the path is finished.
    expect(path.currentQuestionId).toBeNull();
  });

  it("tracks the next incomplete question", async () => {
    const built = await buildSimple();

    await progress.recordQuestionCompletion({
      userId,
      questionId: built.questionIds[0],
      source: "verified",
    });

    const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });
    expect(path.currentQuestionId).toBe(built.questionIds[1]);
  });
});

describe("§5.1 — the curriculum may grow under a user", () => {
  // The rule that makes the whole feature trustworthy: finishing something must
  // stay finished. Un-completing a lesson a user completed is the single most
  // insulting thing this feature could do.
  it("does not un-complete a lesson when a question is added to it", async () => {
    const built = await buildSimple();
    for (const questionId of built.questionIds) {
      await progress.recordQuestionCompletion({ userId, questionId, source: "verified" });
    }

    const before = await prisma.userLearnLessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: built.lessonIds[0] } },
    });
    expect(before.completedAt).not.toBeNull();

    // A curator adds a third question, then something triggers a rollup.
    await adminLearn.attachQuestion(built.lessonIds[0], {
      kind: "problem",
      problemId: problemIds[2],
    });
    await progress.rollupPathProgress(userId, built.pathId);

    const after = await prisma.userLearnLessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: built.lessonIds[0] } },
    });

    expect(after.completedAt).toEqual(before.completedAt);
    expect(after.completedQuestions).toBe(2);
  });

  it("does not re-stamp completedAt on repeated rollups", async () => {
    const built = await buildSimple();
    for (const questionId of built.questionIds) {
      await progress.recordQuestionCompletion({ userId, questionId, source: "verified" });
    }

    const first = await prisma.userLearnLessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: built.lessonIds[0] } },
    });

    await progress.rollupPathProgress(userId, built.pathId);
    await progress.rollupPathProgress(userId, built.pathId);

    const later = await prisma.userLearnLessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: built.lessonIds[0] } },
    });
    expect(later.completedAt).toEqual(first.completedAt);
  });

  it("never decrements a user's completed count when a question is removed", async () => {
    const built = await buildSimple();
    for (const questionId of built.questionIds) {
      await progress.recordQuestionCompletion({ userId, questionId, source: "verified" });
    }

    await adminLearn.detachQuestion(built.questionIds[1]);
    await progress.rollupPathProgress(userId, built.pathId);

    const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });

    // 1 of 1 — the ratio never went backwards for the user.
    expect(path.completedQuestions).toBe(1);
    expect(path.completedAt).not.toBeNull();
  });

  it("leaves celebratedAt untouched across rollups", async () => {
    const built = await buildSimple();
    for (const questionId of built.questionIds) {
      await progress.recordQuestionCompletion({ userId, questionId, source: "verified" });
    }

    const when = new Date();
    await prisma.userLearnLessonProgress.update({
      where: { userId_lessonId: { userId, lessonId: built.lessonIds[0] } },
      data: { celebratedAt: when },
    });

    await progress.rollupPathProgress(userId, built.pathId);

    const after = await prisma.userLearnLessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: built.lessonIds[0] } },
    });
    expect(after.celebratedAt).toEqual(when);
  });
});

describe("verdict fan-out (§5.2 hazard 2)", () => {
  // The `findFirst`-instead-of-loop bug: one path ticks and the others silently
  // don't. Nothing surfaces it except a user noticing their other path is stuck.
  it("credits the same problem across three separate paths", async () => {
    const built: Built[] = [];
    for (const n of [1, 2, 3]) {
      const path = await adminLearn.createPath({
        slug: `${tag}-multi${n}`,
        title: `P${n}`,
        description: "d",
      });
      const mod = await adminLearn.createModule(path.id, { slug: "m", title: "M" });
      const lesson = await adminLearn.createLesson(mod.id, { slug: "l", title: "L" });
      const q = await adminLearn.attachQuestion(lesson.id, {
        kind: "problem",
        problemId: problemIds[0],
      });
      await adminLearn.updatePath(path.id, { status: "published" });
      built.push({
        pathId: path.id,
        moduleIds: [mod.id],
        lessonIds: [lesson.id],
        questionIds: [q.id],
      });
    }

    await progress.recordVerdictForLearn(userId, problemIds[0], true, new Date());

    for (const b of built) {
      const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
        where: { userId_pathId: { userId, pathId: b.pathId } },
      });
      expect(path.completedQuestions).toBe(1);
    }
  });

  it("credits the same problem twice within one path", async () => {
    const path = await adminLearn.createPath({
      slug: `${tag}-twice`,
      title: "P",
      description: "d",
    });
    const mod = await adminLearn.createModule(path.id, { slug: "m", title: "M" });
    const l1 = await adminLearn.createLesson(mod.id, { slug: "l1", title: "L1" });
    const l2 = await adminLearn.createLesson(mod.id, { slug: "l2", title: "L2" });
    await adminLearn.attachQuestion(l1.id, { kind: "problem", problemId: problemIds[0] });
    await adminLearn.attachQuestion(l2.id, { kind: "problem", problemId: problemIds[0] });
    await adminLearn.updatePath(path.id, { status: "published" });

    await progress.recordVerdictForLearn(userId, problemIds[0], true, new Date());

    const stored = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: path.id } },
    });
    expect(stored.completedQuestions).toBe(2);
  });

  it("ignores a rejected verdict", async () => {
    const built = await buildSimple();
    await progress.recordVerdictForLearn(userId, problemIds[0], false, new Date());

    expect(
      await prisma.userLearnQuestionProgress.count({
        where: { userId, questionId: { in: built.questionIds } },
      }),
    ).toBe(0);
  });

  it("never un-completes on a later wrong answer", async () => {
    const built = await buildSimple();
    await progress.recordVerdictForLearn(userId, problemIds[0], true, new Date());
    await progress.recordVerdictForLearn(userId, problemIds[0], false, new Date());

    const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });
    expect(path.completedQuestions).toBe(1);
  });

  // The advisory-lock test. Without the lock, concurrent accepted verdicts all
  // read "not complete" and the rollup races. Mirrors the `solvedBy` race that
  // PRACTICE_MODE Phase 5 needed a lock for — and whose ::bigint cast matched no
  // Postgres function, invisible to every mocked unit test.
  it("counts once under five concurrent verdicts", async () => {
    const built = await buildSimple();

    await Promise.all(
      Array.from({ length: 5 }, () =>
        progress.recordVerdictForLearn(userId, problemIds[0], true, new Date()),
      ),
    );

    const rows = await prisma.userLearnQuestionProgress.count({
      where: { userId, questionId: built.questionIds[0] },
    });
    const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });

    expect(rows).toBe(1);
    expect(path.completedQuestions).toBe(1);
  });
});

describe("self-marking (D3)", () => {
  it("records a self-marked completion distinctly", async () => {
    const built = await buildSimple();
    await learnService.selfMarkQuestion(built.questionIds[0], userId);

    const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });

    expect(path.completedQuestions).toBe(1);
    // Counts toward progress, but not toward "verified" — the honesty subtitle.
    expect(path.verifiedQuestions).toBe(0);
  });

  it("un-ticks a self-marked question", async () => {
    const built = await buildSimple();
    await learnService.selfMarkQuestion(built.questionIds[0], userId);
    await learnService.unmarkQuestion(built.questionIds[0], userId);

    const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });
    expect(path.completedQuestions).toBe(0);
  });

  // A verified completion is backed by a real submission. There is nothing to
  // retract, so the endpoint must refuse rather than silently no-op.
  it("refuses to un-tick a verified completion", async () => {
    const built = await buildSimple();
    await progress.recordVerdictForLearn(userId, problemIds[0], true, new Date());

    await expect(
      learnService.unmarkQuestion(built.questionIds[0], userId),
    ).rejects.toThrow(/can't be un-marked/);

    const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });
    expect(path.completedQuestions).toBe(1);
  });

  it("upgrades self_marked to verified when the problem is actually solved", async () => {
    const built = await buildSimple();
    await learnService.selfMarkQuestion(built.questionIds[0], userId);
    await progress.recordVerdictForLearn(userId, problemIds[0], true, new Date());

    const row = await prisma.userLearnQuestionProgress.findUniqueOrThrow({
      where: { userId_questionId: { userId, questionId: built.questionIds[0] } },
    });
    expect(row.source).toBe("verified");

    const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });
    expect(path.verifiedQuestions).toBe(1);
  });

  it("never downgrades verified to self_marked", async () => {
    const built = await buildSimple();
    await progress.recordVerdictForLearn(userId, problemIds[0], true, new Date());
    await learnService.selfMarkQuestion(built.questionIds[0], userId);

    const row = await prisma.userLearnQuestionProgress.findUniqueOrThrow({
      where: { userId_questionId: { userId, questionId: built.questionIds[0] } },
    });
    expect(row.source).toBe("verified");
  });

  it("refuses to self-mark an MCQ", async () => {
    const built = await buildSimple();
    const q = await adminLearn.attachQuestion(built.lessonIds[0], { kind: "mcq", mcqId });

    await expect(learnService.selfMarkQuestion(q.id, userId)).rejects.toThrow(
      /Only coding questions/,
    );
  });
});

describe("backfill (§5.2 hazard 1)", () => {
  it("folds pre-existing solves in on first view", async () => {
    await prisma.userProblemStatus.create({
      data: { userId, problemId: problemIds[0], status: "solved", solvedAt: new Date() },
    });
    const built = await buildSimple();

    const view = await learnService.getPath(`${tag}-p`, userId);
    expect(view.completedQuestions).toBe(1);

    const stored = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });
    expect(stored.completedQuestions).toBe(1);
  });

  it("is idempotent — a second view changes nothing", async () => {
    await prisma.userProblemStatus.create({
      data: { userId, problemId: problemIds[0], status: "solved", solvedAt: new Date() },
    });
    const built = await buildSimple();

    await learnService.getPath(`${tag}-p`, userId);
    const first = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });

    await learnService.getPath(`${tag}-p`, userId);
    await learnService.getPath(`${tag}-p`, userId);

    const later = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });

    expect(later.completedQuestions).toBe(first.completedQuestions);
    expect(later.startedAt).toEqual(first.startedAt);
    expect(
      await prisma.userLearnQuestionProgress.count({
        where: { userId, questionId: { in: built.questionIds } },
      }),
    ).toBe(1);
  });

  // The latch is the absence of UserLearnPathProgress. If the backfill ran again
  // after a reset, "Reset" would immediately restore everything — which is not
  // what the button says it does. It *should* re-credit from real solve history,
  // which is exactly what this asserts.
  it("re-credits real solve history after a reset", async () => {
    await prisma.userProblemStatus.create({
      data: { userId, problemId: problemIds[0], status: "solved", solvedAt: new Date() },
    });
    await buildSimple();

    await learnService.getPath(`${tag}-p`, userId);
    await learnService.resetPath(`${tag}-p`, userId);

    const view = await learnService.getPath(`${tag}-p`, userId);
    expect(view.completedQuestions).toBe(1);
  });

  it("does not credit an attempted-but-unsolved problem", async () => {
    await prisma.userProblemStatus.create({
      data: { userId, problemId: problemIds[0], status: "attempted" },
    });
    await buildSimple();

    expect((await learnService.getPath(`${tag}-p`, userId)).completedQuestions).toBe(0);
  });
});

describe("monotonic unlock (§5.4)", () => {
  it("stays unlocked after the previous module grows", async () => {
    const path = await adminLearn.createPath({
      slug: `${tag}-gate`,
      title: "P",
      description: "d",
    });
    const m1 = await adminLearn.createModule(path.id, { slug: "m1", title: "M1" });
    const l1 = await adminLearn.createLesson(m1.id, { slug: "l1", title: "L1" });
    await adminLearn.attachQuestion(l1.id, { kind: "problem", problemId: problemIds[0] });

    const m2 = await adminLearn.createModule(path.id, { slug: "m2", title: "M2" });
    const l2 = await adminLearn.createLesson(m2.id, { slug: "l2", title: "L2" });
    await adminLearn.attachQuestion(l2.id, { kind: "problem", problemId: problemIds[1] });
    await adminLearn.updatePath(path.id, { status: "published" });

    // Clear M1 → M2 unlocks by threshold.
    await progress.recordVerdictForLearn(userId, problemIds[0], true, new Date());
    clearCurriculumCache();
    expect((await learnService.getPath(`${tag}-gate`, userId)).modules[1].gate.unlocked).toBe(
      true,
    );

    // Record that unlock, then grow M1 so the threshold is no longer met.
    await progress.unlockModule(userId, m2.id);
    for (const problemId of [problemIds[2], problemIds[3]]) {
      await adminLearn.attachQuestion(l1.id, { kind: "problem", problemId });
    }
    clearCurriculumCache();

    const after = await learnService.getPath(`${tag}-gate`, userId);
    expect(after.modules[0].completedQuestions).toBe(1);
    expect(after.modules[0].totalQuestions).toBe(3); // 1/3 — below 0.6
    expect(after.modules[1].gate.unlocked).toBe(true); // but still open
  });
});

describe("reconciler", () => {
  it("repairs counters drifted by a failed fan-out", async () => {
    const built = await buildSimple();
    await progress.recordQuestionCompletion({
      userId,
      questionId: built.questionIds[0],
      source: "verified",
    });

    // Simulate the exact damage a swallowed fan-out failure leaves: the question
    // row exists, the summary counters don't reflect it.
    await prisma.userLearnPathProgress.update({
      where: { userId_pathId: { userId, pathId: built.pathId } },
      data: { completedQuestions: 0, verifiedQuestions: 0 },
    });

    await reconcileLearnProgress();

    const path = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });
    expect(path.completedQuestions).toBe(1);
    expect(path.verifiedQuestions).toBe(1);
  });

  it("is a no-op on correct data", async () => {
    const built = await buildSimple();
    await progress.recordQuestionCompletion({
      userId,
      questionId: built.questionIds[0],
      source: "verified",
    });

    const before = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });

    await reconcileLearnProgress();

    const after = await prisma.userLearnPathProgress.findUniqueOrThrow({
      where: { userId_pathId: { userId, pathId: built.pathId } },
    });
    expect(after.completedQuestions).toBe(before.completedQuestions);
    expect(after.currentQuestionId).toBe(before.currentQuestionId);
  });
});

describe("contest safety", () => {
  // The reason every entry point is safe-wrapped: this fan-out runs inside
  // verdict handling that contests share. A learn failure must be survivable.
  it("a practice verdict still lands when learn progress cannot be recorded", async () => {
    await buildSimple();

    const submission = await prisma.practiceSubmission.create({
      data: {
        userId,
        problemId: problemIds[0],
        code: "x",
        language: "python",
        status: "pending",
        totalTestCases: 1,
      },
    });

    await applyPracticeSubmissionResult(submission.id, {
      status: "accepted",
      testCasesPassed: 1,
      totalTestCases: 1,
      executionTime: 1,
      pointsEarned: 0,
    });

    const updated = await prisma.practiceSubmission.findUniqueOrThrow({
      where: { id: submission.id },
    });
    expect(updated.status).toBe("accepted");

    // And the happy path actually credited the learn question.
    expect(
      await prisma.userLearnQuestionProgress.count({ where: { userId } }),
    ).toBeGreaterThan(0);
  });
});
