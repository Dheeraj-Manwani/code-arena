import * as learnRepo from "../repositories/learn.repository";
import {
  nextOrder,
  orderBetween,
  rebalanceOrders,
  neighboursForMove,
} from "../lib/ordering";
import {
  LearnPathNotFoundError,
  LearnModuleNotFoundError,
  LearnLessonNotFoundError,
  LearnQuestionNotFoundError,
  DuplicateLearnQuestionError,
  ProblemInLiveContestError,
  LearnPathNotPublishableError,
} from "../errors/learn.errors";
import type {
  CreateLearnPathInput,
  UpdateLearnPathInput,
  CreateLearnModuleInput,
  UpdateLearnModuleInput,
  CreateLearnLessonInput,
  UpdateLearnLessonInput,
  AttachLearnQuestionInput,
} from "../schema/learn.schema";
import { AppError } from "../errors/app-error";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export const listPaths = () => learnRepo.listPaths();

export const getPathTree = async (pathId: number) => {
  const path = await learnRepo.getPathTree(pathId);
  if (!path) throw new LearnPathNotFoundError();
  return path;
};

export const createPath = async (input: CreateLearnPathInput) => {
  const existing = await learnRepo.findPathBySlug(input.slug);
  if (existing) {
    throw new AppError("A path with that slug already exists", 400, "LEARN_PATH_SLUG_TAKEN");
  }

  const paths = await learnRepo.listPaths();

  return learnRepo.createPath({
    ...input,
    order: nextOrder(paths.at(-1)?.order ?? null),
  });
};

export const updatePath = async (pathId: number, input: UpdateLearnPathInput) => {
  const path = await learnRepo.getPathById(pathId);
  if (!path) throw new LearnPathNotFoundError();

  // Publishing is the one transition with a gate. Everything else — retitling,
  // archiving, un-featuring — is always allowed.
  if (input.status === "published" && path.status !== "published") {
    const problems = await validatePathForPublish(pathId);
    if (problems.length > 0) throw new LearnPathNotPublishableError(problems);
  }

  return learnRepo.updatePath(pathId, input);
};

/**
 * Soft delete. `archived` keeps the row (and every learner's progress) while
 * removing it from the gallery — deleting cascades to progress rows, and
 * destroying someone's completed history to tidy a list is not a trade a
 * curator should be able to make by accident (§5.10).
 */
export const archivePath = async (pathId: number) => {
  const path = await learnRepo.getPathById(pathId);
  if (!path) throw new LearnPathNotFoundError();
  return learnRepo.updatePath(pathId, { status: "archived" });
};

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export const createModule = async (pathId: number, input: CreateLearnModuleInput) => {
  const path = await learnRepo.getPathById(pathId);
  if (!path) throw new LearnPathNotFoundError();

  const siblings = await learnRepo.getModuleSiblings(pathId);

  const created = await learnRepo.createModule({
    pathId,
    ...input,
    order: nextOrder(siblings.at(-1)?.order ?? null),
  });

  await learnRepo.recomputePathTotals(pathId);
  return created;
};

export const updateModule = async (moduleId: number, input: UpdateLearnModuleInput) => {
  const found = await learnRepo.getModule(moduleId);
  if (!found) throw new LearnModuleNotFoundError();
  return learnRepo.updateModule(moduleId, input);
};

export const deleteModule = async (moduleId: number) => {
  const found = await learnRepo.getModule(moduleId);
  if (!found) throw new LearnModuleNotFoundError();

  await learnRepo.deleteModule(moduleId);
  await learnRepo.recomputePathTotals(found.pathId);
};

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export const createLesson = async (moduleId: number, input: CreateLearnLessonInput) => {
  const found = await learnRepo.getModule(moduleId);
  if (!found) throw new LearnModuleNotFoundError();

  const siblings = await learnRepo.getLessonSiblings(moduleId);

  const created = await learnRepo.createLesson({
    moduleId,
    ...input,
    order: nextOrder(siblings.at(-1)?.order ?? null),
  });

  await learnRepo.recomputePathTotals(found.pathId);
  return created;
};

