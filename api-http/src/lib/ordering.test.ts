import { describe, it, expect } from "vitest";
import {
  ORDER_STEP,
  nextOrder,
  orderBetween,
  rebalanceOrders,
  neighboursForMove,
} from "./ordering";

describe("nextOrder", () => {
  it("starts at ORDER_STEP for an empty list", () => {
    expect(nextOrder(null)).toBe(ORDER_STEP);
    expect(nextOrder(undefined)).toBe(ORDER_STEP);
  });

  it("appends one step past the current max", () => {
    expect(nextOrder(3000)).toBe(4000);
  });
});

describe("orderBetween", () => {
  it("returns ORDER_STEP for the first item", () => {
    expect(orderBetween(null, null)).toEqual({ ok: true, order: ORDER_STEP });
  });

  it("appends past the tail", () => {
    expect(orderBetween(2000, null)).toEqual({ ok: true, order: 3000 });
  });

  it("halves toward zero at the head, staying positive", () => {
    expect(orderBetween(null, 1000)).toEqual({ ok: true, order: 500 });
    expect(orderBetween(null, 2)).toEqual({ ok: true, order: 1 });
  });

  it("takes the midpoint between neighbours", () => {
    expect(orderBetween(1000, 2000)).toEqual({ ok: true, order: 1500 });
  });

  // The property that makes single-row reorder writes correct at all: the
  // result must be strictly inside the interval, never equal to an endpoint.
  it("always lands strictly between the neighbours", () => {
    for (const [prev, next] of [
      [1000, 2000],
      [1000, 1002],
      [0, 3],
      [500, 1000],
    ] as const) {
      const result = orderBetween(prev, next);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.order).toBeGreaterThan(prev);
        expect(result.order).toBeLessThan(next);
      }
    }
  });

  it("asks for a rebalance when no integer fits between", () => {
    expect(orderBetween(1000, 1001)).toEqual({
      ok: false,
      reason: "rebalance_required",
    });
    expect(orderBetween(1000, 1000)).toEqual({
      ok: false,
      reason: "rebalance_required",
    });
  });

  it("asks for a rebalance at the head when next is already 1", () => {
    expect(orderBetween(null, 1)).toEqual({
      ok: false,
      reason: "rebalance_required",
    });
  });

  // Repeatedly dropping in the same slot is the realistic path to exhaustion.
  // It must degrade into a rebalance request, never into a duplicate order.
  it("survives repeated midpoint insertion until it requests a rebalance", () => {
    let prev = 1000;
    const next = 2000;
    const seen = new Set<number>([prev, next]);

    for (let i = 0; i < 50; i++) {
      const result = orderBetween(prev, next);
      if (!result.ok) {
        expect(result.reason).toBe("rebalance_required");
        return;
      }
      expect(seen.has(result.order)).toBe(false);
      seen.add(result.order);
      prev = result.order;
    }

    throw new Error("expected a rebalance request within 50 insertions");
  });
});

describe("rebalanceOrders", () => {
  it("renumbers to even spacing, preserving relative order", () => {
    const result = rebalanceOrders([
      { id: 3, order: 1001 },
      { id: 1, order: 1000 },
      { id: 2, order: 1000 },
    ]);

    // Sorted by (order, id): 1@1000, 2@1000, 3@1001
    expect(result).toEqual([
      { id: 2, order: 2000 },
      { id: 3, order: 3000 },
    ]);
  });

  it("writes nothing when the list is already evenly spaced", () => {
    expect(
      rebalanceOrders([
        { id: 1, order: 1000 },
        { id: 2, order: 2000 },
      ]),
    ).toEqual([]);
  });

  it("handles an empty list", () => {
    expect(rebalanceOrders([])).toEqual([]);
  });
});

describe("neighboursForMove", () => {
  const items = [
    { id: 1, order: 1000 },
    { id: 2, order: 2000 },
    { id: 3, order: 3000 },
  ];

  // The classic reorder off-by-one: if the moving item is left in the list,
  // dragging it one slot down computes a midpoint against itself and it appears
  // not to move at all.
  it("excludes the moving item from its own neighbour calculation", () => {
    expect(neighboursForMove(items, 1, 1)).toEqual({ prev: 2000, next: 3000 });
  });

  it("returns a null prev when moving to the head", () => {
    expect(neighboursForMove(items, 3, 0)).toEqual({ prev: null, next: 1000 });
  });

  // Index is a position in the list *with the moving item removed*, so for a
  // 3-item list moving item 1, index 2 is already the tail — `others` only has
  // two entries. Getting this wrong in the caller is how an item "won't move
  // to the end".
  it("returns a null next when moving to the tail", () => {
    expect(neighboursForMove(items, 1, 2)).toEqual({ prev: 3000, next: null });
    expect(neighboursForMove(items, 1, 5)).toEqual({ prev: 3000, next: null });
  });

  it("places an item between its new neighbours mid-list", () => {
    expect(neighboursForMove(items, 3, 1)).toEqual({ prev: 1000, next: 2000 });
  });

  it("clamps an out-of-range target index rather than throwing", () => {
    expect(neighboursForMove(items, 2, -4)).toEqual({ prev: null, next: 1000 });
    expect(neighboursForMove(items, 2, 99)).toEqual({ prev: 3000, next: null });
  });

  it("handles a single-item list", () => {
    expect(neighboursForMove([{ id: 1, order: 1000 }], 1, 0)).toEqual({
      prev: null,
      next: null,
    });
  });
});
