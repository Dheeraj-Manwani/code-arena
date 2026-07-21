/**
 * The learner read path, against real Postgres (LEARN_PATHS.md Phase 3).
 *
 * The claim worth proving here is §1's endowed progress: a user who solved
 * problems *before this path existed* — in a contest, in practice, anywhere —
 * opens it already credited. That is a join between `UserProblemStatus` and the
 * curriculum, so a mocked Prisma client can say nothing about whether it works.
 *
 * The second claim is that Phase 3 writes nothing. Asserted explicitly, because
 * "read-only" is the property Phase 4's counters will be validated against.
 */

import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import * as learnService from "../src/service/learn.service";
import * as adminLearn from "../src/service/adminLearn.service";
import { clearCurriculumCache } from "../src/lib/curriculumCache";
import { LearnPathNotFoundError } from "../src/errors/learn.errors";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required for integration tests.");
if (process.env.DATABASE_URL !== url) {
  throw new Error("DATABASE_URL must equal TEST_DATABASE_URL for this suite.");
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

const tag = `learner-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let creatorId: number;
let learnerId: number;
let problemIds: number[] = [];
let mcqId: number;

beforeAll(async () => {
  creatorId = (
    await prisma.user.create({
      data: { name: "C", email: `${tag}-c@example.test`, role: "creator", isVerified: true },
    })
  ).id;
  learnerId = (
    await prisma.user.create({
      data: { name: "L", email: `${tag}-l@example.test`, role: "contestee", isVerified: true },
    })
  ).id;

  for (const n of ["p1", "p2", "p3", "p4"]) {
    problemIds.push(
      (
        await prisma.dsaProblem.create({
          data: {
            slug: `${tag}-${n}`,
            title: `${tag} ${n}`,
            description: "fixture",
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
        correctOptionIndex: 1,
        creatorId,
        visibility: "public",
      },
    })
  ).id;
});

afterAll(async () => {
  await prisma.learnPath.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.userProblemStatus.deleteMany({ where: { userId: learnerId } });
  await prisma.dsaProblem.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.mcqQuestion.deleteMany({ where: { questionText: { startsWith: tag } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  await prisma.$disconnect();
});

/** Two modules × one lesson × two questions, published. */
const buildPath = async () => {
  const path = await adminLearn.createPath({
    slug: `${tag}-path`,
    title: "Learner path",
    description: "fixture",
  });

  const m1 = await adminLearn.createModule(path.id, { slug: "m1", title: "Module 1" });
  const l1 = await adminLearn.createLesson(m1.id, {
    slug: "l1",
    title: "Lesson 1",
    body: "# prose",
  });
  await adminLearn.attachQuestion(l1.id, { kind: "problem", problemId: problemIds[0] });
  await adminLearn.attachQuestion(l1.id, { kind: "problem", problemId: problemIds[1] });

  const m2 = await adminLearn.createModule(path.id, { slug: "m2", title: "Module 2" });
  const l2 = await adminLearn.createLesson(m2.id, { slug: "l2", title: "Lesson 2" });
  await adminLearn.attachQuestion(l2.id, { kind: "problem", problemId: problemIds[2] });
  await adminLearn.attachQuestion(l2.id, { kind: "problem", problemId: problemIds[3] });

  await adminLearn.updatePath(path.id, { status: "published" });
  return { path, lessonOneId: l1.id };
};

const markSolved = (problemId: number) =>
  prisma.userProblemStatus.create({
    data: { userId: learnerId, problemId, status: "solved", solvedAt: new Date() },
  });

beforeEach(async () => {
  // The cache is keyed by slug, and every test rebuilds the path under the same
  // slug — without this, test two reads test one's tree.
  clearCurriculumCache();
  await prisma.learnPath.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.userProblemStatus.deleteMany({ where: { userId: learnerId } });
});

describe("endowed progress (§1, §5.2)", () => {
  it("credits problems solved before the path existed", async () => {
    // Solved first — the ordering matters, this is the real-world case.
    await markSolved(problemIds[0]);
    await markSolved(problemIds[2]);

    await buildPath();

    const path = await learnService.getPath(`${tag}-path`, learnerId);

    expect(path.totalQuestions).toBe(4);
    expect(path.completedQuestions).toBe(2);
    expect(path.modules[0].completedQuestions).toBe(1);
    expect(path.modules[1].completedQuestions).toBe(1);
  });

  it("starts a user with no history at zero", async () => {
    await buildPath();

    const path = await learnService.getPath(`${tag}-path`, learnerId);
    expect(path.completedQuestions).toBe(0);
  });

  it("scopes completion to the requesting user", async () => {
    await markSolved(problemIds[0]);
    await buildPath();

    const other = await prisma.user.create({
      data: { name: "O", email: `${tag}-o@example.test`, role: "contestee", isVerified: true },
    });

    expect((await learnService.getPath(`${tag}-path`, learnerId)).completedQuestions).toBe(1);
    expect((await learnService.getPath(`${tag}-path`, other.id)).completedQuestions).toBe(0);
  });

  // `UserProblemStatus.attempted` is not solved, and must not count.
  it("does not credit an attempted-but-unsolved problem", async () => {
    await prisma.userProblemStatus.create({
      data: { userId: learnerId, problemId: problemIds[0], status: "attempted" },
    });
    await buildPath();

    expect((await learnService.getPath(`${tag}-path`, learnerId)).completedQuestions).toBe(0);
  });
});

describe("backfill on first view (§5.2 hazard 1)", () => {
  /**
   * Phase 3 asserted the opposite here — that these reads wrote nothing — and
   * that was the right assertion *for that phase*: it gave Phase 4's counters a
   * known-good derivation to be validated against before anything could drift.
   *
   * Phase 4 supersedes it. Reads now materialise a user's pre-existing solve
   * history into `UserLearnQuestionProgress` exactly once per (user, path). The
   * property that survives is the one that always mattered: **what the user
   * sees is unchanged** by where the number comes from.
   */
  it("materialises prior solves on first view, and only once", async () => {
    await markSolved(problemIds[0]);
    const { path } = await buildPath();

    const first = await learnService.getPath(`${tag}-path`, learnerId);
    expect(first.completedQuestions).toBe(1);

    const rows = await prisma.userLearnQuestionProgress.count({ where: { userId: learnerId } });
    expect(rows).toBe(1);

    await learnService.getPath(`${tag}-path`, learnerId);
    await learnService.getGallery(learnerId);

    expect(await prisma.userLearnQuestionProgress.count({ where: { userId: learnerId } })).toBe(
      rows,
    );
    expect(await prisma.userLearnPathProgress.count({ where: { pathId: path.id } })).toBe(1);
  });

  // Found by Phase 4 breaking this suite: the lesson page is a deep-linkable
  // URL, and backfilling only on the path page showed a bookmarked lesson 0/N
  // despite real solve history.
  it("backfills when the lesson page is the first thing opened", async () => {
    await markSolved(problemIds[0]);
    const { lessonOneId } = await buildPath();

    const lesson = await learnService.getLesson(lessonOneId, learnerId);
    expect(lesson.completedQuestions).toBe(1);
  });

  // The gallery must not create the row — that latch is what makes the backfill
  // run exactly once, and it belongs to the pages that can do the full fold.
  it("does not enrol a user from the gallery alone", async () => {
    await markSolved(problemIds[0]);
    const { path } = await buildPath();

    const gallery = await learnService.getGallery(learnerId);
    const entry = gallery.find((p) => p.slug === `${tag}-path`);

    // Still counted correctly, via live derivation…
    expect(entry!.completedQuestions).toBe(1);
    // …without stealing the latch.
    expect(await prisma.userLearnPathProgress.count({ where: { pathId: path.id } })).toBe(0);
  });
});

describe("gallery", () => {
  it("lists published paths with per-user counts", async () => {
    await markSolved(problemIds[0]);
    await buildPath();

    const gallery = await learnService.getGallery(learnerId);
    const entry = gallery.find((p) => p.slug === `${tag}-path`);

    expect(entry).toBeDefined();
    expect(entry!.totalQuestions).toBe(4);
    expect(entry!.completedQuestions).toBe(1);
    expect(entry!.started).toBe(true);
  });

  it("marks an untouched path as not started", async () => {
    await buildPath();

    const entry = (await learnService.getGallery(learnerId)).find(
      (p) => p.slug === `${tag}-path`,
    );
    expect(entry!.started).toBe(false);
  });

  /**
   * The front door on a fresh install (D10, §3.8).
   *
   * `/` redirects to `/learn` as of Phase 7, so this response *is* the first
   * thing anyone sees after signing up on a new deployment. An empty list is a
   * legitimate state that must render the gallery's empty state — a throw here
   * would take down the whole app's landing page.
   */
  it("returns an empty list rather than failing when no paths are published", async () => {
    // Nothing built in this test — beforeEach already removed the fixtures.
    const gallery = await learnService.getGallery(learnerId);

    expect(Array.isArray(gallery)).toBe(true);
    expect(gallery.filter((p) => p.slug.startsWith(tag))).toEqual([]);
  });

  it("hides draft paths", async () => {
    const path = await adminLearn.createPath({
      slug: `${tag}-draft`,
      title: "Draft",
      description: "fixture",
    });

    const gallery = await learnService.getGallery(learnerId);
    expect(gallery.find((p) => p.slug === path.slug)).toBeUndefined();
  });
});

describe("path access", () => {
  it("404s an unpublished path", async () => {
    await adminLearn.createPath({
      slug: `${tag}-hidden`,
      title: "Hidden",
      description: "fixture",
    });

    await expect(learnService.getPath(`${tag}-hidden`, learnerId)).rejects.toBeInstanceOf(
      LearnPathNotFoundError,
    );
  });

  it("404s an unknown slug", async () => {
    await expect(learnService.getPath(`${tag}-nope`, learnerId)).rejects.toBeInstanceOf(
      LearnPathNotFoundError,
    );
  });
});

describe("soft gating (§5.4)", () => {
  it("unlocks the first module and gates the second", async () => {
    await buildPath();

    const path = await learnService.getPath(`${tag}-path`, learnerId);
    expect(path.modules[0].gate).toEqual({ unlocked: true });
    expect(path.modules[1].gate.unlocked).toBe(false);
  });

  it("unlocks the second module once the first passes the threshold", async () => {
    // Default threshold 0.6; module 1 has 2 questions, so 2/2 clears it.
    await markSolved(problemIds[0]);
    await markSolved(problemIds[1]);
    await buildPath();

    const path = await learnService.getPath(`${tag}-path`, learnerId);
    expect(path.modules[1].gate).toEqual({ unlocked: true });
  });
});

describe("current pointer (§3.2)", () => {
  it("points at the first incomplete question", async () => {
    await buildPath();

    const path = await learnService.getPath(`${tag}-path`, learnerId);
    expect(path.current?.moduleTitle).toBe("Module 1");
    expect(path.current?.problemSlug).toBe(`${tag}-p1`);
  });

  it("skips completed questions", async () => {
    await markSolved(problemIds[0]);
    await buildPath();

    const path = await learnService.getPath(`${tag}-path`, learnerId);
    expect(path.current?.problemSlug).toBe(`${tag}-p2`);
  });

  /**
   * Phase 3 skipped MCQs here, because nothing could answer one and pointing
   * the page primary call-to-action at an unanswerable question was a dead end.
   * Phase 5 makes them answerable inline, so the skip is gone and curriculum
   * order is honoured exactly.
   */
  it("points at an MCQ when it genuinely comes first", async () => {
    const path = await adminLearn.createPath({
      slug: `${tag}-mcqfirst`,
      title: "MCQ first",
      description: "fixture",
    });
    const mod = await adminLearn.createModule(path.id, { slug: "m1", title: "M" });
    const lesson = await adminLearn.createLesson(mod.id, { slug: "l1", title: "L" });

    const first = await adminLearn.attachQuestion(lesson.id, { kind: "mcq", mcqId });
    await adminLearn.attachQuestion(lesson.id, { kind: "problem", problemId: problemIds[0] });
    await adminLearn.updatePath(path.id, { status: "published" });
    clearCurriculumCache();

    const view = await learnService.getPath(`${tag}-mcqfirst`, learnerId);

    expect(view.current!.questionId).toBe(first.id);
    expect(view.totalQuestions).toBe(2);
  });

  it("points at an MCQ-only path rather than giving up", async () => {
    const path = await adminLearn.createPath({
      slug: `${tag}-mcqonly`,
      title: "MCQ only",
      description: "fixture",
    });
    const mod = await adminLearn.createModule(path.id, { slug: "m1", title: "M" });
    const lesson = await adminLearn.createLesson(mod.id, { slug: "l1", title: "L" });
    const only = await adminLearn.attachQuestion(lesson.id, { kind: "mcq", mcqId });
    await adminLearn.updatePath(path.id, { status: "published" });
    clearCurriculumCache();

    const view = await learnService.getPath(`${tag}-mcqonly`, learnerId);
    expect(view.current!.questionId).toBe(only.id);
  });

  it("is null once everything is complete", async () => {
    for (const id of problemIds) await markSolved(id);
    await buildPath();

    const path = await learnService.getPath(`${tag}-path`, learnerId);
    expect(path.current).toBeNull();
    expect(path.completedQuestions).toBe(path.totalQuestions);
  });
});

describe("lesson page", () => {
  it("returns prose and questions", async () => {
    const { lessonOneId } = await buildPath();

    const lesson = await learnService.getLesson(lessonOneId, learnerId);
    expect(lesson.body).toBe("# prose");
    expect(lesson.questions).toHaveLength(2);
    expect(lesson.module.pathSlug).toBe(`${tag}-path`);
  });

  it("reflects completion", async () => {
    await markSolved(problemIds[0]);
    const { lessonOneId } = await buildPath();

    const lesson = await learnService.getLesson(lessonOneId, learnerId);
    expect(lesson.completedQuestions).toBe(1);
    expect(lesson.questions[0].isComplete).toBe(true);
    expect(lesson.questions[1].isComplete).toBe(false);
  });
});

describe("projection safety (§5.7)", () => {
  // The learner routes are a separate repository from the creator ones precisely
  // so this can be asserted and stay true.
  it("never ships correctOptionIndex from the path page", async () => {
    const { path } = await buildPath();
    const lesson = await prisma.learnLesson.findFirstOrThrow({
      where: { module: { pathId: path.id } },
    });
    await adminLearn.attachQuestion(lesson.id, { kind: "mcq", mcqId });
    clearCurriculumCache();

    const serialised = JSON.stringify(await learnService.getPath(`${tag}-path`, learnerId));
    expect(serialised).not.toContain("correctOptionIndex");
    // Options *are* shipped as of Phase 5 — a learner cannot answer without
    // them, and they are not the answer. Only the index must never travel.
    expect(serialised).toContain("options");
  });

  it("never ships correctOptionIndex from the lesson page", async () => {
    const { lessonOneId } = await buildPath();
    await adminLearn.attachQuestion(lessonOneId, { kind: "mcq", mcqId });
    clearCurriculumCache();

    const serialised = JSON.stringify(await learnService.getLesson(lessonOneId, learnerId));
    expect(serialised).not.toContain("correctOptionIndex");
  });

  // Phase 3 has nowhere to record an MCQ answer, so MCQs can never be complete.
  // They still count toward the denominator — an honestly incomplete number
  // beats one that quietly excludes what it can't measure.
  it("counts MCQs in the total but never marks them complete", async () => {
    const { lessonOneId } = await buildPath();
    await adminLearn.attachQuestion(lessonOneId, { kind: "mcq", mcqId });
    clearCurriculumCache();

    const lesson = await learnService.getLesson(lessonOneId, learnerId);
    expect(lesson.totalQuestions).toBe(3);

    const mcq = lesson.questions.find((q) => q.kind === "mcq");
    expect(mcq?.isComplete).toBe(false);
  });
});
