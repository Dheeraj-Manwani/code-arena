import { Prisma } from "@prisma/client";
import prisma from "../lib/db";
import {
  AddTestCaseType,
  type GetProblemsQuery,
  type ProblemStatusFilter,
} from "../schema/problem.schema";
import { slugify } from "../util/slug";

/**
 * A slug for `title` that no problem currently holds, suffixing `-2`, `-3`, …
 * on collision.
 *
 * Not race-proof on its own — two concurrent creates of the same title can both
 * read the same free slug. The unique index is the real guard; callers retry on
 * P2002 (see `createWithUniqueSlug`).
 */
const nextFreeSlug = async (title: string): Promise<string> => {
  const base = slugify(title);

  const rows = await prisma.dsaProblem.findMany({
    where: { OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }] },
    select: { slug: true },
  });

  const taken = new Set(rows.map((row) => row.slug));
  if (!taken.has(base)) {
    return base;
  }

  for (let suffix = 2; ; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
};

/** Run `create` with a freshly-derived slug, retrying if the index rejects it. */
const createWithUniqueSlug = async <T>(
  title: string,
  create: (slug: string) => Promise<T>,
): Promise<T> => {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; ; attempt++) {
    try {
      return await create(await nextFreeSlug(title));
    } catch (error) {
      const isSlugCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.target as string[] | undefined)?.includes("slug");

      if (!isSlugCollision || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      // Someone took the slug between our read and write — recompute and retry.
    }
  }
};

/**
 * The practiceable rule (PRACTICE_MODE_AND_NAVIGATION.md §4.4).
 *
 * `visibility = 'public'` is necessary but not sufficient. A public problem is
 * withheld from the catalogue while it is linked to a published competitive
 * contest that has not finished yet — otherwise a participant could look up a
 * live contest's problem here and practise it with the same test cases, which
 * breaks contest integrity.
 *
 * Practice-type contests don't withhold: they're self-paced and unranked, so
 * there is no integrity to protect.
 */
export const practiceableWhere = (now: Date): Prisma.DsaProblemWhereInput => ({
  visibility: "public",
  NOT: {
    contestLinks: {
      some: {
        contest: {
          status: "published",
          type: "competitive",
          // Not yet finished: still running, or scheduled for the future. A
          // null endTime is treated as never-finished, so it withholds.
          OR: [{ endTime: { gt: now } }, { endTime: null }],
        },
      },
    },
  },
});

/**
 * Public catalogue projection. Deliberately omits `description` (fat markdown
 * the list never renders) and every authoring field. This is a separate
 * projection rather than a re-authorised creator query on purpose — the creator
 * listing returns answer keys and hidden test data.
 */
const catalogueSelect = (userId: number) =>
  ({
    id: true,
    slug: true,
    title: true,
    tags: true,
    difficulty: true,
    points: true,
    createdAt: true,
    stat: {
      select: { acceptanceRate: true, solvedBy: true, totalSubmissions: true },
    },
    // Scoped to the caller — this is the current user's own standing, never
    // anyone else's.
    userStatuses: {
      where: { userId },
      select: { status: true },
    },
  }) satisfies Prisma.DsaProblemSelect;

