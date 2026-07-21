/**
 * Re-judge historical submissions through the local backend and diff the
 * verdict against the one actually recorded (SELF_HOSTED_JUDGE.md Phase 5).
 *
 * This is the strongest evidence available that the container judge is correct,
 * and it is stronger than shadow mode in one important way: every row stores
 * `totalTestCases`, so this compares REAL VERDICTS (`accepted`, `wrong_answer`,
 * …) rather than the status-and-tally shape shadow mode has to settle for.
 *
 *   pnpm run judge-replay -- --limit 200
 *   pnpm run judge-replay -- --language cpp --table dsa
 *   pnpm run judge-replay -- --limit 1000 --json report.json
 *
 * Read-only: it never writes a verdict back. A divergence is a question for a
 * human, not something to auto-correct.
 *
 * Exit code is 1 when any divergence is found, so this can gate a cutover.
 */
import { writeFileSync } from "node:fs";

import prisma from "../../lib/db";
import { localExecutor } from "../local";
import { deriveVerdict } from "../parse";
import { generateJudgeBoilerplate, type SerializedTestCase } from "../../util/boilerplate";
import { LANGUAGES, type Language } from "../../schema/language.schema";
import { LANGUAGE_TO_JUDGE_JOB } from "../../jobs/constants";
import type { BoilerplateSignature } from "../../util/boilerplate/types";

type Table = "dsa" | "practice";

interface ReplayRow {
  table: Table;
  id: number;
  language: string;
  code: string;
  storedStatus: string;
  storedTestCasesPassed: number;
  totalTestCases: number;
  signature: unknown;
  testCases: SerializedTestCase[];
}

interface ReplayResult {
  table: Table;
  id: number;
  language: string;
  stored: string;
  computed: string;
  storedPassed: number;
  computedPassed: number;
  diverged: boolean;
  /** Groupable cause label, e.g. "accepted->wrong_answer". */
  label: string;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const table = (get("--table") ?? "both") as Table | "both";
  return {
    limit: parseInt(get("--limit") ?? "100", 10),
    language: get("--language"),
    table,
    json: get("--json"),
  };
}

function toLanguage(s: string): Language | null {
  return LANGUAGES.includes(s as Language) ? (s as Language) : null;
}

/**
 * `pending` rows never got a verdict, so there is nothing to compare against.
 * Including them would report every one as a divergence.
 */
const COMPARABLE_STATUSES = ["accepted", "wrong_answer", "time_limit_exceeded", "runtime_error"];

async function loadRows(opts: ReturnType<typeof parseArgs>): Promise<ReplayRow[]> {
  const where = {
    status: { in: COMPARABLE_STATUSES as never[] },
    ...(opts.language ? { language: opts.language } : {}),
  };
  const include = {
    problem: {
      select: {
        signature: true,
        testCases: { select: { input: true, expectedOutput: true } },
      },
    },
  };

  const rows: ReplayRow[] = [];

  if (opts.table === "dsa" || opts.table === "both") {
    const dsa = await prisma.dsaSubmission.findMany({
      where,
      include,
      orderBy: { id: "desc" },
      take: opts.limit,
    });
    for (const s of dsa) {
      rows.push({
        table: "dsa",
        id: s.id,
        language: s.language,
        code: s.code,
        storedStatus: s.status,
        storedTestCasesPassed: s.testCasesPassed,
        totalTestCases: s.totalTestCases,
        signature: s.problem?.signature,
        testCases: s.problem?.testCases ?? [],
      });
    }
  }

  if (opts.table === "practice" || opts.table === "both") {
    const practice = await prisma.practiceSubmission.findMany({
      where,
      include,
      orderBy: { id: "desc" },
      take: opts.limit,
    });
    for (const s of practice) {
      rows.push({
        table: "practice",
        id: s.id,
        language: s.language,
        code: s.code,
        storedStatus: s.status,
        storedTestCasesPassed: s.testCasesPassed,
        totalTestCases: s.totalTestCases,
        signature: s.problem?.signature,
        testCases: s.problem?.testCases ?? [],
      });
    }
  }

  return rows;
}

const skipped: Record<string, number> = {};
function skip(reason: string) {
  skipped[reason] = (skipped[reason] ?? 0) + 1;
}

