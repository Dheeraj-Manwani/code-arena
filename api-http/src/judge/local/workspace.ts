import { mkdtemp, writeFile, rm, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { LANGUAGE_SPECS } from "./languages";
import { logger } from "../../lib/logger";
import type { JudgeLanguage } from "../../schema/job.schema";

/**
 * Per-execution scratch directory (SELF_HOSTED_JUDGE.md §4.2).
 *
 * The workspace holds exactly one file — the complete generated program — and
 * is bind-mounted read-only at /work. User code never reaches the container as
 * a command-line argument, which is what keeps `sh -c` safe in `command.ts`.
 */

/**
 * Distinctive enough that the boot sweep cannot match a directory belonging to
 * something else. `mkdtemp` appends random characters.
 */
const WORKSPACE_PREFIX = "code-arena-judge-";

/** Orphans younger than this may belong to an execution still in flight. */
const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000;

/**
 * Runs `fn` with a workspace containing the source, then removes it.
 *
 * Cleanup is unconditional. A leaked workspace per submission is how a box
 * silently fills up over a contest, and the failure appears as unrelated disk
 * errors hours later.
 */
export async function withWorkspace<T>(
  language: JudgeLanguage,
  sourceCode: string,
  fn: (workspace: string) => Promise<T>
): Promise<T> {
  const workspace = await mkdtemp(join(tmpdir(), WORKSPACE_PREFIX));

  try {
    await writeFile(join(workspace, LANGUAGE_SPECS[language].sourceFile), sourceCode, "utf8");
    return await fn(workspace);
  } finally {
    await rm(workspace, { recursive: true, force: true }).catch((err) => {
      // Never fail a submission over cleanup — the sweep below is the backstop.
      logger.warn({ workspace, err: String(err) }, "Failed to remove judge workspace");
    });
  }
}

/**
 * Removes workspaces left behind by a crash, called at boot.
 *
 * Same philosophy as `jobs/reconcile.ts`: durability lives in a sweep on
 * startup rather than in the happy path, because the happy path is exactly what
 * a crash skips. The age floor means a sweep can never delete a workspace
 * belonging to a concurrently running execution — including one owned by
 * another process, should this ever run more than one instance.
 */
export async function sweepOrphanedWorkspaces(
  minAgeMs: number = ORPHAN_MIN_AGE_MS
): Promise<number> {
  const root = tmpdir();
  let removed = 0;

  let entries: string[];
  try {
    entries = await readdir(root);
  } catch (err) {
    logger.warn({ root, err: String(err) }, "Could not scan tmpdir for orphaned workspaces");
    return 0;
  }

  const cutoff = Date.now() - minAgeMs;

  for (const entry of entries) {
    if (!entry.startsWith(WORKSPACE_PREFIX)) continue;

    const path = join(root, entry);
    try {
      const info = await stat(path);
      if (!info.isDirectory() || info.mtimeMs > cutoff) continue;

      await rm(path, { recursive: true, force: true });
      removed++;
    } catch {
      // Raced with another sweep, or not ours to delete. Either way, skip it.
    }
  }

  if (removed > 0) {
    logger.info({ removed }, "Swept orphaned judge workspaces");
  }

  return removed;
}
