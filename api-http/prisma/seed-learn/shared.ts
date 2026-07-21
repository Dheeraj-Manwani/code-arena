import { PrismaClient, LearnQuestionKind } from "@prisma/client";

/**
 * Shared builder for the learn-path seed scripts.
 *
 * Mirrors `prisma/seed-learn.ts` (the original single-path seed) so the three
 * behave identically; the procedure lives here rather than being copied into
 * each path script.
 *
 * ## The two rules that make a seeded path correct
 *
 * 1. **Totals are counted from what was inserted**, never from the literal.
 *    `totalQuestions` is denormalised (LEARN_PATHS.md §5.10) and is the
 *    denominator of every progress figure the learner sees — a total that
 *    disagrees with the rows underneath it is a permanently wrong percentage.
 *    The builder recounts from the database at the end and throws on a mismatch.
 * 2. **Everything is published.** The seed creates paths in `published` status,
 *    so their MCQs must be `public` too. Leaving them at the `draft` default
 *    produces a live path that the admin builder's own publish validation would
 *    reject — a seed that contradicts the product.
 */

export const prisma = new PrismaClient();

export type QuestionSeed =
  | { kind: "problem"; problemSlug: string; note?: string }
  | { kind: "mcq"; mcqKey: string; note?: string };

export interface LessonSeed {
  slug: string;
  title: string;
  /** Markdown prose. Rendered through the sanitising pipeline (§5.8). */
  body?: string;
  questions: QuestionSeed[];
}

export interface ModuleSeed {
  slug: string;
  title: string;
  summary: string;
  lessons: LessonSeed[];
}

export interface McqSeed {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

export interface PathSeed {
  slug: string;
  title: string;
  description: string;
  isFeatured: boolean;
  /** Gallery ordering; lower sorts first. */
  order: number;
  /** Fraction of a module needed before the next stops being dimmed (§5.4). */
  unlockThreshold: number;
  mcqs: Record<string, McqSeed>;
  curriculum: ModuleSeed[];
}

export async function seedLearnPath(path: PathSeed): Promise<void> {
  console.log(`\n🌱 Learn path: ${path.title}`);

  const creator = await prisma.user.findFirst({ where: { role: "creator" } });
  if (!creator) {
    throw new Error("No creator user found. Run `pnpm seed` first.");
  }

  // Rebuild from scratch so the script is re-runnable. This cascades to
  // modules, lessons, questions **and any user progress on them** — acceptable
  // for a dev seed, and the reason paths live in their own scripts.
  const existing = await prisma.learnPath.findUnique({ where: { slug: path.slug } });
  if (existing) {
    await prisma.learnPath.delete({ where: { id: existing.id } });
    console.log("  Removed the previous version so it can be rebuilt");
  }

  // --- MCQs: find-or-create by exact question text ---------------------------
  // Matched on the text rather than an appended marker: `McqQuestion` has no
  // metadata column to hide a marker in, so one would end up rendered to
  // learners.
  const mcqIdByKey = new Map<string, number>();
  for (const [key, spec] of Object.entries(path.mcqs)) {
    let row = await prisma.mcqQuestion.findFirst({
      where: { questionText: spec.questionText },
    });
    if (!row) {
      row = await prisma.mcqQuestion.create({
        data: {
          questionText: spec.questionText,
          options: spec.options,
          correctOptionIndex: spec.correctOptionIndex,
          points: 1,
          creatorId: creator.id,
          visibility: "public",
        },
      });
    }
    mcqIdByKey.set(key, row.id);
  }

  // --- Resolve problem slugs -------------------------------------------------
  const wantedSlugs = path.curriculum
    .flatMap((m) => m.lessons)
    .flatMap((l) => l.questions)
    .filter((q): q is Extract<QuestionSeed, { kind: "problem" }> => q.kind === "problem")
    .map((q) => q.problemSlug);

  const problems = await prisma.dsaProblem.findMany({
    where: { slug: { in: wantedSlugs } },
    select: { id: true, slug: true },
  });
  const problemIdBySlug = new Map(problems.map((p) => [p.slug, p.id]));

  const missing = [...new Set(wantedSlugs)].filter((s) => !problemIdBySlug.has(s));
  if (missing.length > 0) {
    throw new Error(
      `Missing problems — run the problem seeds first: ${missing.join(", ")}`,
    );
  }

  // --- Build the tree, counting as we go -------------------------------------
  const created = await prisma.learnPath.create({
    data: {
      slug: path.slug,
      title: path.title,
      description: path.description,
      status: "published",
      isFeatured: path.isFeatured,
      order: path.order,
      unlockThreshold: path.unlockThreshold,
    },
  });

  let pathQuestionTotal = 0;
  let lessonCount = 0;

  for (const [moduleIndex, moduleSeed] of path.curriculum.entries()) {
    const learnModule = await prisma.learnModule.create({
      data: {
        pathId: created.id,
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
      lessonCount++;

      for (const [questionIndex, q] of lessonSeed.questions.entries()) {
        await prisma.learnQuestion.create({
          data: {
            lessonId: lesson.id,
            kind:
              q.kind === "problem" ? LearnQuestionKind.problem : LearnQuestionKind.mcq,
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
    console.log(
      `  ✓ ${moduleSeed.title.padEnd(30)} ${moduleSeed.lessons.length} lessons · ${moduleQuestionTotal} questions`,
    );
  }

  await prisma.learnPath.update({
    where: { id: created.id },
    data: { totalQuestions: pathQuestionTotal, totalModules: path.curriculum.length },
  });

  // --- Verify the denormalised totals against reality ------------------------
  const actual = await prisma.learnQuestion.count({
    where: { lesson: { module: { pathId: created.id } } },
  });
  if (actual !== pathQuestionTotal) {
    throw new Error(
      `Total mismatch: path says ${pathQuestionTotal}, database has ${actual}`,
    );
  }

  console.log(
    `  /learn/${path.slug} — ${path.curriculum.length} modules · ${lessonCount} lessons · ${pathQuestionTotal} questions`,
  );
}

/** Wraps a seed script's body with consistent logging and exit codes. */
export async function runSeed(main: () => Promise<void>): Promise<void> {
  try {
    await main();
    console.log("\n🎉 Done.\n");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
