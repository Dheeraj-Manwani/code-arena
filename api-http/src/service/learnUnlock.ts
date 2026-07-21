/**
 * The soft-gating predicate (LEARN_PATHS.md §5.4).
 *
 * Gating here is *advisory*: a locked module is dimmed and carries a reason, but
 * it is always reachable. Nothing in this file should ever be used to reject a
 * request — it decides how a module is presented, not whether it may be opened.
 *
 * Pure on purpose. The interesting behaviour is boundary conditions and the
 * monotonicity rule, and mocking Prisma to test a comparison proves nothing.
 */

export interface ModuleGateInput {
  /** Position in the path; the first module is never gated. */
  index: number;
  /** Questions completed in the *previous* module. */
  previousCompleted: number;
  /** Total questions in the *previous* module. */
  previousTotal: number;
  /**
   * When this user unlocked the module, if they already have. Sticky: once set,
   * nothing re-locks the module — not a curator adding questions to the previous
   * one, not a threshold change. Phase 3 has no progress rows yet and always
   * passes null; Phase 4 supplies the stored value.
   */
  unlockedAt?: Date | null;
}

export type ModuleGate =
  | { unlocked: true }
  | {
      unlocked: false;
      /** Fraction of the previous module completed, 0–1, for the UI's copy. */
      progress: number;
      required: number;
    };

/**
 * `threshold` is the fraction of the previous module required. `0` disables
 * gating for the whole path, which must be expressible without a code change.
 */
export const moduleGate = (
  { index, previousCompleted, previousTotal, unlockedAt = null }: ModuleGateInput,
  threshold: number,
): ModuleGate => {
  if (index === 0) return { unlocked: true };
  if (threshold <= 0) return { unlocked: true };

  // Sticky wins over everything, including a threshold the user no longer meets.
  if (unlockedAt !== null) return { unlocked: true };

  // A previous module with no questions cannot be a barrier — otherwise an
  // empty module a curator hasn't filled yet walls off the rest of the path.
  if (previousTotal <= 0) return { unlocked: true };

  const progress = previousCompleted / previousTotal;

  // Guard against float drift: 3/5 = 0.6000000000000001 must satisfy a 0.6
  // threshold, or a user who did exactly enough is told they haven't.
  if (progress + 1e-9 >= threshold) return { unlocked: true };

  return { unlocked: false, progress, required: threshold };
};

/**
 * Runs `moduleGate` across a path in order.
 *
 * Each module is gated on the one before it in curriculum order, so this is a
 * sequential walk rather than a map — module N's gate depends on N-1's counts,
 * not on whether N-1 was itself unlocked. A user who jumps ahead and completes
 * module 5 therefore unlocks module 6, which is the intended behaviour: the
 * gate reflects demonstrated readiness, not a chain of permissions.
 */
export const gateModules = <T extends { completed: number; total: number; unlockedAt?: Date | null }>(
  modules: readonly T[],
  threshold: number,
): ModuleGate[] =>
  modules.map((current, index) =>
    moduleGate(
      {
        index,
        previousCompleted: index === 0 ? 0 : modules[index - 1].completed,
        previousTotal: index === 0 ? 0 : modules[index - 1].total,
        unlockedAt: current.unlockedAt ?? null,
      },
      threshold,
    ),
  );
