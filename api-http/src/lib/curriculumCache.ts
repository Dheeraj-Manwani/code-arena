/**
 * In-process cache for user-independent curriculum reads (LEARN_PATHS.md §5.3).
 *
 * The path tree is identical for every learner and changes only when a curator
 * edits it, while the per-user overlay is two flat lookups. That makes the tree
 * the one read here clearly worth caching — and the only one, because caching
 * anything user-scoped is how one learner's progress ends up rendered for
 * another.
 *
 * Deliberately a plain Map, matching the Economy Service's Redis-free design
 * (`ECONOMY_SERVICE.md`): a single process, so a single process's memory is the
 * right place. If this ever runs multi-instance, entries expire independently
 * per instance — stale for at most TTL, never incorrect, because every entry is
 * a pure function of committed rows.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const TTL_MS = 60_000;

/** Bounded so a pathological number of paths can't grow this without limit. */
const MAX_ENTRIES = 200;

const store = new Map<string, Entry<unknown>>();

export const getCached = <T>(key: string): T | undefined => {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }

  return entry.value;
};

export const setCached = <T>(key: string, value: T): void => {
  // Cheapest sufficient eviction: Map preserves insertion order, so the first
  // key is the oldest. An LRU would need per-read bookkeeping to serve a cache
  // whose whole population is "the published paths".
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }

  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
};

/**
 * Read-through helper.
 *
 * Callers must include something version-like in the key (§5.3 suggests
 * `pathId + updatedAt`) when they need edits to appear immediately; the TTL
 * alone means a curator's change can take up to a minute to show.
 */
export const cached = async <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;

  const value = await load();
  setCached(key, value);
  return value;
};

/** Test seam, and the hook a future admin-write invalidation would call. */
export const clearCurriculumCache = (): void => {
  store.clear();
};
