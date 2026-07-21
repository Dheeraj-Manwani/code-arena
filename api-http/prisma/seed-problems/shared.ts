import { PrismaClient } from "@prisma/client";
import type { Difficulty, ProblemVisibility } from "@prisma/client";

/**
 * Shared machinery for the five problem seed scripts.
 *
 * The scripts are split by topic and kept to data only; everything procedural
 * lives here so each of them stays readable as a list of problems rather than a
 * list of problems wrapped in a program.
 *
 * ## Two hard constraints on what can be seeded
 *
 * These come from the judge harness (`src/util/boilerplate/judgeBoilerplate.ts`)
 * and are not style preferences — violating either produces a problem that
 * looks fine in the UI and cannot be judged:
 *
 *  1. **Literal types only.** `LITERAL_TYPE_KEYS` excludes `ListNode` and
 *     `TreeNode`. A signature using either makes the C++ and Java harnesses
 *     emit `// unsupported types ... skipped` for *every* test case, so the
 *     submission produces no markers at all. `assertSeedable` below rejects
 *     them at seed time rather than letting the breakage reach a learner.
 *  2. **No `void` or `object` return types.** The harness cannot compare them,
 *     so it passes on "the function did not throw". An in-place problem like
 *     "rotate the array" would mark an empty function correct — and C++ takes
 *     its arguments by value here anyway, so the mutation is invisible even
 *     when the solution is right.
 *
 * A third, softer rule the problems below follow: **the expected output must be
 * the only correct answer.** Comparison is exact (with an epsilon for floats),
 * so a problem whose answer is "any valid pair" fails a correct solution that
 * picks a different valid pair. Where a problem would naturally be ambiguous,
 * its statement pins an order.
 */

export const prisma = new PrismaClient();

/** Canonical type keys the judge can build literals for. */
const LITERAL_TYPES = [
  "int", "long", "double", "boolean", "string",
  "int[]", "long[]", "double[]", "boolean[]", "string[]", "int[][]",
] as const;

type LiteralType = (typeof LITERAL_TYPES)[number];

export interface SeedTestCase {
  /** JSON array of arguments, positionally matching `params`. */
  input: string;
  /** JSON of the return value. */
  expectedOutput: string;
  /** Hidden cases are withheld from the statement and the Run button. */
  isHidden: boolean;
}

export interface SeedProblem {
  slug: string;
  title: string;
  /** Markdown. Original prose — never copied from a problem site. */
  description: string;
  tags: string[];
  difficulty: Difficulty;
  points: number;
  timeLimit: number;
  memoryLimit: number;
  visibility?: ProblemVisibility;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  functionName: string;
  params: { name: string; type: LiteralType }[];
  returnType: LiteralType;
  testCases: SeedTestCase[];
}

/**
 * Fails loudly on a problem the judge could not actually run.
 *
 * Deliberately a throw rather than a skip: a silently-omitted problem is a seed
 * that half-worked, and the failure would only surface later as "why is this
 * one missing".
 */
function assertSeedable(problem: SeedProblem): void {
  const where = `${problem.slug}`;

  for (const param of problem.params) {
    if (!LITERAL_TYPES.includes(param.type)) {
      throw new Error(
        `${where}: parameter '${param.name}' uses ${param.type}, which the judge harness cannot build literals for.`,
      );
    }
  }
  if (!LITERAL_TYPES.includes(problem.returnType)) {
    throw new Error(
      `${where}: return type ${problem.returnType} is not comparable by the judge (void/object always pass).`,
    );
  }

  const visible = problem.testCases.filter((tc) => !tc.isHidden).length;
  const hidden = problem.testCases.filter((tc) => tc.isHidden).length;
  if (visible === 0) {
    throw new Error(`${where}: needs at least one visible test case for the statement.`);
  }
  if (hidden === 0) {
    throw new Error(`${where}: needs at least one hidden test case, or it is trivially gamed.`);
  }

  // Arity is the mistake this catches: an input array whose length doesn't match
  // the parameter list produces `undefined` arguments at judge time.
  for (const [index, tc] of problem.testCases.entries()) {
    let args: unknown;
    try {
      args = JSON.parse(tc.input);
    } catch {
      throw new Error(`${where}: test case ${index + 1} has malformed JSON input.`);
    }
    if (!Array.isArray(args) || args.length !== problem.params.length) {
      throw new Error(
        `${where}: test case ${index + 1} supplies ${
          Array.isArray(args) ? args.length : "non-array"
        } argument(s), but the signature takes ${problem.params.length}.`,
      );
    }
    try {
      JSON.parse(tc.expectedOutput);
    } catch {
      throw new Error(`${where}: test case ${index + 1} has malformed JSON expectedOutput.`);
    }
  }
}

/**
 * Inserts (or replaces) one topic's problems.
 *
 * Re-runnable: an existing problem with the same slug has its test cases
 * cleared and rewritten rather than being deleted, because `DsaProblem` is
 * referenced by learn questions and submissions with `onDelete: Restrict` —
 * deleting would either fail or take real data with it.
 */
export async function seedProblems(
  label: string,
  problems: SeedProblem[],
): Promise<void> {
  console.log(`\n🌱 ${label} — ${problems.length} problems`);

  const creator = await prisma.user.findFirst({ where: { role: "creator" } });
  if (!creator) {
    throw new Error("No creator user found. Run `pnpm seed` first.");
  }

  for (const problem of problems) {
    assertSeedable(problem);

    const signature = {
      functionName: problem.functionName,
      returnType: problem.returnType,
      parameters: problem.params,
      className: "Solution",
      useClassWrapper: true,
    };

    const data = {
      title: problem.title,
      description: problem.description,
      tags: problem.tags,
      difficulty: problem.difficulty,
      points: problem.points,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      // Public by default: these exist to populate the practice catalogue, and a
      // draft would be invisible there.
      visibility: problem.visibility ?? ("public" as ProblemVisibility),
      signature,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      constraints: problem.constraints,
      creatorId: creator.id,
    };

    const row = await prisma.dsaProblem.upsert({
      where: { slug: problem.slug },
      create: { slug: problem.slug, ...data },
      update: data,
    });

    await prisma.testCase.deleteMany({ where: { problemId: row.id } });
    await prisma.testCase.createMany({
      data: problem.testCases.map((tc) => ({
        problemId: row.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
      })),
    });

    const visible = problem.testCases.filter((tc) => !tc.isHidden).length;
    console.log(
      `  ✓ ${problem.slug.padEnd(34)} ${problem.difficulty.padEnd(6)} ${visible} visible / ${
        problem.testCases.length - visible
      } hidden`,
    );
  }
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