const catalogueOrderBy = (
  sortBy: GetProblemsQuery["sortBy"],
): Prisma.DsaProblemOrderByWithRelationInput[] => {
  // Every sort ends with `id` so the ordering is total. Without it, a non-unique
  // sort key (difficulty, title, acceptance) leaves row order undefined between
  // queries, and offset paging then drops or repeats rows across pages.
  switch (sortBy) {
    case "oldest":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "difficulty-asc":
      // Enum order is easy < medium < hard, so Postgres sorts these correctly.
      return [{ difficulty: "asc" }, { id: "asc" }];
    case "difficulty-desc":
      return [{ difficulty: "desc" }, { id: "asc" }];
    case "title":
      return [{ title: "asc" }, { id: "asc" }];
    // Ordering by the stat relation is safe because every problem is guaranteed
    // a stat row (created with the problem, backfilled for pre-existing ones).
    case "acceptance-asc":
      return [{ stat: { acceptanceRate: "asc" } }, { id: "asc" }];
    case "acceptance-desc":
      return [{ stat: { acceptanceRate: "desc" } }, { id: "asc" }];
    case "most-solved":
      return [{ stat: { solvedBy: "desc" } }, { id: "asc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
};

/** The caller's standing on a problem, as one where-clause (§4.5). */
const oneStatusWhere = (
  status: ProblemStatusFilter,
  userId: number,
): Prisma.DsaProblemWhereInput => {
  switch (status) {
    case "solved":
      return { userStatuses: { some: { userId, status: "solved" } } };
    case "attempted":
      // Tried but not yet solved — `solved` is terminal, so matching the row's
      // status directly is enough.
      return { userStatuses: { some: { userId, status: "attempted" } } };
    case "todo":
      // Never submitted against at all.
      return { userStatuses: { none: { userId } } };
  }
};

/**
 * Several statuses OR together, because they partition the catalogue: a problem
 * is solved, attempted, or untouched — never two at once. ANDing them (the
 * default if each clause were merged onto `where`) would always match nothing,
 * which is why this returns an OR array rather than a merged object.
 */
const statusWhere = (
  statuses: GetProblemsQuery["status"],
  userId: number,
): Prisma.DsaProblemWhereInput | undefined => {
  if (!statuses || statuses.length === 0) return undefined;

  const clauses = statuses.map((status) => oneStatusWhere(status, userId));
  return clauses.length === 1 ? clauses[0] : { OR: clauses };
};

export const getPracticeProblems = async (
  query: GetProblemsQuery,
  userId: number,
  now: Date,
) => {
  const { page, limit, search, difficulty, tags, sortBy, status } = query;

  const where: Prisma.DsaProblemWhereInput = { ...practiceableWhere(now) };

  if (difficulty && difficulty.length > 0) {
    where.difficulty = { in: difficulty };
  }

  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  if (search) {
    // Title-only: the catalogue doesn't show descriptions, so matching on them
    // surfaces rows with no visible reason for matching. Backed by the pg_trgm
    // GIN index on `title` (§4.5).
    where.title = { contains: search, mode: "insensitive" };
  }

  const statusFilter = statusWhere(status, userId);
  if (statusFilter) {
    Object.assign(where, statusFilter);
  }

  const [problems, totalItems] = await Promise.all([
    prisma.dsaProblem.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: catalogueOrderBy(sortBy),
      select: catalogueSelect(userId),
    }),
    prisma.dsaProblem.count({ where }),
  ]);

  return { problems, totalItems };
};

/** A single practiceable problem by slug, with its non-hidden test cases. */
export const getPracticeProblemBySlug = async (slug: string, userId: number, now: Date) => {
  return await prisma.dsaProblem.findFirst({
    where: { slug, ...practiceableWhere(now) },
    select: {
      ...catalogueSelect(userId),
      description: true,
      timeLimit: true,
      memoryLimit: true,
      inputFormat: true,
      outputFormat: true,
      constraints: true,
      signature: true,
      testCases: {
        where: { isHidden: false },
        select: { input: true, expectedOutput: true },
      },
    },
  });
};

/**
 * A practiceable problem with everything the judge needs: signature, points, and
 * ALL test cases (hidden included).
 *
 * Never serve this to a client — `testCases` here is unfiltered, unlike
 * `getPracticeProblemBySlug`. It is still gated by `practiceableWhere`, so a
 * problem pulled into a live contest stops accepting practice submissions.
 */
export const getPracticeProblemForJudge = async (slug: string, now: Date) => {
  return await prisma.dsaProblem.findFirst({
    where: { slug, ...practiceableWhere(now) },
    select: {
      id: true,
      points: true,
      signature: true,
      testCases: {
        select: { input: true, expectedOutput: true },
      },
    },
  });
};

export interface PracticeTagCount {
  tag: string;
  count: number;
}

/**
 * Distinct tags across the practiceable catalogue, with how many problems carry
 * each, for the filter sidebar.
 *
 * Counted in memory from one projection rather than with a `groupBy`: `tags` is
 * a scalar array column, so grouping on it would group on the whole array
 * ("arrays+hashing" as one key) instead of on each member. Unnesting would need
 * raw SQL that then has to duplicate `practiceableWhere` — a second copy of the
 * contest-integrity rule is exactly the kind of drift §4.4 warns about.
 *
 * Sorted by count first so the sidebar leads with the tags worth filtering on,
 * then alphabetically to keep the order stable between equal counts.
 */
export const getPracticeTags = async (now: Date): Promise<PracticeTagCount[]> => {
  const rows = await prisma.dsaProblem.findMany({
    where: practiceableWhere(now),
    select: { tags: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    // A problem tagged the same thing twice must still only count once.
    for (const tag of new Set(row.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
};

/**
 * The caller's standing across the whole practiceable catalogue.
 *
 * Deliberately NOT derived from the filtered list's `meta`: the progress bar
 * answers "how far through the catalogue am I", which must not move when
 * someone ticks a difficulty filter. Filtering to `status=solved` would
 * otherwise render a permanent 100%.
 */
export const getPracticeProgress = async (
  userId: number,
  now: Date,
): Promise<{ solved: number; total: number }> => {
  const where = practiceableWhere(now);

  const [total, solved] = await Promise.all([
    prisma.dsaProblem.count({ where }),
    prisma.dsaProblem.count({
      where: { ...where, userStatuses: { some: { userId, status: "solved" } } },
    }),
  ]);

  return { solved, total };
};

export const getMcqQuestion = async (questionId: number, contestId: number) => {
  return await prisma.mcqQuestion.findFirst({
    where: {
      id: questionId,
      contestLinks: {
        some: {
          contestId,
        },
      },
    },
    include: {
      contestLinks: {
        where: {
          contestId: contestId,
        },
        include: {
          contest: true,
        },
      },
    },
  });
};

export const getDsaProblem = async (problemId: number) => {
  return await prisma.dsaProblem.findUnique({
    where: { id: problemId },
    include: {
      testCases: {
        where: {
          isHidden: false,
        },
        select: {
          input: true,
          expectedOutput: true,
        },
      },
      contestLinks: {
        include: {
          contest: true,
        },
      },
    },
  });
};

export const getDsaProblemWithAllTestCases = async (problemId: number) => {
  return await prisma.dsaProblem.findUnique({
    where: { id: problemId },
    include: {
      contestLinks: {
        include: {
          contest: true,
        },
      },
      testCases: true,
    },
  });
};

export const getMaxQuestionOrder = async (contestId: number) => {
  return await prisma.contestQuestion.findFirst({
    where: { contestId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
};

export const createMcqQuestion = async (data: Prisma.McqQuestionUncheckedCreateInput & { contestId: number, creatorId: number, order: number }) => {

  const mcq = await prisma.mcqQuestion.create({
    data: {
      questionText: data.questionText,
      options: data.options,
      correctOptionIndex: data.correctOptionIndex,
      points: data.points,
      contestLinks: {
        create: {
          contestId: data.contestId,
          order: data.order,
        },
      },
      creatorId: data.creatorId,
    },

  });

  return {
    id: mcq.id,
    contestId: data.contestId,
  };
};

// `slug` is derived from the title inside this module, never supplied by callers.
export const createDsaProblem = async (data: Omit<Prisma.DsaProblemUncheckedCreateInput, "slug"> & { contestId: number, creatorId: number }, testCases: AddTestCaseType) => {
  const { contestId, ...createData } = data;

  const maxOrder = await prisma.contestQuestion.findFirst({
    where: { contestId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const nextOrder = (maxOrder?.order ?? -1) + 1;

  const dsaProblem = await createWithUniqueSlug(createData.title, (slug) =>
    prisma.dsaProblem.create({
      data: {
        ...createData,
        slug,
        // Every problem needs a stat row from birth — the catalogue orders by
        // this relation, and a missing row would sort as NULL.
        stat: { create: {} },
        testCases: {
          create: testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
          })),
        },
        contestLinks: {
          create: {
            contestId,
            order: nextOrder,
          },
        },
      },
    }),
  );

  return {
    id: dsaProblem.id,
    contestId: data.contestId,
  };
};

export const createStandaloneMcqQuestion = async (data: Prisma.McqQuestionUncheckedCreateInput & { creatorId: number }) => {
  const mcq = await prisma.mcqQuestion.create({
    data: {
      questionText: data.questionText,
      options: data.options,
      correctOptionIndex: data.correctOptionIndex,
      points: data.points,
      maxDurationMs: data.maxDurationMs,
      // Explicitly listed rather than spread, so a new column is a deliberate
      // decision here rather than something that silently starts flowing
      // through from request bodies. Undefined falls back to the schema default.
      visibility: data.visibility,
      creatorId: data.creatorId,
    },
  });

  return mcq;
};

export const createStandaloneDsaProblem = async (data: Omit<Prisma.DsaProblemUncheckedCreateInput, "slug"> & { creatorId: number }, testCases: AddTestCaseType) => {
  return await createWithUniqueSlug(data.title, (slug) =>
    prisma.dsaProblem.create({
      data: {
        ...data,
        slug,
        // See createDsaProblem — the catalogue's orderBy needs this row present.
        stat: { create: {} },
        testCases: {
          create: testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
          })),
        },
      },
    }),
  );
};

export const updateMcqQuestion = async (questionId: number, data: Prisma.McqQuestionUncheckedUpdateInput) => {
  const mcq = await prisma.mcqQuestion.update({
    where: { id: questionId },
    data,
  });

  return mcq;
};

export const updateDsaProblem = async (problemId: number, data: Prisma.DsaProblemUncheckedUpdateInput, testCases?: AddTestCaseType) => {
  // If testCases are provided and not empty, delete existing ones and create new ones
  // If testCases is undefined or empty array, keep existing test cases
  if (testCases !== undefined && testCases.length > 0) {
    await prisma.testCase.deleteMany({
      where: { problemId },
    });
  }

  const dsaProblem = await prisma.dsaProblem.update({
    where: { id: problemId },
    data: {
      ...data,
      ...(testCases !== undefined && testCases.length > 0 && {
        testCases: {
          create: testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
          })),
        },
      }),
    },
    include: {
      testCases: true,
    },
  });

  return dsaProblem;
};

export const getMcqQuestionById = async (questionId: number) => {
  return await prisma.mcqQuestion.findUnique({
    where: { id: questionId },
  });
};

export const getDsaProblemById = async (problemId: number) => {
  return await prisma.dsaProblem.findUnique({
    where: { id: problemId },
    include: {
      testCases: true,
    },
  });
};

export const linkMcqToContest = async (contestId: number, questionId: number, order: number) => {
  // Check if already linked
  const existing = await prisma.contestQuestion.findFirst({
    where: {
      contestId,
      mcqId: questionId,
    },
  });

  if (existing) {
    return existing;
  }

  return await prisma.contestQuestion.create({
    data: {
      contestId,
      mcqId: questionId,
      order,
    },
  });
};

export const linkDsaToContest = async (contestId: number, problemId: number, order: number) => {
  // Check if already linked
  const existing = await prisma.contestQuestion.findFirst({
    where: {
      contestId,
      dsaId: problemId,
    },
  });

  if (existing) {
    return existing;
  }

  return await prisma.contestQuestion.create({
    data: {
      contestId,
      dsaId: problemId,
      order,
    },
  });
};

export const unlinkMcqFromContest = async (contestId: number, questionId: number) => {
  return await prisma.contestQuestion.deleteMany({
    where: {
      contestId,
      mcqId: questionId,
    },
  });
};

export const unlinkDsaFromContest = async (contestId: number, problemId: number) => {
  return await prisma.contestQuestion.deleteMany({
    where: {
      contestId,
      dsaId: problemId,
    },
  });
};

export const unlinkAllQuestionsFromContest = async (contestId: number) => {
  return await prisma.contestQuestion.deleteMany({
    where: {
      contestId,
    },
  });
};

export const updateQuestionOrder = async (contestId: number, questionId: number, isMcq: boolean, newOrder: number) => {
  const question = await prisma.contestQuestion.findFirst({
    where: {
      contestId,
      ...(isMcq ? { mcqId: questionId } : { dsaId: questionId }),
    },
  });

  if (!question) {
    throw new Error("Question not found in contest");
  }

  return await prisma.contestQuestion.update({
    where: { id: question.id },
    data: { order: newOrder },
  });
};

export const reorderContestQuestions = async (contestId: number, questionOrders: Array<{ id: number; isMcq: boolean; order: number }>) => {
  // Get all contest questions
  const allQuestions = await prisma.contestQuestion.findMany({
    where: { contestId },
  });

  // Update orders
  const updates = questionOrders.map(({ id, isMcq, order }) => {
    const question = allQuestions.find(
      (q) => (isMcq ? q.mcqId === id : q.dsaId === id) && (isMcq ? q.mcqId !== null : q.dsaId !== null)
    );
    if (question) {
      return prisma.contestQuestion.update({
        where: { id: question.id },
        data: { order },
      });
    }
    return Promise.resolve(null);
  });

  await Promise.all(updates);
};

export const getAllMcqQuestions = async (page: number, limit: number, search?: string) => {
  const skip = (page - 1) * limit;
  const where: Prisma.McqQuestionWhereInput = {};

  if (search && search.length > 0) {
    where.questionText = {
      contains: search,
      mode: "insensitive",
    };
  }

  const [questions, total] = await Promise.all([
    prisma.mcqQuestion.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        questionText: true,
        options: true,
        correctOptionIndex: true,
        points: true,
        maxDurationMs: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
      },
    }),
    prisma.mcqQuestion.count({ where }),
  ]);

  return {
    questions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getAllDsaProblems = async (page: number, limit: number, search?: string) => {
  const skip = (page - 1) * limit;
  const where: Prisma.DsaProblemWhereInput = {};

  if (search && search.length > 0) {
    // Search in title and description (case-insensitive)
    // For tag search, Prisma's hasSome only does exact matches on arrays,
    // so we search title/description which covers most use cases
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const [problems, total] = await Promise.all([
    prisma.dsaProblem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        points: true,
        timeLimit: true,
        memoryLimit: true,
        difficulty: true,
        maxDurationMs: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
      },
    }),
    prisma.dsaProblem.count({ where }),
  ]);

  return {
    problems,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};