async function replayOne(row: ReplayRow): Promise<ReplayResult | null> {
  const lang = toLanguage(row.language);
  if (!lang) {
    skip(`unsupported-language:${row.language}`);
    return null;
  }

  const signature = row.signature as BoilerplateSignature | null;
  if (!signature || typeof signature !== "object" || !signature.functionName) {
    skip("problem-missing-signature");
    return null;
  }
  if (row.testCases.length === 0) {
    skip("problem-missing-test-cases");
    return null;
  }
  if (row.totalTestCases === 0) {
    // Without a total, `deriveVerdict` can never return `accepted`.
    skip("row-missing-total-test-cases");
    return null;
  }

  const harness = generateJudgeBoilerplate(signature, row.code, row.testCases)[lang];
  const res = await localExecutor.execute({
    language: LANGUAGE_TO_JUDGE_JOB[lang],
    sourceCode: harness,
  });

  const { status: computed, testCasesPassed } = deriveVerdict(res, row.totalTestCases);
  const diverged = computed !== row.storedStatus;

  return {
    table: row.table,
    id: row.id,
    language: row.language,
    stored: row.storedStatus,
    computed,
    storedPassed: row.storedTestCasesPassed,
    computedPassed: testCasesPassed,
    diverged,
    label: diverged ? `${row.storedStatus}->${computed}` : "match",
  };
}

function report(results: ReplayResult[]) {
  const diverged = results.filter((r) => r.diverged);

  console.log("");
  console.log("=".repeat(64));
  console.log(`Replayed : ${results.length}`);
  console.log(`Matched  : ${results.length - diverged.length}`);
  console.log(`Diverged : ${diverged.length}`);
  if (results.length > 0) {
    const pct = ((diverged.length / results.length) * 100).toFixed(2);
    console.log(`Rate     : ${pct}%`);
  }

  if (Object.keys(skipped).length > 0) {
    console.log("");
    console.log("Skipped (not comparable):");
    for (const [reason, n] of Object.entries(skipped).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(5)}  ${reason}`);
    }
  }

  if (diverged.length === 0) {
    console.log("");
    console.log("No divergence. Phase 5 exit criterion met for this sample.");
    console.log("=".repeat(64));
    return;
  }

  // Grouped by cause first, then language: a flat list of 400 rows is not a
  // report, and the whole point is to collapse them into a few triage buckets.
  console.log("");
  console.log("Divergence by cause:");
  const byLabel = new Map<string, ReplayResult[]>();
  for (const r of diverged) {
    const key = `${r.label}  [${r.language}]`;
    const bucket = byLabel.get(key) ?? [];
    bucket.push(r);
    byLabel.set(key, bucket);
  }

  for (const [key, rows] of [...byLabel.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(rows.length).padStart(5)}  ${key}`);
    const sample = rows.slice(0, 5).map((r) => `${r.table}#${r.id}`).join(", ");
    console.log(`         e.g. ${sample}${rows.length > 5 ? ", …" : ""}`);
  }

  console.log("");
  console.log("Triage each bucket into: toolchain version difference (expected),");
  console.log("sandbox limit too tight (fix), mapping bug (fix), or Judge0 flake");
  console.log("(ignore). Cutover requires ZERO unexplained buckets.");
  console.log("=".repeat(64));
}

async function main() {
  const opts = parseArgs();
  const rows = await loadRows(opts);

  console.log(`Replaying ${rows.length} submission(s) through the local backend…`);
  if (rows.length === 0) {
    console.log("Nothing to replay. Check --table / --language, or seed some submissions.");
    await prisma.$disconnect();
    return;
  }

  const results: ReplayResult[] = [];
  // Sequential on purpose: this shares a machine with whatever else is running,
  // and a replay that saturates every core is one nobody will run.
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const result = await replayOne(row);
      if (result) results.push(result);
    } catch (err) {
      skip(`execution-error:${err instanceof Error ? err.message : String(err)}`);
    }
    if ((i + 1) % 25 === 0) {
      console.log(`  … ${i + 1}/${rows.length}`);
    }
  }

  report(results);

  if (opts.json) {
    writeFileSync(opts.json, JSON.stringify({ results, skipped }, null, 2), "utf8");
    console.log(`\nWrote ${opts.json}`);
  }

  await prisma.$disconnect();

  // Non-zero when anything diverged, so a cutover script can gate on it.
  process.exitCode = results.some((r) => r.diverged) ? 1 : 0;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
