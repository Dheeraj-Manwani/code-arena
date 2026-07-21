/**
 * The MCQ visibility column and its default, against real Postgres.
 *
 * The *backfill* half of `20260721000001_mcq_visibility` — pre-existing rows
 * becoming `contest_only` — is a one-shot statement that cannot be re-run
 * meaningfully once applied, so it is verified by replaying the migration chain
 * against a scratch database rather than asserted here. See the Phase 0 notes in
 * LEARN_PATHS.md for that run.
 *
 * What *is* asserted here is the property the backfill depends on and that a
 * future migration could silently break: new rows default to `draft`. If that
 * default ever flipped to `public`, every question a creator started drafting
 * would be live, and nothing in the type system would notice.
 */

import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error("TEST_DATABASE_URL is required for integration tests.");
}

/**
 * The repository suite below imports `src/repositories/problem.repository`,
 * which uses the shared client in `src/lib/db.ts` — and that client reads
 * `DATABASE_URL`, not `TEST_DATABASE_URL`. So unlike the rest of this file, it
 * writes to whatever `DATABASE_URL` points at.
 *
 * Refusing to run when the two disagree is the difference between an
 * integration test and an integration test that quietly inserts rows into
 * someone's development database.
 */
if (process.env.DATABASE_URL !== url) {
  throw new Error(
    "DATABASE_URL must equal TEST_DATABASE_URL for this suite.\n" +
      "It exercises repository functions, which use the shared Prisma client " +
      "(src/lib/db.ts) and therefore write to DATABASE_URL.\n" +
      `  TEST_DATABASE_URL=${url}\n` +
      `  DATABASE_URL=${process.env.DATABASE_URL ?? "(unset)"}`,
  );
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

const tag = `mcqvis-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
let creatorId: number;

beforeAll(async () => {
  creatorId = (
    await prisma.user.create({
      data: {
        name: "MCQ visibility test",
        email: `${tag}@example.test`,
        role: "creator",
        isVerified: true,
      },
    })
  ).id;
});

afterAll(async () => {
  await prisma.mcqQuestion.deleteMany({ where: { questionText: { startsWith: tag } } });
  await prisma.dsaProblem.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.user.deleteMany({ where: { email: `${tag}@example.test` } });
  await prisma.$disconnect();
});

describe("McqQuestion.visibility", () => {
  it("defaults to draft when not specified", async () => {
    const created = await prisma.mcqQuestion.create({
      data: {
        questionText: `${tag} defaulted`,
        options: ["a", "b"],
        correctOptionIndex: 0,
        creatorId,
      },
    });

    expect(created.visibility).toBe("draft");
  });

  it("round-trips each visibility value", async () => {
    for (const visibility of ["draft", "public", "contest_only"] as const) {
      const created = await prisma.mcqQuestion.create({
        data: {
          questionText: `${tag} ${visibility}`,
          options: ["a", "b"],
          correctOptionIndex: 0,
          creatorId,
          visibility,
        },
      });
      expect(created.visibility).toBe(visibility);
    }
  });

  // The whole point of Phase 0: a creator must be able to move a question from
  // the bank into learner-visible territory, and back.
  it("can be flipped to public and back", async () => {
    const created = await prisma.mcqQuestion.create({
      data: {
        questionText: `${tag} flip`,
        options: ["a", "b"],
        correctOptionIndex: 0,
        creatorId,
      },
    });

    const published = await prisma.mcqQuestion.update({
      where: { id: created.id },
      data: { visibility: "public" },
    });
    expect(published.visibility).toBe("public");

    const withdrawn = await prisma.mcqQuestion.update({
      where: { id: created.id },
      data: { visibility: "draft" },
    });
    expect(withdrawn.visibility).toBe("draft");
  });
});

/**
 * The repository layer, not just the column.
 *
 * `createStandaloneMcqQuestion` builds its `data` by listing fields explicitly
 * rather than spreading, so a new column reaches the database only if someone
 * remembered to add it there. That is a good default — it stops request bodies
 * from silently writing columns — but it means "the schema has the field" and
 * "creating a question persists the field" are genuinely different claims. The
 * failure is silent: the write succeeds, the value is just quietly `draft`.
 */
describe("repository create path persists visibility", () => {
  it("persists an explicit visibility through createStandaloneMcqQuestion", async () => {
    const repo = await import("../src/repositories/problem.repository");

    const created = await repo.createStandaloneMcqQuestion({
      questionText: `${tag} via repo`,
      options: ["a", "b"],
      correctOptionIndex: 0,
      creatorId,
      visibility: "public",
    });

    expect(created.visibility).toBe("public");

    // Re-read rather than trusting the create's return value, so a repository
    // that returned an optimistic object can't pass this.
    const reread = await prisma.mcqQuestion.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(reread.visibility).toBe("public");
  });

  it("falls back to draft when the repository is given no visibility", async () => {
    const repo = await import("../src/repositories/problem.repository");

    const created = await repo.createStandaloneMcqQuestion({
      questionText: `${tag} via repo default`,
      options: ["a", "b"],
      correctOptionIndex: 0,
      creatorId,
    });

    expect(created.visibility).toBe("draft");
  });

  it("exposes visibility in the creator list projection", async () => {
    const repo = await import("../src/repositories/problem.repository");

    await repo.createStandaloneMcqQuestion({
      questionText: `${tag} listed`,
      options: ["a", "b"],
      correctOptionIndex: 0,
      creatorId,
      visibility: "contest_only",
    });

    const { questions } = await repo.getAllMcqQuestions(1, 50, `${tag} listed`);
    expect(questions).toHaveLength(1);
    expect(questions[0].visibility).toBe("contest_only");
  });
});

describe("DsaProblem.visibility parity", () => {
  // Both halves of the question bank must answer "may a learner see this?" the
  // same way, or the learn path builder needs two different rules.
  it("defaults to draft, matching McqQuestion", async () => {
    const created = await prisma.dsaProblem.create({
      data: {
        slug: `${tag}-parity`,
        title: `${tag} parity`,
        description: "fixture",
        signature: {},
        creatorId,
      },
    });

    expect(created.visibility).toBe("draft");
  });
});
