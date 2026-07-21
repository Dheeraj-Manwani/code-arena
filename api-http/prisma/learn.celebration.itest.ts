/**
 * Milestone bookkeeping, against real Postgres (LEARN_PATHS.md Phase 6, §5.5).
 *
 * A celebration that replays on every visit goes from delightful to insulting in
 * about two viewings, so "exactly once, ever" is a correctness property rather
 * than a polish item — and the failure modes are all concurrency-shaped: the
 * verdict arrives on a different page, the user has two tabs, the tab closed
 * mid-animation, a phone and a laptop both load the path.
 *
 * `celebratedAt` lives server-side for exactly that reason, and these tests
 * exercise it the way those situations would.
 */

import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import * as learnService from "../src/service/learn.service";
import * as adminLearn from "../src/service/adminLearn.service";
import * as progress from "../src/repositories/learnProgress.repository";
import { clearCurriculumCache } from "../src/lib/curriculumCache";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required.");
if (process.env.DATABASE_URL !== url) {
  throw new Error("DATABASE_URL must equal TEST_DATABASE_URL for this suite.");
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
const tag = `celeb-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let creatorId: number;
let userId: number;
let problemIds: number[] = [];

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
});

afterAll(async () => {
  await prisma.learnPath.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.problemStat.deleteMany({ where: { problem: { slug: { startsWith: tag } } } });
  await prisma.dsaProblem.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  await prisma.$disconnect();
});

interface Built {
  pathId: number;
  moduleIds: number[];
  lessonIds: number[];
  questionIds: number[];
}

/**
 * One module, two lessons, two questions each. Finishing lesson 1 fires a lesson
 * milestone; finishing lesson 2 finishes the module too, which is the
 * suppression case.
 */
const build = async (slug = `${tag}-path`): Promise<Built> => {
  const path = await adminLearn.createPath({ slug, title: "P", description: "d" });
  const mod = await adminLearn.createModule(path.id, { slug: "m1", title: "Module One" });

  const l1 = await adminLearn.createLesson(mod.id, { slug: "l1", title: "Lesson One" });
  const q1 = await adminLearn.attachQuestion(l1.id, { kind: "problem", problemId: problemIds[0] });
  const q2 = await adminLearn.attachQuestion(l1.id, { kind: "problem", problemId: problemIds[1] });

  const l2 = await adminLearn.createLesson(mod.id, { slug: "l2", title: "Lesson Two" });
  const q3 = await adminLearn.attachQuestion(l2.id, { kind: "problem", problemId: problemIds[2] });
  const q4 = await adminLearn.attachQuestion(l2.id, { kind: "problem", problemId: problemIds[3] });

  await adminLearn.updatePath(path.id, { status: "published" });

  return {
    pathId: path.id,
    moduleIds: [mod.id],
    lessonIds: [l1.id, l2.id],
    questionIds: [q1.id, q2.id, q3.id, q4.id],
  };
};

const complete = (questionId: number) =>
  progress.recordQuestionCompletion({ userId, questionId, source: "verified" });

beforeEach(async () => {
  clearCurriculumCache();
  await prisma.learnPath.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.userLearnQuestionProgress.deleteMany({ where: { userId } });
  await prisma.userLearnLessonProgress.deleteMany({ where: { userId } });
  await prisma.userLearnModuleProgress.deleteMany({ where: { userId } });
  await prisma.userLearnPathProgress.deleteMany({ where: { userId } });
});

describe("pending celebrations", () => {
  it("reports nothing when nothing is complete", async () => {
    const built = await build();
    const result = await learnService.getCelebrations(userId, built.pathId);

    expect(result.lessons).toEqual([]);
    expect(result.modules).toEqual([]);
  });

  it("reports a lesson once its questions are done", async () => {
    const built = await build();
    await complete(built.questionIds[0]);
    await complete(built.questionIds[1]);

    const result = await learnService.getCelebrations(userId, built.pathId);

    expect(result.modules).toEqual([]);
    expect(result.lessons).toHaveLength(1);
    expect(result.lessons[0].title).toBe("Lesson One");
  });

  it("reports nothing for a partially complete lesson", async () => {
    const built = await build();
    await complete(built.questionIds[0]);

    expect((await learnService.getCelebrations(userId, built.pathId)).lessons).toEqual([]);
  });
});

describe("exactly once (§5.5)", () => {
  it("stops reporting a lesson once acknowledged", async () => {
    const built = await build();
    await complete(built.questionIds[0]);
    await complete(built.questionIds[1]);

    await learnService.acknowledgeLessonCelebration(built.lessonIds[0], userId);

    expect((await learnService.getCelebrations(userId, built.pathId)).lessons).toEqual([]);
  });

  // Two tabs, or a phone and a laptop, both acknowledging the same milestone.
  // Neither may error, and the timestamp must reflect the first.
  it("is idempotent across concurrent acknowledgements", async () => {
    const built = await build();
    await complete(built.questionIds[0]);
    await complete(built.questionIds[1]);

    await Promise.all([
      learnService.acknowledgeLessonCelebration(built.lessonIds[0], userId),
      learnService.acknowledgeLessonCelebration(built.lessonIds[0], userId),
      learnService.acknowledgeLessonCelebration(built.lessonIds[0], userId),
    ]);

    const row = await prisma.userLearnLessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: built.lessonIds[0] } },
    });
    expect(row.celebratedAt).not.toBeNull();

    const first = row.celebratedAt;
    await learnService.acknowledgeLessonCelebration(built.lessonIds[0], userId);

    const again = await prisma.userLearnLessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId, lessonId: built.lessonIds[0] } },
    });
    // A later ack must not re-stamp it — that would be a second "first time".
    expect(again.celebratedAt).toEqual(first);
  });

  // Phase 4 guarantees rollups never touch celebratedAt. Re-asserted from this
  // side, because a regression there would silently resurrect old milestones.
  it("survives further progress in the same path", async () => {
    const built = await build();
    await complete(built.questionIds[0]);
    await complete(built.questionIds[1]);
    await learnService.acknowledgeLessonCelebration(built.lessonIds[0], userId);

    await complete(built.questionIds[2]);

    const result = await learnService.getCelebrations(userId, built.pathId);
    expect(result.lessons.map((l) => l.title)).not.toContain("Lesson One");
  });

  it("scopes acknowledgement to one user", async () => {
    const built = await build();
    const other = await prisma.user.create({
      data: { name: "O", email: `${tag}-o@e.test`, role: "contestee", isVerified: true },
    });

    for (const q of built.questionIds) {
      await complete(q);
      await progress.recordQuestionCompletion({
        userId: other.id,
        questionId: q,
        source: "verified",
      });
    }

    await learnService.acknowledgeModuleCelebration(built.moduleIds[0], userId);

    expect((await learnService.getCelebrations(userId, built.pathId)).modules).toEqual([]);
    expect(
      (await learnService.getCelebrations(other.id, built.pathId)).modules,
    ).toHaveLength(1);

    await prisma.userLearnQuestionProgress.deleteMany({ where: { userId: other.id } });
    await prisma.userLearnLessonProgress.deleteMany({ where: { userId: other.id } });
    await prisma.userLearnModuleProgress.deleteMany({ where: { userId: other.id } });
    await prisma.userLearnPathProgress.deleteMany({ where: { userId: other.id } });
    await prisma.user.delete({ where: { id: other.id } });
  });
});

describe("module supersedes lesson (§3.6)", () => {
  // Finishing the last lesson of a module completes both. Showing two modals
  // back to back is comic, so only the module one is offered.
  it("hides the lesson milestone when the module completes too", async () => {
    const built = await build();
    for (const q of built.questionIds) await complete(q);

    const result = await learnService.getCelebrations(userId, built.pathId);

    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].title).toBe("Module One");
    expect(result.lessons).toEqual([]);
  });

  // …but the suppressed ones must still be marked seen, or they queue up and
  // fire individually on the next page load — the exact bug suppression exists
  // to prevent.
  it("returns the suppressed lessons so they can be acknowledged too", async () => {
    const built = await build();
    for (const q of built.questionIds) await complete(q);

    const result = await learnService.getCelebrations(userId, built.pathId);

    expect(result.alsoAcknowledge.lessonIds).toHaveLength(2);
    expect(result.alsoAcknowledge.lessonIds).toEqual(
      expect.arrayContaining(built.lessonIds),
    );
  });

  it("acknowledging the module clears its lessons as well", async () => {
    const built = await build();
    for (const q of built.questionIds) await complete(q);

    await learnService.acknowledgeModuleCelebration(built.moduleIds[0], userId);

    const result = await learnService.getCelebrations(userId, built.pathId);
    expect(result.modules).toEqual([]);
    expect(result.lessons).toEqual([]);

    for (const lessonId of built.lessonIds) {
      const row = await prisma.userLearnLessonProgress.findUniqueOrThrow({
        where: { userId_lessonId: { userId, lessonId } },
      });
      expect(row.celebratedAt).not.toBeNull();
    }
  });

  it("still shows a lesson milestone when the module is unfinished", async () => {
    const built = await build();
    await complete(built.questionIds[0]);
    await complete(built.questionIds[1]);

    const result = await learnService.getCelebrations(userId, built.pathId);
    expect(result.lessons).toHaveLength(1);
    expect(result.modules).toEqual([]);
    expect(result.alsoAcknowledge.lessonIds).toEqual([]);
  });
});

describe("next question (§3.4)", () => {
  it("points at the following question in curriculum order", async () => {
    const built = await build();

    const result = await learnService.getNextQuestion(
      `${tag}-path`,
      built.questionIds[0],
      userId,
    );

    expect(result.next!.questionId).toBe(built.questionIds[1]);
    expect(result.next!.problemSlug).toBe(`${tag}-b`);
  });

  it("crosses a lesson boundary", async () => {
    const built = await build();

    const result = await learnService.getNextQuestion(
      `${tag}-path`,
      built.questionIds[1],
      userId,
    );

    expect(result.next!.questionId).toBe(built.questionIds[2]);
    expect(result.next!.lessonTitle).toBe("Lesson Two");
  });

  // Offering something already solved is a dead end dressed as momentum.
  it("skips questions already complete", async () => {
    const built = await build();
    await complete(built.questionIds[1]);

    const result = await learnService.getNextQuestion(
      `${tag}-path`,
      built.questionIds[0],
      userId,
    );

    expect(result.next!.questionId).toBe(built.questionIds[2]);
  });

  it("returns null at the end of the path", async () => {
    const built = await build();

    const result = await learnService.getNextQuestion(
      `${tag}-path`,
      built.questionIds[3],
      userId,
    );

    expect(result.next).toBeNull();
    expect(result.progress).not.toBeNull();
  });

  it("returns null when everything remaining is complete", async () => {
    const built = await build();
    for (const q of built.questionIds) await complete(q);

    const result = await learnService.getNextQuestion(
      `${tag}-path`,
      built.questionIds[0],
      userId,
    );

    expect(result.next).toBeNull();
  });

  it("reports live path progress alongside the pointer", async () => {
    const built = await build();
    await complete(built.questionIds[0]);
    clearCurriculumCache();

    const result = await learnService.getNextQuestion(
      `${tag}-path`,
      built.questionIds[0],
      userId,
    );

    expect(result.progress).toEqual({ completedQuestions: 1, totalQuestions: 4 });
  });

  it("handles a question that is not in the path", async () => {
    await build();
    const other = await build(`${tag}-other`);

    const result = await learnService.getNextQuestion(
      `${tag}-path`,
      other.questionIds[0],
      userId,
    );

    expect(result.next).toBeNull();
  });
});
