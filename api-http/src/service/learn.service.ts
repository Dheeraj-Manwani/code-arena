import * as catalogue from "../repositories/learnCatalogue.repository";
import * as progressRepo from "../repositories/learnProgress.repository";
import { gateModules } from "./learnUnlock";
import { cached } from "../lib/curriculumCache";
import {
  LearnPathNotFoundError,
  LearnLessonNotFoundError,
  LearnQuestionNotFoundError,
} from "../errors/learn.errors";
import { AppError } from "../errors/app-error";

/**
 * The learner view of `/learn` (LEARN_PATHS.md Phase 3).
 *
 * **Phase 4 reads stored progress.** `UserLearnQuestionProgress` is now the
 * source of truth, backfilled from `UserProblemStatus` on a user's first view of
 * each path (§5.2 hazard 1) and maintained by the verdict fan-out thereafter.
 * The endowed-progress moment from §1 survives that change — it moved from a
 * live join into a one-shot backfill, so a user who solved problems in contests
 * still opens a path already credited.
 *
 * Completion here means *either* source (§3 D3): a verified solve or the user's
 * own tick. `verifiedQuestions` reports the honest subset.
 *
 * Still true in this phase: **MCQ questions can never be complete.** There is
 * nowhere to record an answer until Phase 5, so they render as not-started and
 * count toward the denominator. Better an honestly incomplete number than one
 * that quietly excludes what it can't measure.
 */

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export const getGallery = async (userId: number) => {
  const paths = await cached("learn:paths", catalogue.listPublishedPaths);

  // Stored counters where they exist, live derivation where they don't.
  //
  // A path the user has never opened has no `UserLearnPathProgress` row, and
  // the gallery must not create one — backfill is the *path page's* job, gated
  // on that row's absence (§5.2). Deriving here keeps the card honest for a
  // path with prior solves that has never been visited, without stealing the
  // latch that makes the backfill run exactly once.
  const stored = await progressRepo.getAllPathProgress(userId);
  const needsDerivation = paths.filter((p) => !stored.has(p.id));

  let derivedByPath = new Map<number, number>();
  if (needsDerivation.length > 0) {
    const problemsByPath = await cached("learn:problemsByPath", catalogue.problemIdsByPath);
    const solved = await catalogue.solvedProblemIdsForAllPaths(userId);

    derivedByPath = new Map(
      needsDerivation.map((path) => [
        path.id,
        (problemsByPath.get(path.id) ?? []).filter((id) => solved.has(id)).length,
      ]),
    );
  }

  return paths.map((path) => {
    const completed =
      stored.get(path.id)?.completedQuestions ?? derivedByPath.get(path.id) ?? 0;

    return {
      slug: path.slug,
      title: path.title,
      description: path.description,
      isFeatured: path.isFeatured,
      totalQuestions: path.totalQuestions,
      totalModules: path.totalModules,
      completedQuestions: completed,
      started: completed > 0,
    };
  });
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Self-mark a question (D3).
 *
 * Problems only. An MCQ takes seconds to answer, so an override there would
 * exist purely to inflate the number — and inflating the number is the one
 * thing §1 says this feature must never do.
 */
export const selfMarkQuestion = async (questionId: number, userId: number) => {
  const question = await progressRepo.getQuestionKind(questionId);
  if (!question) throw new LearnQuestionNotFoundError();

  if (question.kind !== "problem") {
    throw new AppError(
      "Only coding questions can be marked complete by hand",
      400,
      "LEARN_SELF_MARK_UNSUPPORTED",
    );
  }

  await progressRepo.recordQuestionCompletion({
    userId,
    questionId,
    source: "self_marked",
  });

  return { completed: true };
};

/** Un-tick. Verified completions are backed by a real submission and stay. */
export const unmarkQuestion = async (questionId: number, userId: number) => {
  const question = await progressRepo.getQuestionKind(questionId);
  if (!question) throw new LearnQuestionNotFoundError();

  const { removed } = await progressRepo.removeSelfMarkedCompletion(userId, questionId);
  if (!removed) {
    throw new AppError(
      "That question was completed by solving it, so it can't be un-marked",
      400,
      "LEARN_CANNOT_UNMARK_VERIFIED",
    );
  }

  return { completed: false };
};

/**
 * Grade an MCQ answer (§5.7).
 *
 * Server-side by construction: the answer key is fetched here, compared here,
 * and never returned. The client learns exactly two things — whether it was
 * right, and (once answered) what the right answer was.
 *
 * Retries are unlimited and every attempt is logged. Learn quizzes are
 * formative: there is no score to protect, so the posture is "never leak the
 * key", not "one shot". Completion is the *first* correct answer, and a later
 * wrong one never un-completes it — the same terminal rule `solved` follows.
 */
export const gradeMcqAnswer = async (
  questionId: number,
  userId: number,
  selectedOptionIndex: number,
) => {
  const question = await progressRepo.getMcqForGrading(questionId);
  if (!question || question.kind !== "mcq" || !question.mcq) {
    throw new LearnQuestionNotFoundError();
  }

  const options = Array.isArray(question.mcq.options) ? question.mcq.options : [];
  if (selectedOptionIndex < 0 || selectedOptionIndex >= options.length) {
    throw new AppError("That option does not exist", 400, "INVALID_REQUEST");
  }

  const isCorrect = selectedOptionIndex === question.mcq.correctOptionIndex;

  await progressRepo.recordMcqAttempt(userId, questionId, selectedOptionIndex, isCorrect);

  if (isCorrect) {
    await progressRepo.recordQuestionCompletion({
      userId,
      questionId,
      source: "verified",
    });
  }

  return {
    isCorrect,
    // Revealed only *after* an answer, and only once it is right. Sending it on
    // a wrong attempt would turn "unlimited retries" into "one retry", which is
    // the same leak by a slower route.
    correctOptionIndex: isCorrect ? question.mcq.correctOptionIndex : null,
    attempts: await progressRepo.countMcqAttempts(userId, questionId),
  };
};

/**
 * What the client should celebrate, if anything (§3.6, §5.5).
 *
 * Applies the suppression rule here rather than in the browser: when finishing a
 * lesson also finishes its module, only the module moment is shown — two
 * celebrations back to back is comic. The suppressed lessons are still returned
 * in `alsoAcknowledge` so the client marks them seen in the same breath;
 * otherwise they queue up and fire on the next page load, which is the bug the
 * suppression was meant to prevent.
 */
/** Resolves a published path slug to its id, 404ing if it isn't published. */
export const getPathIdBySlug = async (slug: string): Promise<number> => {
  const path = await catalogue.getPublishedPathBySlug(slug);
  if (!path) throw new LearnPathNotFoundError();
  return path.id;
};

export const getCelebrations = async (userId: number, pathId: number) => {
  const { lessons, modules } = await progressRepo.getPendingCelebrations(userId, pathId);

  const completedModuleIds = new Set(modules.map((m) => m.moduleId));

  const visibleLessons = lessons.filter(
    (lesson) => !completedModuleIds.has(lesson.lesson.module.id),
  );
  const suppressedLessonIds = lessons
    .filter((lesson) => completedModuleIds.has(lesson.lesson.module.id))
    .map((lesson) => lesson.lessonId);

  return {
    modules: modules.map((m) => ({
      moduleId: m.moduleId,
      title: m.module.title,
      completedQuestions: m.completedQuestions,
      completedLessons: m.completedLessons,
    })),
    lessons: visibleLessons.map((l) => ({
      lessonId: l.lessonId,
      title: l.lesson.title,
      totalQuestions: l.lesson.totalQuestions,
    })),
    /** Milestones to mark seen without showing — see above. */
    alsoAcknowledge: { lessonIds: suppressedLessonIds },
  };
};

export const acknowledgeLessonCelebration = async (lessonId: number, userId: number) => {
  await progressRepo.markLessonCelebrated(userId, lessonId);
  return { acknowledged: true };
};

/**
 * Acknowledging a module also acknowledges its lessons.
 *
 * Finishing a module necessarily finished every lesson in it, and those lesson
 * milestones were suppressed in favour of the module one. Without this they sit
 * pending and fire individually the next time the path loads.
 */
export const acknowledgeModuleCelebration = async (moduleId: number, userId: number) => {
  await progressRepo.markModuleCelebrated(userId, moduleId);

  for (const lessonId of await progressRepo.lessonIdsForModule(moduleId)) {
    await progressRepo.markLessonCelebrated(userId, lessonId);
  }

  return { acknowledged: true };
};

/**
 * The next question after this one, in curriculum order (§3.4).
 *
 * Server-side because it needs the whole path's ordering, and because "what's
 * next" is a curriculum fact rather than something the solve page should have to
 * reconstruct from a payload it never fetched.
 */
export const getNextQuestion = async (
  pathSlug: string,
  questionId: number,
  userId: number,
) => {
  const path = await getPath(pathSlug, userId);

  const flat = path.modules.flatMap((m) =>
    m.lessons.flatMap((lesson) =>
      lesson.questions.map((question) => ({
        question,
        moduleTitle: m.title,
        lessonTitle: lesson.title,
        lessonId: lesson.id,
      })),
    ),
  );

  const index = flat.findIndex((entry) => entry.question.id === questionId);
  if (index === -1) return { next: null, pathTitle: path.title, progress: null };

  // The next *incomplete* one, not merely the next one — offering a question
  // they have already solved is a dead end dressed up as momentum.
  const next = flat.slice(index + 1).find((entry) => !entry.question.isComplete) ?? null;

  return {
    pathTitle: path.title,
    pathSlug: path.slug,
    progress: {
      completedQuestions: path.completedQuestions,
      totalQuestions: path.totalQuestions,
    },
    next: next
      ? {
          questionId: next.question.id,
          title: next.question.problem?.title ?? next.question.mcq?.questionText ?? "",
          problemSlug: next.question.problem?.slug ?? null,
          lessonId: next.lessonId,
          lessonTitle: next.lessonTitle,
          moduleTitle: next.moduleTitle,
        }
      : null,
  };
};

/** "Open anyway" — sticky and one-way by design (§5.4). */
export const unlockModule = async (moduleId: number, userId: number) => {
  const exists = await progressRepo.moduleExists(moduleId);
  if (!exists) throw new LearnPathNotFoundError();

  await progressRepo.unlockModule(userId, moduleId);
  return { unlocked: true };
};

export const resetPath = async (slug: string, userId: number) => {
  const path = await catalogue.getPublishedPathBySlug(slug);
  if (!path) throw new LearnPathNotFoundError();

  await progressRepo.resetPathProgress(userId, path.id);
  return { reset: true };
};

// ---------------------------------------------------------------------------
// Path page
// ---------------------------------------------------------------------------

export const getPath = async (slug: string, userId: number) => {
  // Keyed on slug only; the TTL bounds staleness after a curator edit. A
  // version-stamped key would need the path's `updatedAt`, which costs the
  // query this cache exists to avoid.
  const path = await cached(`learn:path:${slug}`, () =>
    catalogue.getPublishedPathBySlug(slug),
  );
  if (!path) throw new LearnPathNotFoundError();

  // One-shot fold of pre-existing solves into this path (§5.2 hazard 1). Gated
  // on the absence of `UserLearnPathProgress`, so it runs once per (user, path)
  // and never on subsequent loads. Safe-wrapped: a failed backfill must not stop
  // the page rendering — it just renders with less credit until it succeeds.
  await progressRepo.backfillPathProgressSafe(userId, path.id);

  const questionIds = path.modules
    .flatMap((m) => m.lessons)
    .flatMap((l) => l.questions)
    .map((q) => q.id);

  const completions = await progressRepo.getQuestionProgress(userId, questionIds);
  const moduleProgress = await progressRepo.getModuleProgress(userId, path.id);

  const isComplete = (question: { id: number }) => completions.has(question.id);

  const modules = path.modules.map((learnModule) => {
    const lessons = learnModule.lessons.map((lesson) => {
      const completed = lesson.questions.filter(isComplete).length;

      return {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        // Presence, not content — the path page shows a "read" affordance and
        // the lesson page fetches the prose.
        hasBody: lesson.body !== null && lesson.body.trim() !== "",
        totalQuestions: lesson.questions.length,
        completedQuestions: completed,
        isComplete: lesson.questions.length > 0 && completed === lesson.questions.length,
        questions: lesson.questions.map(toQuestionView(completions)),
      };
    });

    const completed = lessons.reduce((sum, l) => sum + l.completedQuestions, 0);
    const total = lessons.reduce((sum, l) => sum + l.totalQuestions, 0);

    return {
      id: learnModule.id,
      slug: learnModule.slug,
      title: learnModule.title,
      summary: learnModule.summary,
      totalQuestions: total,
      completedQuestions: completed,
      isComplete: total > 0 && completed === total,
      lessons,
    };
  });

  // The stored `unlockedAt` makes the gate monotonic (§5.4): once a user has
  // unlocked a module — by meeting the threshold or by clicking "Open anyway" —
  // it never dims again, even if a curator grows the previous module underneath
  // them.
  const gates = gateModules(
    modules.map((m) => ({
      completed: m.completedQuestions,
      total: m.totalQuestions,
      unlockedAt: moduleProgress.get(m.id)?.unlockedAt ?? null,
    })),
    path.unlockThreshold,
  );

  const withGates = modules.map((learnModule, index) => ({
    ...learnModule,
    gate: gates[index],
  }));

  const completedQuestions = withGates.reduce((sum, m) => sum + m.completedQuestions, 0);
  const totalQuestions = withGates.reduce((sum, m) => sum + m.totalQuestions, 0);

  return {
    slug: path.slug,
    title: path.title,
    description: path.description,
    totalQuestions,
    completedQuestions,
    totalModules: withGates.length,
    completedModules: withGates.filter((m) => m.isComplete).length,
    // The honest subset: how much of the progress the platform actually saw
    // happen, as opposed to the user ticking a box (§3.2, D3).
    verifiedQuestions: [...completions.values()].filter((s) => s === "verified").length,
    current: findCurrent(withGates),
    modules: withGates,
  };
};

// ---------------------------------------------------------------------------
// Lesson page
// ---------------------------------------------------------------------------

export const getLesson = async (lessonId: number, userId: number) => {
  const lesson = await cached(`learn:lesson:${lessonId}`, () =>
    catalogue.getPublishedLesson(lessonId),
  );
  if (!lesson) throw new LearnLessonNotFoundError();

  // The lesson page is a deep-linkable URL — a bookmark or a shared link can
  // land here without the path page ever being opened. Backfilling only there
  // would show such a user 0/N despite a history of solves. Gated on the same
  // latch, so whichever page they reach first does the work exactly once.
  await progressRepo.backfillPathProgressSafe(userId, lesson.module.path.id);

  const completions = await progressRepo.getQuestionProgress(
    userId,
    lesson.questions.map((q) => q.id),
  );
  const questions = lesson.questions.map(toQuestionView(completions));
  const completed = questions.filter((q) => q.isComplete).length;

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    body: lesson.body,
    module: {
      slug: lesson.module.slug,
      title: lesson.module.title,
      pathSlug: lesson.module.path.slug,
      pathTitle: lesson.module.path.title,
    },
    totalQuestions: questions.length,
    completedQuestions: completed,
    questions,
  };
};

