/**
 * Schema-level guarantees for the learn tables, driven against real Postgres.
 *
 * Everything here is enforced by the *database*, not by application code, and
 * none of it is observable from a mocked Prisma client — which is the whole
 * reason this file exists rather than a unit test. The CHECK constraint in
 * `20260721000000_learn_paths` is hand-written SQL that Prisma neither generates
 * nor validates; if it were silently dropped, every test that mocks Prisma would
 * still pass and lesson pages would start rendering questions that point at
 * nothing.
 *
 * Requires `TEST_DATABASE_URL` pointing at a scratch database with migrations
 * applied. See `vitest.integration.config.ts`.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error(
    "TEST_DATABASE_URL is required for integration tests. " +
      "Point it at a scratch database — this suite truncates learn_* tables.",
  );
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

let creatorId: number;
let problemAId: number;
let problemBId: number;
let mcqId: number;

/** Unique per run so repeated runs against the same scratch DB don't collide. */
const tag = `itest-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

beforeAll(async () => {
  const creator = await prisma.user.create({
    data: {
      name: "Learn Schema Test",
      email: `${tag}@example.test`,
      role: "creator",
      isVerified: true,
    },
  });
  creatorId = creator.id;

  const makeProblem = async (n: string) =>
    (
      await prisma.dsaProblem.create({
        data: {
          slug: `${tag}-${n}`,
          title: `Learn schema test ${n}`,
          description: "fixture",
          signature: {},
          creatorId,
        },
      })
    ).id;

  problemAId = await makeProblem("a");
  problemBId = await makeProblem("b");

  mcqId = (
    await prisma.mcqQuestion.create({
      data: {
        questionText: `fixture ${tag}`,
        options: ["a", "b"],
        correctOptionIndex: 0,
        creatorId,
      },
    })
  ).id;
});

afterAll(async () => {
  // Ordered inside-out: learn_questions holds RESTRICT references to the
  // problems and MCQ, so those cannot go first.
  await prisma.learnPath.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.dsaProblem.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.mcqQuestion.deleteMany({ where: { questionText: `fixture ${tag}` } });
  await prisma.user.deleteMany({ where: { email: `${tag}@example.test` } });
  await prisma.$disconnect();
});

let lessonId: number;
let pathId: number;

beforeEach(async () => {
  await prisma.learnPath.deleteMany({ where: { slug: { startsWith: tag } } });

  const path = await prisma.learnPath.create({
    data: {
      slug: `${tag}-path`,
      title: "Fixture path",
      description: "fixture",
      modules: {
        create: {
          slug: "m1",
          title: "Module 1",
          order: 1000,
          lessons: { create: { slug: "l1", title: "Lesson 1", order: 1000 } },
        },
      },
    },
    include: { modules: { include: { lessons: true } } },
  });

  pathId = path.id;
  lessonId = path.modules[0].lessons[0].id;
});

/** Raw insert — Prisma's typed API can't express the invalid shapes we need. */
const insertQuestion = (opts: {
  lessonId: number;
  kind: "problem" | "mcq";
  problemId: number | null;
  mcqId: number | null;
  order?: number;
}) =>
  prisma.$executeRaw`
    INSERT INTO "learn_questions" ("lessonId", "kind", "order", "problemId", "mcqId")
    VALUES (
      ${opts.lessonId},
      ${opts.kind}::"LearnQuestionKind",
      ${opts.order ?? 1000},
      ${opts.problemId},
      ${opts.mcqId}
    )`;

describe("learn_questions CHECK constraint", () => {
  it("accepts a well-formed problem question", async () => {
    await expect(
      insertQuestion({ lessonId, kind: "problem", problemId: problemAId, mcqId: null }),
    ).resolves.toBe(1);
  });

  it("accepts a well-formed mcq question", async () => {
    await expect(
      insertQuestion({ lessonId, kind: "mcq", problemId: null, mcqId }),
    ).resolves.toBe(1);
  });

  it("rejects a question that points at nothing", async () => {
    await expect(
      insertQuestion({ lessonId, kind: "problem", problemId: null, mcqId: null }),
    ).rejects.toThrow(/learn_questions_kind_matches_target/);
  });

  it("rejects a question that is both a problem and an mcq", async () => {
    await expect(
      insertQuestion({ lessonId, kind: "problem", problemId: problemAId, mcqId }),
    ).rejects.toThrow(/learn_questions_kind_matches_target/);
  });

  // The case a plain `num_nonnulls(...) = 1` check would have let through, and
  // the reason `kind` is checked against the FKs rather than just their count.
  // A mismatch here renders a code editor for a multiple-choice question.
  it("rejects kind='problem' carrying an mcq target", async () => {
    await expect(
      insertQuestion({ lessonId, kind: "problem", problemId: null, mcqId }),
    ).rejects.toThrow(/learn_questions_kind_matches_target/);
  });

  it("rejects kind='mcq' carrying a problem target", async () => {
    await expect(
      insertQuestion({ lessonId, kind: "mcq", problemId: problemAId, mcqId: null }),
    ).rejects.toThrow(/learn_questions_kind_matches_target/);
  });
});

describe("learn_questions uniqueness", () => {
  // Asserted on SQLSTATE 23505 (unique_violation) and the offending key rather
  // than the index name: a raw-query failure reports Postgres' own message,
  // which names the columns but not the constraint.
  it("rejects the same problem twice in one lesson", async () => {
    await insertQuestion({ lessonId, kind: "problem", problemId: problemAId, mcqId: null, order: 1000 });
    await expect(
      insertQuestion({ lessonId, kind: "problem", problemId: problemAId, mcqId: null, order: 2000 }),
    ).rejects.toThrow(/23505[\s\S]*"lessonId", "problemId"/);
  });

  it("allows the same problem in two different lessons", async () => {
    const second = await prisma.learnLesson.create({
      data: {
        moduleId: (await prisma.learnModule.findFirstOrThrow({ where: { pathId } })).id,
        slug: "l2",
        title: "Lesson 2",
        order: 2000,
      },
    });

    await insertQuestion({ lessonId, kind: "problem", problemId: problemAId, mcqId: null });
    await expect(
      insertQuestion({ lessonId: second.id, kind: "problem", problemId: problemAId, mcqId: null }),
    ).resolves.toBe(1);
  });

  // Postgres treats NULLs as distinct, so `UNIQUE (lessonId, problemId)` does
  // not constrain MCQ rows — every one of them has a NULL problemId. That is
  // the desired behaviour here (a lesson holds many MCQs), and the opposite of
  // the situation in PRACTICE_MODE_AND_NAVIGATION.md §4.7 where NULL-distinctness
  // silently removed a guarantee. Asserted so the distinction stays deliberate:
  // if someone "fixes" this with a partial unique index, this test tells them.
  it("allows many mcq questions in one lesson despite the unique on (lessonId, problemId)", async () => {
    const second = await prisma.mcqQuestion.create({
      data: {
        questionText: `fixture ${tag} second`,
        options: ["a", "b"],
        correctOptionIndex: 1,
        creatorId,
      },
    });

    await insertQuestion({ lessonId, kind: "mcq", problemId: null, mcqId, order: 1000 });
    await expect(
      insertQuestion({ lessonId, kind: "mcq", problemId: null, mcqId: second.id, order: 2000 }),
    ).resolves.toBe(1);

    await prisma.learnQuestion.deleteMany({ where: { mcqId: second.id } });
    await prisma.mcqQuestion.delete({ where: { id: second.id } });
  });
});

describe("referential actions", () => {
  it("cascades a path delete down to its questions", async () => {
    await insertQuestion({ lessonId, kind: "problem", problemId: problemAId, mcqId: null });

    await prisma.learnPath.delete({ where: { id: pathId } });

    expect(await prisma.learnModule.count({ where: { pathId } })).toBe(0);
    expect(await prisma.learnLesson.count({ where: { id: lessonId } })).toBe(0);
    expect(await prisma.learnQuestion.count({ where: { lessonId } })).toBe(0);
  });

  // Prisma's default for an optional relation is SET NULL, which would blank
  // problemId while kind still said 'problem' — a CHECK violation surfacing at
  // an unrelated call site. RESTRICT makes the real cause the error.
  it("refuses to delete a problem that a path still uses", async () => {
    await insertQuestion({ lessonId, kind: "problem", problemId: problemBId, mcqId: null });

    await expect(prisma.dsaProblem.delete({ where: { id: problemBId } })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003",
      "expected a foreign key constraint violation (P2003)",
    );
  });
});
