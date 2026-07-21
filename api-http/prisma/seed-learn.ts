/**
 * Seeds one real learn path over the problems `seed.ts` already created.
 *
 * Run `npm run seed` first — this script deliberately does not create problems.
 * A learn path is *curation*, and a seed that invented its own problems would
 * hide the thing most worth exercising: that a path is assembled from the same
 * public catalogue rows `/problems` serves.
 *
 * Re-runnable. The path is deleted and rebuilt each time, which cascades to its
 * modules, lessons, questions and **any user progress on them** — acceptable for
 * a dev seed, and the reason this is a separate script rather than part of the
 * main one.
 */

import { PrismaClient, LearnQuestionKind } from "@prisma/client";

const prisma = new PrismaClient();

const PATH_SLUG = "dsa-foundations";

type QuestionSeed =
  | { kind: "problem"; problemSlug: string; note?: string }
  | { kind: "mcq"; mcqKey: string; note?: string };

interface LessonSeed {
  slug: string;
  title: string;
  body?: string;
  questions: QuestionSeed[];
}

interface ModuleSeed {
  slug: string;
  title: string;
  summary: string;
  lessons: LessonSeed[];
}

/**
 * MCQs this path needs. Keyed so a lesson can reference one without repeating
 * the text. `correctOptionIndex` lives here and must never reach a learner —
 * see LEARN_PATHS.md §5.7 for the projection that keeps it server-side.
 */
const mcqs: Record<
  string,
  { questionText: string; options: string[]; correctOptionIndex: number }
> = {
  "array-access": {
    questionText: "What is the time complexity of accessing an array element by index?",
    options: ["O(n)", "O(log n)", "O(1)", "O(n log n)"],
    correctOptionIndex: 2,
  },
  "hashmap-tradeoff": {
    questionText:
      "Two Sum in O(n) trades time for what? Pick the most precise answer.",
    options: [
      "Nothing — it is strictly better",
      "O(n) extra space for a hash map",
      "O(log n) extra space",
      "Numerical accuracy",
    ],
    correctOptionIndex: 1,
  },
  "window-invariant": {
    questionText:
      "In a sliding-window solution, what must be true every time the window shrinks?",
    options: [
      "The window is at its maximum size",
      "The invariant that made the window invalid is being restored",
      "The right pointer moves backwards",
      "The answer is recomputed from scratch",
    ],
    correctOptionIndex: 1,
  },
  "list-cycle": {
    questionText:
      "Floyd's cycle detection uses two pointers. Why is the fast pointer's step size 2 rather than 3?",
    options: [
      "3 would never meet inside a cycle",
      "2 guarantees they meet and keeps the proof simple; larger steps still work but complicate it",
      "2 is required for O(1) space",
      "Any step size other than 2 is incorrect",
    ],
    correctOptionIndex: 1,
  },
  "bst-property": {
    questionText: "Which property lets you find an LCA in a BST without searching both subtrees?",
    options: [
      "The tree is always balanced",
      "In-order traversal is sorted, so a node's value partitions its descendants",
      "Every node stores its parent",
      "BSTs are always complete",
    ],
    correctOptionIndex: 1,
  },
  "dp-overlap": {
    questionText: "What makes a problem a candidate for dynamic programming?",
    options: [
      "It can be solved recursively",
      "It has overlapping subproblems and optimal substructure",
      "The input is an array",
      "It is NP-hard",
    ],
    correctOptionIndex: 1,
  },
};

