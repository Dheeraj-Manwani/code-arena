/**
 * Sparse ordering for drag-reorderable lists (LEARN_PATHS.md §5.9).
 *
 * The obvious design — dense `order` values 0,1,2,… — makes every reorder an
 * O(n) rewrite of the rows after the drop point. With a 474-question path and a
 * drag-heavy builder that is both a lot of write amplification and a lot of
 * opportunity for two curators editing different modules to clobber each other.
 *
 * Instead, items are spaced `STEP` apart and a drop between two neighbours takes
 * the midpoint, so a reorder is a **single-row update**. Gaps halve each time an
 * item is dropped in the same place, so eventually a midpoint no longer exists —
 * at which point the caller must rebalance that one sibling list.
 *
 * These are pure functions on purpose: the interesting behaviour is arithmetic
 * and boundary conditions, and mocking Prisma to test arithmetic proves nothing.
 */

/** Gap between adjacent items. Allows ~10 midpoint insertions before rebalance. */
export const ORDER_STEP = 1000;

/** Order for a new item appended to a list whose current max is `maxOrder`. */
export const nextOrder = (maxOrder: number | null | undefined): number =>
  (maxOrder ?? 0) + ORDER_STEP;

export type OrderBetweenResult =
  | { ok: true; order: number }
  | { ok: false; reason: "rebalance_required" };

/**
 * The order for an item dropped between `prev` and `next`.
 *
 * `null` means "no neighbour on that side" — dropping at the head or the tail.
 * Returns `rebalance_required` when the neighbours are adjacent integers and no
 * value fits between them; the caller must then renumber the sibling list and
 * retry. Signalled rather than thrown because it is an expected outcome of
 * normal use, not an error.
 */
export const orderBetween = (
  prev: number | null,
  next: number | null,
): OrderBetweenResult => {
  if (prev === null && next === null) return { ok: true, order: ORDER_STEP };

  if (prev === null) {
    // Dropping at the head. Halving rather than subtracting STEP keeps the
    // value positive when `next` is already small.
    const order = Math.floor(next! / 2);
    return order > 0 && order < next!
      ? { ok: true, order }
      : { ok: false, reason: "rebalance_required" };
  }

  if (next === null) return { ok: true, order: prev + ORDER_STEP };

  if (next - prev < 2) return { ok: false, reason: "rebalance_required" };

  return { ok: true, order: prev + Math.floor((next - prev) / 2) };
};

/**
 * Renumbers a sibling list back to even `ORDER_STEP` spacing, preserving the
 * current relative order.
 *
 * Returns only the rows whose order actually changes, so a rebalance of an
 * already-even list is zero writes.
 */
export const rebalanceOrders = <T extends { id: number; order: number }>(
  items: readonly T[],
): Array<{ id: number; order: number }> => {
  const sorted = [...items].sort((a, b) => a.order - b.order || a.id - b.id);

  return sorted
    .map((item, index) => ({ id: item.id, order: (index + 1) * ORDER_STEP }))
    .filter((next) => {
      const current = sorted.find((item) => item.id === next.id);
      return current!.order !== next.order;
    });
};

/**
 * Resolves a requested move into the neighbours it lands between.
 *
 * `targetIndex` is the position the item should occupy in the list *as the user
 * sees it after the drop*. The moving item is removed from consideration first —
 * otherwise dragging an item one slot down computes a midpoint against itself
 * and it appears not to move, which is the classic off-by-one in reorder UIs.
 */
export const neighboursForMove = <T extends { id: number; order: number }>(
  items: readonly T[],
  movingId: number,
  targetIndex: number,
): { prev: number | null; next: number | null } => {
  const others = [...items]
    .filter((item) => item.id !== movingId)
    .sort((a, b) => a.order - b.order || a.id - b.id);

  const clamped = Math.max(0, Math.min(targetIndex, others.length));

  return {
    prev: clamped > 0 ? others[clamped - 1].order : null,
    next: clamped < others.length ? others[clamped].order : null,
  };
};
