/**
 * The admin builder's service layer, against real Postgres.
 *
 * Three things live here because none of them can be proven with a mocked
 * Prisma client:
 *
 *  - **Totals** (§5.10) are a recount across three tables. A wrong total is a
 *    wrong denominator, which is the §5.1 trust problem by another route.
 *  - **The contest-integrity guard** (§5.6) is a query against contest links,
 *    and its correctness is entirely about matching `practiceableWhere`.
 *  - **Reordering** (§5.9) is single-row updates plus a rebalance path that
 *    only triggers after the sparse gaps are genuinely exhausted.
 */

import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import * as adminLearn from "../src/service/adminLearn.service";
import * as learnRepo from "../src/repositories/learn.repository";
import { ORDER_STEP } from "../src/lib/ordering";
import {
  ProblemInLiveContestError,
  DuplicateLearnQuestionError,
  LearnPathNotPublishableError,
} from "../src/errors/learn.errors";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required for integration tests.");

// This suite drives service functions, which use the shared client in
// src/lib/db.ts — and that reads DATABASE_URL, not TEST_DATABASE_URL.
if (process.env.DATABASE_URL !== url) {
  throw new Error(
    "DATABASE_URL must equal TEST_DATABASE_URL for this suite (it exercises services " +
      "that use the shared Prisma client in src/lib/db.ts).",
  );
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

const tag = `adminlearn-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let creatorId: number;
let publicProblemIds: number[] = [];
let mcqIds: number[] = [];

const makeProblem = async (n: string, visibility: "public" | "draft" = "public") =>
  (
    await prisma.dsaProblem.create({
      data: {
        slug: `${tag}-${n}`,
        title: `${tag} ${n}`,
        description: "fixture",
        signature: {},
        creatorId,
        visibility,
      },
    })
  ).id;

beforeAll(async () => {
  creatorId = (
    await prisma.user.create({
      data: {
        name: "Admin learn test",
        email: `${tag}@example.test`,
        role: "creator",
        isVerified: true,
      },
    })
  ).id;

  publicProblemIds = [
    await makeProblem("p1"),
    await makeProblem("p2"),
    await makeProblem("p3"),
  ];

  for (const i of [1, 2]) {
    mcqIds.push(
      (
        await prisma.mcqQuestion.create({
          data: {
            questionText: `${tag} mcq ${i}`,
            options: ["a", "b"],
            correctOptionIndex: 0,
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
  await prisma.contestQuestion.deleteMany({
    where: { contest: { title: { startsWith: tag } } },
  });
  await prisma.contest.deleteMany({ where: { title: { startsWith: tag } } });
  await prisma.dsaProblem.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.mcqQuestion.deleteMany({ where: { questionText: { startsWith: tag } } });
  await prisma.user.deleteMany({ where: { email: `${tag}@example.test` } });
  await prisma.$disconnect();
});

let pathId: number;
let moduleId: number;
let lessonId: number;

beforeEach(async () => {
  await prisma.learnPath.deleteMany({ where: { slug: { startsWith: tag } } });

  // Contest fixtures too. The integrity-guard tests link problems into live
  // contests, and those links outlive the path — leaving them behind blocks
  // the shared fixture problems for every test that runs afterwards.
  // Links first: contest_questions references contests.
  await prisma.contestQuestion.deleteMany({
    where: { contest: { title: { startsWith: tag } } },
  });
  await prisma.contest.deleteMany({ where: { title: { startsWith: tag } } });

  const path = await adminLearn.createPath({
    slug: `${tag}-path`,
    title: "Fixture path",
    description: "fixture",
  });
  pathId = path.id;

  moduleId = (await adminLearn.createModule(pathId, { slug: "m1", title: "Module 1" })).id;
  lessonId = (await adminLearn.createLesson(moduleId, { slug: "l1", title: "Lesson 1" })).id;
});

describe("totals (§5.10)", () => {
  it("rolls question counts up to lesson, module and path", async () => {
    await adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] });
    await adminLearn.attachQuestion(lessonId, { kind: "mcq", mcqId: mcqIds[0] });

    const lesson = await prisma.learnLesson.findUniqueOrThrow({ where: { id: lessonId } });
    const learnModule = await prisma.learnModule.findUniqueOrThrow({ where: { id: moduleId } });
    const path = await prisma.learnPath.findUniqueOrThrow({ where: { id: pathId } });

    expect(lesson.totalQuestions).toBe(2);
    expect(learnModule.totalQuestions).toBe(2);
    expect(path.totalQuestions).toBe(2);
    expect(path.totalModules).toBe(1);
  });

  it("sums across several lessons and modules", async () => {
    const secondLesson = await adminLearn.createLesson(moduleId, { slug: "l2", title: "Lesson 2" });
    const secondModule = await adminLearn.createModule(pathId, { slug: "m2", title: "Module 2" });
    const thirdLesson = await adminLearn.createLesson(secondModule.id, {
      slug: "l3",
      title: "Lesson 3",
    });

    await adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] });
    await adminLearn.attachQuestion(secondLesson.id, {
      kind: "problem",
      problemId: publicProblemIds[1],
    });
    await adminLearn.attachQuestion(thirdLesson.id, {
      kind: "problem",
      problemId: publicProblemIds[2],
    });

    const path = await prisma.learnPath.findUniqueOrThrow({ where: { id: pathId } });
    expect(path.totalQuestions).toBe(3);
    expect(path.totalModules).toBe(2);

    expect(
      (await prisma.learnModule.findUniqueOrThrow({ where: { id: moduleId } })).totalQuestions,
    ).toBe(2);
    expect(
      (await prisma.learnModule.findUniqueOrThrow({ where: { id: secondModule.id } }))
        .totalQuestions,
    ).toBe(1);
  });

  it("decrements when a question is detached", async () => {
    const q = await adminLearn.attachQuestion(lessonId, {
      kind: "problem",
      problemId: publicProblemIds[0],
    });
    await adminLearn.attachQuestion(lessonId, { kind: "mcq", mcqId: mcqIds[0] });

    await adminLearn.detachQuestion(q.id);

    expect(
      (await prisma.learnPath.findUniqueOrThrow({ where: { id: pathId } })).totalQuestions,
    ).toBe(1);
  });

  // The bug a naive implementation ships: recompute skips containers with no
  // rows, so deleting a module's last lesson leaves the old count behind.
  it("zeroes a module whose last lesson was deleted", async () => {
    await adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] });
    expect(
      (await prisma.learnModule.findUniqueOrThrow({ where: { id: moduleId } })).totalQuestions,
    ).toBe(1);

    await adminLearn.deleteLesson(lessonId);

    expect(
      (await prisma.learnModule.findUniqueOrThrow({ where: { id: moduleId } })).totalQuestions,
    ).toBe(0);
    expect(
      (await prisma.learnPath.findUniqueOrThrow({ where: { id: pathId } })).totalQuestions,
    ).toBe(0);
  });

  it("drops a deleted module's questions from the path total", async () => {
    await adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] });
    await adminLearn.deleteModule(moduleId);

    const path = await prisma.learnPath.findUniqueOrThrow({ where: { id: pathId } });
    expect(path.totalQuestions).toBe(0);
    expect(path.totalModules).toBe(0);
  });
});

describe("contest-integrity guard (§5.6)", () => {
  const linkToContest = async (
    problemId: number,
    opts: { type: "competitive" | "practice"; status: "published" | "draft"; endTime: Date | null },
  ) => {
    const contest = await prisma.contest.create({
      data: {
        title: `${tag} contest`,
        description: "fixture",
        type: opts.type,
        status: opts.status,
        endTime: opts.endTime,
        creatorId,
      },
    });
    await prisma.contestQuestion.create({
      data: { contestId: contest.id, order: 1, dsaId: problemId },
    });
    return contest;
  };

  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  it("rejects a problem in a live competitive contest, naming it", async () => {
    await linkToContest(publicProblemIds[0], {
      type: "competitive",
      status: "published",
      endTime: future,
    });

    await expect(
      adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] }),
    ).rejects.toBeInstanceOf(ProblemInLiveContestError);

    await expect(
      adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] }),
    ).rejects.toThrow(new RegExp(`${tag} contest`));
  });

  it("writes nothing when the guard rejects", async () => {
    await linkToContest(publicProblemIds[0], {
      type: "competitive",
      status: "published",
      endTime: future,
    });

    await expect(
      adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] }),
    ).rejects.toThrow();

    expect(await prisma.learnQuestion.count({ where: { lessonId } })).toBe(0);
    expect(
      (await prisma.learnPath.findUniqueOrThrow({ where: { id: pathId } })).totalQuestions,
    ).toBe(0);
  });

  it("treats a null endTime as never-finished, matching practiceableWhere", async () => {
    await linkToContest(publicProblemIds[0], {
      type: "competitive",
      status: "published",
      endTime: null,
    });

    await expect(
      adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] }),
    ).rejects.toBeInstanceOf(ProblemInLiveContestError);
  });

  it("allows a problem whose competitive contest has finished", async () => {
    await linkToContest(publicProblemIds[0], {
      type: "competitive",
      status: "published",
      endTime: past,
    });

    await expect(
      adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] }),
    ).resolves.toBeTruthy();
  });

  // Practice contests are self-paced and unranked, so there is no integrity to
  // protect — the same carve-out practiceableWhere makes.
  it("allows a problem in a live practice contest", async () => {
    await linkToContest(publicProblemIds[0], {
      type: "practice",
      status: "published",
      endTime: future,
    });

    await expect(
      adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] }),
    ).resolves.toBeTruthy();
  });

  it("allows a problem in an unpublished competitive contest", async () => {
    await linkToContest(publicProblemIds[0], {
      type: "competitive",
      status: "draft",
      endTime: future,
    });

    await expect(
      adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] }),
    ).resolves.toBeTruthy();
  });

  // §5.6's residual case: the link is made *after* the problem is in the path,
  // which the attach-time guard cannot prevent. Publish is the next checkpoint.
  it("catches a contest linked after the fact, at publish time", async () => {
    await adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] });
    expect(await adminLearn.validatePathForPublish(pathId)).toEqual([]);

    await linkToContest(publicProblemIds[0], {
      type: "competitive",
      status: "published",
      endTime: future,
    });

    const problems = await adminLearn.validatePathForPublish(pathId);
    expect(problems.join(" ")).toMatch(new RegExp(`${tag} contest`));
  });
});

describe("attach rules", () => {
  it("rejects the same problem twice in one lesson with a clear error", async () => {
    await adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] });

    await expect(
      adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] }),
    ).rejects.toBeInstanceOf(DuplicateLearnQuestionError);
  });

  it("allows the same problem in two different lessons", async () => {
    const second = await adminLearn.createLesson(moduleId, { slug: "l2", title: "Lesson 2" });

    await adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] });
    await expect(
      adminLearn.attachQuestion(second.id, { kind: "problem", problemId: publicProblemIds[0] }),
    ).resolves.toBeTruthy();
  });

  it("allows many MCQs in one lesson", async () => {
    await adminLearn.attachQuestion(lessonId, { kind: "mcq", mcqId: mcqIds[0] });
    await expect(
      adminLearn.attachQuestion(lessonId, { kind: "mcq", mcqId: mcqIds[1] }),
    ).resolves.toBeTruthy();
  });
});

describe("reordering (§5.9)", () => {
  const orderedIds = async () =>
    (
      await prisma.learnQuestion.findMany({
        where: { lessonId },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: { id: true },
      })
    ).map((q) => q.id);

  let ids: number[];

  beforeEach(async () => {
    ids = [];
    for (const problemId of publicProblemIds) {
      ids.push((await adminLearn.attachQuestion(lessonId, { kind: "problem", problemId })).id);
    }
  });

  it("appends new questions with sparse spacing", async () => {
    const rows = await prisma.learnQuestion.findMany({
      where: { lessonId },
      orderBy: { order: "asc" },
      select: { order: true },
    });
    expect(rows.map((r) => r.order)).toEqual([ORDER_STEP, ORDER_STEP * 2, ORDER_STEP * 3]);
  });

  it("moves an item to the head", async () => {
    await adminLearn.reorderQuestion(ids[2], 0);
    expect(await orderedIds()).toEqual([ids[2], ids[0], ids[1]]);
  });

  it("moves an item to the tail", async () => {
    await adminLearn.reorderQuestion(ids[0], 2);
    expect(await orderedIds()).toEqual([ids[1], ids[2], ids[0]]);
  });

  it("moves an item into the middle", async () => {
    await adminLearn.reorderQuestion(ids[0], 1);
    expect(await orderedIds()).toEqual([ids[1], ids[0], ids[2]]);
  });

  it("touches only one row for a normal move", async () => {
    const before = await prisma.learnQuestion.findMany({
      where: { lessonId },
      select: { id: true, order: true },
    });

    await adminLearn.reorderQuestion(ids[0], 1);

    const after = await prisma.learnQuestion.findMany({
      where: { lessonId },
      select: { id: true, order: true },
    });

    const changed = after.filter(
      (row) => before.find((b) => b.id === row.id)!.order !== row.order,
    );
    expect(changed).toHaveLength(1);
    expect(changed[0].id).toBe(ids[0]);
  });

  // Drive the gaps to exhaustion and confirm the rebalance path both triggers
  // and produces a correct list rather than a duplicate-order mess.
  it("rebalances transparently once the gaps run out", async () => {
    for (let i = 0; i < 40; i++) {
      await adminLearn.reorderQuestion(ids[2], 1);
      await adminLearn.reorderQuestion(ids[0], 1);
    }

    const rows = await prisma.learnQuestion.findMany({
      where: { lessonId },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, order: true },
    });

    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.order)).size).toBe(3);
    expect(rows.every((r) => r.order > 0)).toBe(true);
  });
});

describe("publish validation (§7)", () => {
  it("rejects a path with no modules", async () => {
    const empty = await adminLearn.createPath({
      slug: `${tag}-empty`,
      title: "Empty",
      description: "fixture",
    });

    expect(await adminLearn.validatePathForPublish(empty.id)).toContain(
      "The path has no modules.",
    );
  });

  it("rejects an empty module and an empty lesson", async () => {
    const problems = await adminLearn.validatePathForPublish(pathId);
    expect(problems.join(" ")).toMatch(/has no questions/);
  });

  it("rejects a non-public problem", async () => {
    const draftProblem = await makeProblem("draftp", "draft");
    await adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: draftProblem });

    const problems = await adminLearn.validatePathForPublish(pathId);
    expect(problems.join(" ")).toMatch(/is draft, not public/);
  });

  it("passes a well-formed path", async () => {
    await adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] });
    expect(await adminLearn.validatePathForPublish(pathId)).toEqual([]);
  });

  it("refuses to publish an invalid path through updatePath", async () => {
    await expect(
      adminLearn.updatePath(pathId, { status: "published" }),
    ).rejects.toBeInstanceOf(LearnPathNotPublishableError);

    expect(
      (await prisma.learnPath.findUniqueOrThrow({ where: { id: pathId } })).status,
    ).toBe("draft");
  });

  it("publishes a valid path", async () => {
    await adminLearn.attachQuestion(lessonId, { kind: "problem", problemId: publicProblemIds[0] });
    await adminLearn.updatePath(pathId, { status: "published" });

    expect(
      (await prisma.learnPath.findUniqueOrThrow({ where: { id: pathId } })).status,
    ).toBe("published");
  });

  // Archiving must never be blocked by validation — a broken path is exactly
  // the one a curator most needs to take down.
  it("archives without validating", async () => {
    await adminLearn.archivePath(pathId);
    expect(
      (await prisma.learnPath.findUniqueOrThrow({ where: { id: pathId } })).status,
    ).toBe("archived");
  });
});

describe("blast radius (§5.1)", () => {
  it("reports how many learners are on a path", async () => {
    expect((await adminLearn.getPathImpact(pathId)).learners).toBe(0);

    await prisma.userLearnPathProgress.create({ data: { userId: creatorId, pathId } });

    expect((await adminLearn.getPathImpact(pathId)).learners).toBe(1);
  });
});

describe("tree projection", () => {
  // The creator builder still runs in a browser, and an MCQ answer key in a
  // devtools network tab is an answer key (§5.7).
  it("never includes correctOptionIndex", async () => {
    await adminLearn.attachQuestion(lessonId, { kind: "mcq", mcqId: mcqIds[0] });

    const tree = await adminLearn.getPathTree(pathId);
    expect(JSON.stringify(tree)).not.toContain("correctOptionIndex");
  });
});

describe("learnRepo.blockingContestForProblem", () => {
  it("returns null for a problem in no contest", async () => {
    expect(
      await learnRepo.blockingContestForProblem(publicProblemIds[0], new Date()),
    ).toBeNull();
  });
});