export const updateLesson = async (lessonId: number, input: UpdateLearnLessonInput) => {
  const found = await learnRepo.getLesson(lessonId);
  if (!found) throw new LearnLessonNotFoundError();
  return learnRepo.updateLesson(lessonId, input);
};

export const deleteLesson = async (lessonId: number) => {
  const pathId = await learnRepo.pathIdForLesson(lessonId);
  if (pathId === null) throw new LearnLessonNotFoundError();

  await learnRepo.deleteLesson(lessonId);
  await learnRepo.recomputePathTotals(pathId);
};

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const attachQuestion = async (
  lessonId: number,
  input: AttachLearnQuestionInput,
  now: Date = new Date(),
) => {
  const pathId = await learnRepo.pathIdForLesson(lessonId);
  if (pathId === null) throw new LearnLessonNotFoundError();

  // The contest-integrity guard (§5.6). Runs before anything is written, so a
  // rejected attach leaves no partial state.
  if (input.kind === "problem") {
    const blocking = await learnRepo.blockingContestForProblem(input.problemId, now);
    if (blocking) throw new ProblemInLiveContestError(blocking.title);
  }

  const siblings = await learnRepo.getQuestionSiblings(lessonId);

  try {
    const created = await learnRepo.createQuestion({
      lessonId,
      kind: input.kind,
      problemId: input.kind === "problem" ? input.problemId : null,
      mcqId: input.kind === "mcq" ? input.mcqId : null,
      note: input.note ?? null,
      order: nextOrder(siblings.at(-1)?.order ?? null),
    });

    await learnRepo.recomputePathTotals(pathId);
    return created;
  } catch (error) {
    // The unique index on (lessonId, problemId) / (lessonId, mcqId) is the
    // authority on duplicates — checking first would still race.
    if (isUniqueViolation(error)) throw new DuplicateLearnQuestionError();
    throw error;
  }
};

export const updateQuestion = async (questionId: number, note: string | null) => {
  const found = await learnRepo.getQuestion(questionId);
  if (!found) throw new LearnQuestionNotFoundError();
  return learnRepo.updateQuestion(questionId, { note });
};

export const detachQuestion = async (questionId: number) => {
  const pathId = await learnRepo.pathIdForQuestion(questionId);
  if (pathId === null) throw new LearnQuestionNotFoundError();

  await learnRepo.deleteQuestion(questionId);
  await learnRepo.recomputePathTotals(pathId);
};

// ---------------------------------------------------------------------------
// Reordering (LEARN_PATHS.md §5.9)
// ---------------------------------------------------------------------------

type ReorderTable = "module" | "lesson" | "question";

/**
 * Moves one row to `targetIndex` among its siblings.
 *
 * Normally a single-row update. When the sparse gaps are exhausted the sibling
 * list is rebalanced and the move retried once — the retry cannot fail, because
 * a freshly rebalanced list has full `ORDER_STEP` gaps everywhere.
 */
const reorder = async (
  table: ReorderTable,
  id: number,
  targetIndex: number,
  loadSiblings: () => Promise<Array<{ id: number; order: number }>>,
  applyOrder: (order: number) => Promise<unknown>,
) => {
  let siblings = await loadSiblings();

  let { prev, next } = neighboursForMove(siblings, id, targetIndex);
  let result = orderBetween(prev, next);

  if (!result.ok) {
    await learnRepo.applyOrders(table, rebalanceOrders(siblings));

    siblings = await loadSiblings();
    ({ prev, next } = neighboursForMove(siblings, id, targetIndex));
    result = orderBetween(prev, next);

    if (!result.ok) {
      // Unreachable: a rebalanced list always has room. Fail loudly rather than
      // silently leaving the item where it was.
      throw new AppError(
        "Could not reorder after rebalancing",
        500,
        "LEARN_REORDER_FAILED",
      );
    }
  }

  return applyOrder(result.order);
};

