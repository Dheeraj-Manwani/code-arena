/**
 * MCQ answering, against real Postgres (LEARN_PATHS.md Phase 5, §5.7).
 *
 * The security property here is narrow and absolute: **`correctOptionIndex`
 * must never reach a learner before they have answered correctly.** It is one
 * field in one projection, which is exactly the kind of thing that gets added
 * back by a well-meaning `select: true` months later — so it is asserted against
 * the literal serialised response, not against a typed shape that would happily
 * carry an extra key.
 *
 * PRACTICE_MODE §4.4 documents the same trap being live in `getAllMcqQuestions`
 * today, which is why the learner path has its own projection rather than
 * re-authorising that one.
 */

import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import * as learnService from "../src/service/learn.service";
import * as adminLearn from "../src/service/adminLearn.service";
import { clearCurriculumCache } from "../src/lib/curriculumCache";
import { LearnQuestionNotFoundError } from "../src/errors/learn.errors";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required.");
if (process.env.DATABASE_URL !== url) {
  throw new Error("DATABASE_URL must equal TEST_DATABASE_URL for this suite.");
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
const tag = `mcq-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const CORRECT = 2;

let creatorId: number;
let userId: number;
let mcqId: number;
let problemId: number;

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

  mcqId = (
    await prisma.mcqQuestion.create({
      data: {
        questionText: `${tag} which is monotonic?`,
        options: ["Alpha", "Beta", "Gamma", "Delta"],
        correctOptionIndex: CORRECT,
        creatorId,
        visibility: "public",
      },
    })
  ).id;

  problemId = (
    await prisma.dsaProblem.create({
      data: {
        slug: `${tag}-p`,
        title: `${tag} p`,
        description: "f",
        signature: {},
        creatorId,
        visibility: "public",
      },
    })
  ).id;
});

afterAll(async () => {
  await prisma.learnPath.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.problemStat.deleteMany({ where: { problem: { slug: { startsWith: tag } } } });
  await prisma.dsaProblem.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.mcqQuestion.deleteMany({ where: { questionText: { startsWith: tag } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  await prisma.$disconnect();
});

let questionId: number;
let lessonId: number;

beforeEach(async () => {
  clearCurriculumCache();
  await prisma.learnPath.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.learnMcqAttempt.deleteMany({ where: { userId } });
  await prisma.userLearnQuestionProgress.deleteMany({ where: { userId } });
  await prisma.userLearnLessonProgress.deleteMany({ where: { userId } });
  await prisma.userLearnModuleProgress.deleteMany({ where: { userId } });
  await prisma.userLearnPathProgress.deleteMany({ where: { userId } });

  const path = await adminLearn.createPath({
    slug: `${tag}-path`,
    title: "P",
    description: "d",
  });
  const mod = await adminLearn.createModule(path.id, { slug: "m", title: "M" });
  const lesson = await adminLearn.createLesson(mod.id, { slug: "l", title: "L" });
  lessonId = lesson.id;

  const q = await adminLearn.attachQuestion(lesson.id, { kind: "mcq", mcqId });
  questionId = q.id;
  await adminLearn.attachQuestion(lesson.id, { kind: "problem", problemId });
  await adminLearn.updatePath(path.id, { status: "published" });
});

describe("the answer key never ships (§5.7)", () => {
  // Asserted on the serialised body rather than a typed field: a projection that
  // grows an extra key still typechecks, and this is the only thing that fails.
  it("is absent from the path page", async () => {
    const body = JSON.stringify(await learnService.getPath(`${tag}-path`, userId));
    expect(body).not.toContain("correctOptionIndex");
  });

  it("is absent from the lesson page", async () => {
    const body = JSON.stringify(await learnService.getLesson(lessonId, userId));
    expect(body).not.toContain("correctOptionIndex");
  });

  // Options *are* shipped — a learner cannot answer without them, and they are
  // not the answer. The value that must not travel is the index.
  it("ships options so the question is answerable", async () => {
    const lesson = await learnService.getLesson(lessonId, userId);
    const mcq = lesson.questions.find((q) => q.kind === "mcq");

    expect(mcq?.mcq?.options).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
  });

  it("withholds the answer on a wrong attempt", async () => {
    const result = await learnService.gradeMcqAnswer(questionId, userId, 0);

    expect(result.isCorrect).toBe(false);
    // Revealing it here would turn unlimited retries into exactly one retry.
    expect(result.correctOptionIndex).toBeNull();
  });

  it("reveals the answer only once the learner has it right", async () => {
    const result = await learnService.gradeMcqAnswer(questionId, userId, CORRECT);

    expect(result.isCorrect).toBe(true);
    expect(result.correctOptionIndex).toBe(CORRECT);
  });
});

describe("grading", () => {
  it("completes the question on a correct answer", async () => {
    await learnService.gradeMcqAnswer(questionId, userId, CORRECT);

    const row = await prisma.userLearnQuestionProgress.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    expect(row?.source).toBe("verified");
  });

  it("does not complete on a wrong answer", async () => {
    await learnService.gradeMcqAnswer(questionId, userId, 0);

    expect(
      await prisma.userLearnQuestionProgress.count({ where: { userId, questionId } }),
    ).toBe(0);
  });

  // Formative, not assessed: getting it wrong then right must count.
  it("allows unlimited retries and completes on the first correct one", async () => {
    await learnService.gradeMcqAnswer(questionId, userId, 0);
    await learnService.gradeMcqAnswer(questionId, userId, 1);
    await learnService.gradeMcqAnswer(questionId, userId, 3);
    const result = await learnService.gradeMcqAnswer(questionId, userId, CORRECT);

    expect(result.isCorrect).toBe(true);
    expect(result.attempts).toBe(4);

    const row = await prisma.userLearnQuestionProgress.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    expect(row?.source).toBe("verified");
  });

  // Same terminal rule as `solved`: nothing demotes a completion.
  it("never un-completes when a later answer is wrong", async () => {
    await learnService.gradeMcqAnswer(questionId, userId, CORRECT);
    await learnService.gradeMcqAnswer(questionId, userId, 0);

    expect(
      await prisma.userLearnQuestionProgress.count({ where: { userId, questionId } }),
    ).toBe(1);
  });

  it("logs every attempt, right and wrong", async () => {
    await learnService.gradeMcqAnswer(questionId, userId, 0);
    await learnService.gradeMcqAnswer(questionId, userId, CORRECT);

    const attempts = await prisma.learnMcqAttempt.findMany({
      where: { userId, questionId },
      orderBy: { id: "asc" },
    });

    expect(attempts).toHaveLength(2);
    expect(attempts[0].isCorrect).toBe(false);
    expect(attempts[1].isCorrect).toBe(true);
  });

  it("rejects an out-of-range option instead of grading it", async () => {
    await expect(learnService.gradeMcqAnswer(questionId, userId, 99)).rejects.toThrow(
      /does not exist/,
    );
    await expect(learnService.gradeMcqAnswer(questionId, userId, -1)).rejects.toThrow();

    expect(await prisma.learnMcqAttempt.count({ where: { userId, questionId } })).toBe(0);
  });

  it("404s a question that is not an MCQ", async () => {
    const lesson = await learnService.getLesson(lessonId, userId);
    const problemQuestion = lesson.questions.find((q) => q.kind === "problem")!;

    await expect(
      learnService.gradeMcqAnswer(problemQuestion.id, userId, 0),
    ).rejects.toBeInstanceOf(LearnQuestionNotFoundError);
  });

  it("scopes attempts and completion to the answering user", async () => {
    const other = await prisma.user.create({
      data: { name: "O", email: `${tag}-o@e.test`, role: "contestee", isVerified: true },
    });

    await learnService.gradeMcqAnswer(questionId, userId, CORRECT);

    expect(
      await prisma.userLearnQuestionProgress.count({ where: { userId: other.id, questionId } }),
    ).toBe(0);
  });
});

describe("progress integration", () => {
  it("counts a correct MCQ toward the path total", async () => {
    await learnService.gradeMcqAnswer(questionId, userId, CORRECT);
    clearCurriculumCache();

    const path = await learnService.getPath(`${tag}-path`, userId);
    expect(path.totalQuestions).toBe(2);
    expect(path.completedQuestions).toBe(1);
    expect(path.verifiedQuestions).toBe(1);
  });

  // Phase 3 skipped MCQs in the "next up" pointer because they could not be
  // answered. Now they can, so curriculum order is honoured exactly.
  it("points at an MCQ when it is genuinely next", async () => {
    const path = await learnService.getPath(`${tag}-path`, userId);

    expect(path.current).not.toBeNull();
    expect(path.current!.questionId).toBe(questionId);
  });

  it("moves past the MCQ once it is answered", async () => {
    await learnService.gradeMcqAnswer(questionId, userId, CORRECT);
    clearCurriculumCache();

    const path = await learnService.getPath(`${tag}-path`, userId);
    expect(path.current!.problemSlug).toBe(`${tag}-p`);
  });
});