// ---------------------------------------------------------------------------

type RawQuestion = {
  id: number;
  kind: string;
  note: string | null;
  problemId: number | null;
  mcqId: number | null;
  problem: { id: number; slug: string; title: string; difficulty: string } | null;
  mcq: { id: number; questionText: string; options: unknown } | null;
};

const toQuestionView =
  (completions: Map<number, "verified" | "self_marked">) => (question: RawQuestion) => ({
    id: question.id,
    kind: question.kind,
    note: question.note,
    isComplete: completions.has(question.id),
    /**
     * How it was completed, or null. The UI draws a solid check for `verified`
     * and a hollow one for `self_marked`, and only offers to un-tick the latter
     * — a verified completion is backed by a real submission, so there is
     * nothing to retract (§5.2 hazard 3).
     */
    completionSource: completions.get(question.id) ?? null,
    problem: question.problem
    ? {
        slug: question.problem.slug,
        title: question.problem.title,
        difficulty: question.problem.difficulty,
      }
    : null,
  mcq: question.mcq
    ? {
        questionText: question.mcq.questionText,
        // Options are a Json column, so they arrive untyped. Coerced rather
        // than trusted: a malformed row should render an unanswerable question,
        // not throw and take the whole lesson page down.
        //
        // Note what is *not* here: `correctOptionIndex`. This mapper is the
        // last gate before serialisation, so it is the natural place for
        // someone to "helpfully" add it. Don't.
        options: Array.isArray(question.mcq.options)
          ? (question.mcq.options as string[])
          : [],
      }
    : null,
});