const curriculum: ModuleSeed[] = [
  {
    slug: "arrays-and-strings",
    title: "Arrays and Strings",
    summary: "The two structures every other topic assumes you are fluent in.",
    lessons: [
      {
        slug: "array-fundamentals",
        title: "Array fundamentals",
        body: [
          "## Why arrays come first",
          "",
          "An array gives you **O(1) access by index** and nothing else for free.",
          "Every array technique worth learning is a way of buying something else —",
          "a lookup, an ordering, a window — without giving up that access.",
          "",
          "Keep one question in mind as you work through these: *what am I trading,",
          "and for what?* Two Sum is the clearest example. The brute force is O(n²)",
          "time and O(1) space; the hash map version is O(n) time and O(n) space.",
          "Neither is universally better.",
          "",
          "```text",
          "brute force   time O(n²)   space O(1)",
          "hash map      time O(n)    space O(n)",
          "```",
        ].join("\n"),
        questions: [
          { kind: "mcq", mcqKey: "array-access" },
          { kind: "problem", problemSlug: "two-sum", note: "Solve it brute-force first, then find the O(n)." },
          { kind: "mcq", mcqKey: "hashmap-tradeoff" },
          { kind: "problem", problemSlug: "maximum-subarray" },
          { kind: "problem", problemSlug: "rotate-array", note: "Try to do it in O(1) extra space." },
        ],
      },
      {
        slug: "strings-and-windows",
        title: "Strings and sliding windows",
        body: [
          "## The sliding window",
          "",
          "A sliding window is a loop with an **invariant**. The window grows on the",
          "right; when the invariant breaks, it shrinks on the left until the",
          "invariant holds again.",
          "",
          "Almost every bug in a window solution is the same bug: shrinking without",
          "restoring the invariant, or restoring it without updating the answer.",
          "Write the invariant down before you write the loop.",
        ].join("\n"),
        questions: [
          { kind: "problem", problemSlug: "valid-parentheses" },
          { kind: "mcq", mcqKey: "window-invariant" },
          {
            kind: "problem",
            problemSlug: "longest-substring-without-repeating-characters",
            note: "State the invariant in a comment before you code it.",
          },
        ],
      },
    ],
  },
  {
    slug: "linked-lists-and-trees",
    title: "Linked Lists and Trees",
    summary: "Pointer discipline, then the recursive structures built on it.",
    lessons: [
      {
        slug: "linked-list-traversal",
        title: "Linked list traversal",
        body: [
          "## Three pointers, carefully",
          "",
          "Linked list problems are rarely conceptually hard. They are *fiddly* —",
          "the difficulty is entirely in not losing a reference you still need.",
          "",
          "Draw the list. Draw it again after one iteration. If you cannot draw the",
          "state, you cannot write the loop.",
        ].join("\n"),
        questions: [
          { kind: "problem", problemSlug: "reverse-linked-list" },
          { kind: "problem", problemSlug: "detect-cycle-in-linked-list" },
          { kind: "mcq", mcqKey: "list-cycle" },
        ],
      },
      {
        slug: "tree-traversal",
        title: "Tree traversal",
        questions: [
          { kind: "problem", problemSlug: "binary-tree-level-order-traversal" },
          { kind: "mcq", mcqKey: "bst-property" },
          { kind: "problem", problemSlug: "lowest-common-ancestor-of-bst" },
          { kind: "problem", problemSlug: "number-of-islands", note: "A grid is a graph. BFS or DFS both work." },
        ],
      },
    ],
  },
  {
    slug: "dynamic-programming",
    title: "Dynamic Programming",
    summary: "Recognising overlap, then removing it.",
    lessons: [
      {
        slug: "classic-dp",
        title: "Classic DP",
        body: [
          "## Overlap is the whole idea",
          "",
          "DP is what you get when a recursive solution recomputes the same",
          "subproblem more than once and you stop letting it.",
          "",
          "The order to work in:",
          "",
          "1. Write the recursion, however slow.",
          "2. Find the repeated call.",
          "3. Memoise it.",
          "4. *Then*, if you want, turn it inside out into a table.",
          "",
          "Starting at step 4 is why DP feels like magic instead of engineering.",
        ].join("\n"),
        questions: [
          { kind: "mcq", mcqKey: "dp-overlap" },
          { kind: "problem", problemSlug: "climbing-stairs", note: "Write the recursion first, even though you know the answer." },
          { kind: "problem", problemSlug: "coin-change" },
        ],
      },
      {
        slug: "sequence-dp",
        title: "Sequence DP",
        questions: [
          { kind: "problem", problemSlug: "longest-increasing-subsequence" },
          { kind: "problem", problemSlug: "edit-distance" },
          { kind: "problem", problemSlug: "lru-cache", note: "Not DP — a design palate cleanser to finish on." },
        ],
      },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding learn path...");

  const creator = await prisma.user.findFirst({ where: { role: "creator" } });
  if (!creator) {
    throw new Error("No creator user found. Run `npm run seed` first.");
  }

  // Rebuild from scratch so the script is re-runnable. Cascades to modules,
  // lessons, questions and progress.
  const existing = await prisma.learnPath.findUnique({ where: { slug: PATH_SLUG } });
  if (existing) {
    await prisma.learnPath.delete({ where: { id: existing.id } });
    console.log("  Removed previous path so it can be rebuilt");
  }

  // --- MCQs: find-or-create by exact question text -----------------------------
  // Matched on the text itself rather than an appended marker: a marker is
  // simpler to query but ends up rendered to learners, since `McqQuestion` has
  // no metadata column to hide it in. The texts below are distinctive enough to
  // be their own key.
  const mcqIdByKey = new Map<string, number>();
  for (const [key, spec] of Object.entries(mcqs)) {
    const questionText = spec.questionText;
    let row = await prisma.mcqQuestion.findFirst({ where: { questionText } });
    if (!row) {
      row = await prisma.mcqQuestion.create({
        data: {
          questionText,
          options: spec.options,
          correctOptionIndex: spec.correctOptionIndex,
          points: 1,
          creatorId: creator.id,
          // The seed publishes this path directly. Leaving these at the `draft`
          // default would produce a published path that the builder's own
          // publish validation rejects — a seed that contradicts the product.
          visibility: "public",
        },
      });
    }
    mcqIdByKey.set(key, row.id);
  }
  console.log(`  ${mcqIdByKey.size} MCQs ready`);

  // --- Resolve problem slugs --------------------------------------------------
  const wantedSlugs = curriculum
    .flatMap((m) => m.lessons)
    .flatMap((l) => l.questions)
    .filter((q): q is Extract<QuestionSeed, { kind: "problem" }> => q.kind === "problem")
    .map((q) => q.problemSlug);

  const problems = await prisma.dsaProblem.findMany({
    where: { slug: { in: wantedSlugs } },
    select: { id: true, slug: true },
  });
  const problemIdBySlug = new Map(problems.map((p) => [p.slug, p.id]));

  const missing = wantedSlugs.filter((s) => !problemIdBySlug.has(s));
  if (missing.length > 0) {
    throw new Error(
      `Missing problems (run \`npm run seed\` first): ${missing.join(", ")}`,
    );
  }

  // --- Build the tree, counting as we go -------------------------------------
  // Totals are denormalised (LEARN_PATHS.md §5.10) and a wrong total is a wrong
  // denominator, so they are computed from what was actually inserted rather
  // than from the curriculum literal.
  const path = await prisma.learnPath.create({
    data: {
      slug: PATH_SLUG,
      title: "DSA Foundations",
      description:
        "A short, honest path through the structures and techniques everything else builds on.",
      status: "published",
      isFeatured: true,
      order: 0,
      unlockThreshold: 0.6,
    },
  });

  let pathQuestionTotal = 0;

  for (const [moduleIndex, moduleSeed] of curriculum.entries()) {
    const learnModule = await prisma.learnModule.create({
      data: {
        pathId: path.id,
        slug: moduleSeed.slug,
        title: moduleSeed.title,
        summary: moduleSeed.summary,
        // Sparse ordering (§5.9) so a later drag-reorder is a single-row update.
        order: (moduleIndex + 1) * 1000,
      },
    });

    let moduleQuestionTotal = 0;

    for (const [lessonIndex, lessonSeed] of moduleSeed.lessons.entries()) {
      const lesson = await prisma.learnLesson.create({
        data: {
          moduleId: learnModule.id,
          slug: lessonSeed.slug,
          title: lessonSeed.title,
          body: lessonSeed.body ?? null,
          order: (lessonIndex + 1) * 1000,
        },
      });

      for (const [questionIndex, q] of lessonSeed.questions.entries()) {
        await prisma.learnQuestion.create({
          data: {
            lessonId: lesson.id,
            kind: q.kind === "problem" ? LearnQuestionKind.problem : LearnQuestionKind.mcq,
            order: (questionIndex + 1) * 1000,
            note: q.note ?? null,
            problemId: q.kind === "problem" ? problemIdBySlug.get(q.problemSlug)! : null,
            mcqId: q.kind === "mcq" ? mcqIdByKey.get(q.mcqKey)! : null,
          },
        });
      }

      await prisma.learnLesson.update({
        where: { id: lesson.id },
        data: { totalQuestions: lessonSeed.questions.length },
      });

      moduleQuestionTotal += lessonSeed.questions.length;
    }

    await prisma.learnModule.update({
      where: { id: learnModule.id },
      data: { totalQuestions: moduleQuestionTotal },
    });

    pathQuestionTotal += moduleQuestionTotal;
  }

  await prisma.learnPath.update({
    where: { id: path.id },
    data: {
      totalQuestions: pathQuestionTotal,
      totalModules: curriculum.length,
    },
  });

  // --- Verify the denormalised totals against reality -------------------------
  // Cheap here, and it means a seed run is also a check that the counting
  // convention this whole feature depends on actually holds.
  const actualQuestions = await prisma.learnQuestion.count({
    where: { lesson: { module: { pathId: path.id } } },
  });
  if (actualQuestions !== pathQuestionTotal) {
    throw new Error(
      `Total mismatch: path says ${pathQuestionTotal}, database has ${actualQuestions}`,
    );
  }

  console.log("🎉 Learn path seeded.");
  console.log(`  • /learn/${PATH_SLUG} — "${path.title}" (published, featured)`);
  console.log(
    `  • ${curriculum.length} modules · ${curriculum.flatMap((m) => m.lessons).length} lessons · ${pathQuestionTotal} questions`,
  );
  console.log(
    `  • ${wantedSlugs.length} problem questions · ${pathQuestionTotal - wantedSlugs.length} MCQ questions`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Learn seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