export const reorderModule = async (moduleId: number, targetIndex: number) => {
  const found = await learnRepo.getModule(moduleId);
  if (!found) throw new LearnModuleNotFoundError();

  return reorder(
    "module",
    moduleId,
    targetIndex,
    () => learnRepo.getModuleSiblings(found.pathId),
    (order) => learnRepo.updateModule(moduleId, { order }),
  );
};

export const reorderLesson = async (lessonId: number, targetIndex: number) => {
  const found = await learnRepo.getLesson(lessonId);
  if (!found) throw new LearnLessonNotFoundError();

  return reorder(
    "lesson",
    lessonId,
    targetIndex,
    () => learnRepo.getLessonSiblings(found.moduleId),
    (order) => learnRepo.updateLesson(lessonId, { order }),
  );
};

export const reorderQuestion = async (questionId: number, targetIndex: number) => {
  const found = await learnRepo.getQuestion(questionId);
  if (!found) throw new LearnQuestionNotFoundError();

  return reorder(
    "question",
    questionId,
    targetIndex,
    () => learnRepo.getQuestionSiblings(found.lessonId),
    (order) => learnRepo.updateQuestion(questionId, { order }),
  );
};

// ---------------------------------------------------------------------------
// Publish validation (LEARN_PATHS.md §7)
// ---------------------------------------------------------------------------

/**
 * Reasons this path cannot be published, as human-readable strings.
 *
 * Returns every problem rather than the first, because a curator fixing them
 * one round-trip at a time will give up. Empty array means publishable.
 */
export const validatePathForPublish = async (pathId: number): Promise<string[]> => {
  const path = await learnRepo.getPathForValidation(pathId);
  if (!path) throw new LearnPathNotFoundError();

  const problems: string[] = [];

  if (path.modules.length === 0) {
    problems.push("The path has no modules.");
  }

  for (const learnModule of path.modules) {
    if (learnModule.lessons.length === 0) {
      problems.push(`Module "${learnModule.title}" has no lessons.`);
      continue;
    }

    for (const lesson of learnModule.lessons) {
      if (lesson.questions.length === 0) {
        problems.push(
          `Lesson "${lesson.title}" in "${learnModule.title}" has no questions.`,
        );
        continue;
      }

      for (const question of lesson.questions) {
        // A path pointing at a draft problem renders a dead row for learners:
        // the question counts toward the denominator but cannot be opened.
        if (question.kind === "problem" && question.problem) {
          if (question.problem.visibility !== "public") {
            problems.push(
              `"${question.problem.title}" in "${lesson.title}" is ${question.problem.visibility}, not public.`,
            );
          }
        }

        if (question.kind === "mcq" && question.mcq) {
          if (question.mcq.visibility !== "public") {
            problems.push(
              `An MCQ in "${lesson.title}" is ${question.mcq.visibility}, not public.`,
            );
          }
        }
      }
    }
  }

  // §5.6: a problem may have been pulled into a competitive contest *after* it
  // was added to the path, which the attach-time guard cannot prevent. Publish
  // is the next checkpoint where we can catch it.
  const now = new Date();
  const problemIds = path.modules
    .flatMap((m) => m.lessons)
    .flatMap((l) => l.questions)
    .map((q) => q.problemId)
    .filter((id): id is number => id !== null);

  for (const problemId of [...new Set(problemIds)]) {
    const blocking = await learnRepo.blockingContestForProblem(problemId, now);
    if (blocking) {
      problems.push(
        `A problem in this path is in "${blocking.title}", a competitive contest that has not finished.`,
      );
    }
  }

  return problems;
};

/** Blast radius for the §5.1 warning shown before editing a published path. */
export const getPathImpact = async (pathId: number) => {
  const path = await learnRepo.getPathById(pathId);
  if (!path) throw new LearnPathNotFoundError();

  return {
    learners: await learnRepo.countLearnersOnPath(pathId),
    status: path.status,
  };
};

/** Where a problem is already used — powers the picker's disabled state. */
export const getProblemUsage = async (problemId: number, now: Date = new Date()) => ({
  blockingContest: await learnRepo.blockingContestForProblem(problemId, now),
  paths: await learnRepo.pathsContainingProblem(problemId),
});

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2002";
