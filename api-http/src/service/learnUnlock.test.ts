import { describe, it, expect } from "vitest";
import { moduleGate, gateModules } from "./learnUnlock";

const gate = (
  input: Partial<Parameters<typeof moduleGate>[0]>,
  threshold = 0.6,
) =>
  moduleGate(
    { index: 1, previousCompleted: 0, previousTotal: 10, ...input },
    threshold,
  );

describe("moduleGate", () => {
  it("always unlocks the first module", () => {
    expect(gate({ index: 0, previousCompleted: 0, previousTotal: 0 })).toEqual({
      unlocked: true,
    });
  });

  it("locks a module when the previous one is untouched", () => {
    expect(gate({ previousCompleted: 0, previousTotal: 10 })).toEqual({
      unlocked: false,
      progress: 0,
      required: 0.6,
    });
  });

  it("unlocks once the threshold is met", () => {
    expect(gate({ previousCompleted: 6, previousTotal: 10 })).toEqual({ unlocked: true });
  });

  it("stays locked just below the threshold", () => {
    expect(gate({ previousCompleted: 5, previousTotal: 10 }).unlocked).toBe(false);
  });

  // 3/5 is 0.6000000000000001 in IEEE754. Without the epsilon a user who did
  // exactly enough is told they haven't, which is indistinguishable from a bug.
  it("treats a float-imprecise exact match as met", () => {
    expect(gate({ previousCompleted: 3, previousTotal: 5 }, 0.6)).toEqual({
      unlocked: true,
    });
  });

  it("unlocks everything when the threshold is 0", () => {
    expect(gate({ previousCompleted: 0, previousTotal: 10 }, 0)).toEqual({
      unlocked: true,
    });
  });

  // An empty module a curator hasn't filled yet must not wall off the path.
  it("does not let an empty previous module act as a barrier", () => {
    expect(gate({ previousCompleted: 0, previousTotal: 0 })).toEqual({ unlocked: true });
  });

  describe("monotonicity (§5.4)", () => {
    // The rule that makes gating safe to combine with a growing curriculum:
    // once unlocked, never re-locked.
    it("stays unlocked when the previous module grows underneath the user", () => {
      const unlockedAt = new Date("2026-01-01");

      // 6/10 met the threshold; a curator then adds 20 questions, so the same
      // user is now at 6/30 = 0.2.
      expect(
        gate({ previousCompleted: 6, previousTotal: 30, unlockedAt }),
      ).toEqual({ unlocked: true });
    });

    it("stays unlocked when the threshold is raised", () => {
      expect(
        gate({ previousCompleted: 6, previousTotal: 10, unlockedAt: new Date() }, 0.95),
      ).toEqual({ unlocked: true });
    });

    it("locks when there is no stored unlock and the threshold is unmet", () => {
      expect(gate({ previousCompleted: 1, previousTotal: 10, unlockedAt: null }).unlocked).toBe(
        false,
      );
    });
  });
});

describe("gateModules", () => {
  const mods = (counts: Array<[number, number]>) =>
    counts.map(([completed, total]) => ({ completed, total }));

  it("gates each module on the one before it", () => {
    const result = gateModules(mods([[10, 10], [3, 10], [0, 10]]), 0.6);

    expect(result[0]).toEqual({ unlocked: true }); // first
    expect(result[1]).toEqual({ unlocked: true }); // previous 10/10
    expect(result[2].unlocked).toBe(false); // previous 3/10
  });

  // Deliberate: the gate reflects demonstrated readiness, not a permission
  // chain. Someone who jumped ahead and finished module 2 has earned module 3
  // even though module 1 is untouched.
  it("does not chain — a completed module unlocks the next even if earlier ones are locked", () => {
    const result = gateModules(mods([[0, 10], [0, 10], [10, 10], [0, 10]]), 0.6);

    expect(result[1].unlocked).toBe(false); // previous 0/10
    expect(result[2].unlocked).toBe(false); // previous 0/10
    expect(result[3]).toEqual({ unlocked: true }); // previous 10/10
  });

  it("returns one gate per module", () => {
    expect(gateModules(mods([[0, 1], [0, 1], [0, 1]]), 0.6)).toHaveLength(3);
  });

  it("handles an empty path", () => {
    expect(gateModules([], 0.6)).toEqual([]);
  });

  it("respects a stored unlock inside the walk", () => {
    const result = gateModules(
      [
        { completed: 0, total: 10 },
        { completed: 0, total: 10, unlockedAt: new Date() },
      ],
      0.6,
    );

    expect(result[1]).toEqual({ unlocked: true });
  });
});