/**
 * Declared rather than derived from `getPath`'s return type.
 *
 * `getPath` calls `findCurrent`, so inferring this from `getPath` makes the type
 * reference itself and TypeScript gives up (TS2456). Writing the shape out also
 * makes it the contract the frontend codes against instead of an inference
 * accident.
 */
interface CurrentPointerModule {
  slug: string;
  title: string;
  lessons: Array<{
    id: number;
    slug: string;
    title: string;
    questions: Array<{
      id: number;
      isComplete: boolean;
      problem: { slug: string; title: string } | null;
      mcq: { questionText: string } | null;
    }>;
  }>;
}

/**
 * The "you are here / next up" pointer (§3.2).
 *
 * First incomplete question in curriculum order, ignoring gates — the suggestion
 * should be the next thing to *do*, and a gate is advisory anyway. Null when the
 * path is finished, which the UI renders as the terminal celebration state
 * rather than a Continue button pointing nowhere.
 *
 * Phase 3 skipped MCQs here because nothing could answer one, which made the
 * page's primary call-to-action a dead end. Phase 5 makes them answerable inline,
 * so the filter is gone and curriculum order is honoured exactly — an MCQ can now
 * be the next thing to do, because now it *can* be done.
 */
const findCurrent = (modules: CurrentPointerModule[]) => {
  for (const learnModule of modules) {
    for (const lesson of learnModule.lessons) {
      for (const question of lesson.questions) {
        if (!question.isComplete) {
          return {
            moduleSlug: learnModule.slug,
            moduleTitle: learnModule.title,
            lessonId: lesson.id,
            lessonSlug: lesson.slug,
            lessonTitle: lesson.title,
            questionId: question.id,
            questionTitle: question.problem?.title ?? question.mcq?.questionText ?? "",
            problemSlug: question.problem?.slug ?? null,
          };
        }
      }
    }
  }
  return null;
};
