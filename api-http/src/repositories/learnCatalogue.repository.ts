import prisma from "../lib/db";

/**
 * Learner-facing reads for `/learn` (LEARN_PATHS.md Phase 3).
 *
 * Separate from `learn.repository.ts` deliberately. That one serves the creator
 * builder and returns authoring metadata; this one serves learners and must
 * never grow a field that leaks an answer. Sharing a projection between the two
 * is exactly how the creator query ends up serving learners, which is the trap
 * PRACTICE_MODE §4.4 documents and §5.7 restates.
 *
 * Query shape follows §5.3: the curriculum is identical for every user (and
 * cached), per-user completion is two flat lookups, and the join happens in
 * memory. No query is per-module.
 */

// ---------------------------------------------------------------------------
// Curriculum (user-independent, cacheable)
// ---------------------------------------------------------------------------

export const listPublishedPaths = () =>
  prisma.learnPath.findMany({
    where: { status: "published" },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      isFeatured: true,
      totalQuestions: true,
      totalModules: true,
      updatedAt: true,
    },
  });

/**
 * The full curriculum tree for one path, minus anything user-specific.
 *
 * `body` is omitted — a path page renders titles and counts, and lesson prose
 * is fat markdown that only the lesson page needs. Fetching it here would put
 * every lesson's full text into every path-page response.
 */
export const getPublishedPathBySlug = (slug: string) =>
  prisma.learnPath.findFirst({
    where: { slug, status: "published" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      unlockThreshold: true,
      totalQuestions: true,
      totalModules: true,
      updatedAt: true,
      modules: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          totalQuestions: true,
          lessons: {
            orderBy: [{ order: "asc" }, { id: "asc" }],
            select: {
              id: true,
              slug: true,
              title: true,
              totalQuestions: true,
              // Whether prose exists, without shipping it. Drives the "read"
              // affordance on the path page.
              body: true,
              questions: {
                orderBy: [{ order: "asc" }, { id: "asc" }],
                select: {
                  id: true,
                  kind: true,
                  note: true,
                  problemId: true,
                  mcqId: true,
                  problem: {
                    select: { id: true, slug: true, title: true, difficulty: true },
                  },
                  // Question text and options — the learner needs both to
                  // answer. **Never `correctOptionIndex`**: grading happens
                  // server-side in `gradeMcqAnswer` (§5.7), so the answer key
                  // has no reason to leave the process and every reason not to.
                  mcq: { select: { id: true, questionText: true, options: true } },
                },
              },
            },
          },
        },
      },
    },
  });

/** One lesson, with prose. The only place `body` is served. */
export const getPublishedLesson = (lessonId: number) =>
  prisma.learnLesson.findFirst({
    where: { id: lessonId, module: { path: { status: "published" } } },
    select: {
      id: true,
      slug: true,
      title: true,
      body: true,
      totalQuestions: true,
      module: {
        select: {
          id: true,
          slug: true,
          title: true,
          path: { select: { id: true, slug: true, title: true } },
        },
      },
      questions: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          kind: true,
          note: true,
          problemId: true,
          mcqId: true,
          problem: { select: { id: true, slug: true, title: true, difficulty: true } },
          mcq: { select: { id: true, questionText: true, options: true } },
        },
      },
    },
  });

// ---------------------------------------------------------------------------
// Per-user completion (§5.2)
// ---------------------------------------------------------------------------

/**
 * Which of these problems the user has solved — anywhere.
 *
 * This is the endowed-progress mechanism from §1: `UserProblemStatus` is written
 * by every verdict, contest and practice alike, so a user who solved Two Sum in
 * a contest last month opens the path already credited for it. Phase 3 derives
 * completion entirely from here and writes nothing.
 */
export const solvedProblemIds = async (
  userId: number,
  problemIds: readonly number[],
): Promise<Set<number>> => {
  if (problemIds.length === 0) return new Set();

  const rows = await prisma.userProblemStatus.findMany({
    where: { userId, problemId: { in: [...problemIds] }, status: "solved" },
    select: { problemId: true },
  });

  return new Set(rows.map((row) => row.problemId));
};

/**
 * Solved problem ids across every published path, for the gallery.
 *
 * One query for all paths rather than one per path — the gallery renders a ring
 * per card and would otherwise be N+1 in the number of paths.
 */
export const solvedProblemIdsForAllPaths = async (
  userId: number,
): Promise<Set<number>> => {
  const rows = await prisma.userProblemStatus.findMany({
    where: {
      userId,
      status: "solved",
      problem: {
        learnQuestions: { some: { lesson: { module: { path: { status: "published" } } } } },
      },
    },
    select: { problemId: true },
  });

  return new Set(rows.map((row) => row.problemId));
};

/** Problem ids per published path, so the gallery can count without the tree. */
export const problemIdsByPath = async (): Promise<Map<number, number[]>> => {
  const rows = await prisma.learnQuestion.findMany({
    where: {
      problemId: { not: null },
      lesson: { module: { path: { status: "published" } } },
    },
    select: {
      problemId: true,
      lesson: { select: { module: { select: { pathId: true } } } },
    },
  });

  const byPath = new Map<number, number[]>();
  for (const row of rows) {
    const pathId = row.lesson.module.pathId;
    const list = byPath.get(pathId) ?? [];
    list.push(row.problemId!);
    byPath.set(pathId, list);
  }
  return byPath;
};
