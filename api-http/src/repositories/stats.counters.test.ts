/**
 * Catalogue counter folding (PRACTICE_MODE_AND_NAVIGATION.md §4.5).
 *
 * Two invariants are easy to get wrong and hard to notice once wrong, because a
 * drifted counter looks plausible:
 *  - `solvedBy` counts DISTINCT users, so re-solving must not increment it again;
 *  - `solved` is terminal, so a later wrong answer must not demote the user.
 *
 * Prisma is mocked — DB-free unit test of the branching.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const tx = {
  $executeRaw: vi.fn(),
  userProblemStatus: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  problemStat: {
    upsert: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("../lib/db", () => ({
  default: {
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<void>) => fn(tx)),
  },
}));

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { recordVerdictForStats, recordVerdictForStatsSafe } from "./stats.problem.repository";

const AT = new Date("2026-07-15T12:00:00.000Z");
const base = { userId: 1, problemId: 2, submittedAt: AT };

beforeEach(() => {
  vi.clearAllMocks();
  tx.problemStat.findUniqueOrThrow.mockResolvedValue({
    totalSubmissions: 4,
    acceptedSubmissions: 1,
  });
});

describe("recordVerdictForStats — first-ever submission", () => {
  beforeEach(() => {
    tx.userProblemStatus.findUnique.mockResolvedValue(null);
  });

  it("creates a solved status and counts the solve when accepted", async () => {
    await recordVerdictForStats({ ...base, isAccepted: true });

    expect(tx.problemStat.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ totalSubmissions: 1, acceptedSubmissions: 1, solvedBy: 1 }),
        update: expect.objectContaining({ solvedBy: { increment: 1 } }),
      }),
    );
    expect(tx.userProblemStatus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "solved", solvedAt: AT }),
      }),
    );
  });

  it("creates an attempted status and does not count a solve when rejected", async () => {
    await recordVerdictForStats({ ...base, isAccepted: false });

    const upsertArg = tx.problemStat.upsert.mock.calls[0][0];
    expect(upsertArg.create.solvedBy).toBe(0);
    expect(upsertArg.update.solvedBy).toBeUndefined();
    expect(upsertArg.update.acceptedSubmissions).toBeUndefined();

    expect(tx.userProblemStatus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "attempted", solvedAt: null }),
      }),
    );
  });
});

describe("recordVerdictForStats — solvedBy counts distinct users", () => {
  it("does NOT increment solvedBy when the user had already solved it", async () => {
    tx.userProblemStatus.findUnique.mockResolvedValue({ status: "solved" });

    await recordVerdictForStats({ ...base, isAccepted: true });

    const upsertArg = tx.problemStat.upsert.mock.calls[0][0];
    // Still a submission, and still an accepted one...
    expect(upsertArg.update.totalSubmissions).toEqual({ increment: 1 });
    expect(upsertArg.update.acceptedSubmissions).toEqual({ increment: 1 });
    // ...but not a new distinct solver.
    expect(upsertArg.update.solvedBy).toBeUndefined();
  });

  it("increments solvedBy on a previously-attempting user's first accept", async () => {
    tx.userProblemStatus.findUnique.mockResolvedValue({ status: "attempted" });

    await recordVerdictForStats({ ...base, isAccepted: true });

    expect(tx.problemStat.upsert.mock.calls[0][0].update.solvedBy).toEqual({ increment: 1 });
    expect(tx.userProblemStatus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "solved", solvedAt: AT },
      }),
    );
  });
});

describe("recordVerdictForStats — solved is terminal", () => {
  it("does not demote a solved user after a later wrong answer", async () => {
    tx.userProblemStatus.findUnique.mockResolvedValue({ status: "solved" });

    await recordVerdictForStats({ ...base, isAccepted: false });

    expect(tx.userProblemStatus.update).not.toHaveBeenCalled();
    expect(tx.userProblemStatus.create).not.toHaveBeenCalled();
  });

  it("leaves an attempted user attempted after another wrong answer", async () => {
    tx.userProblemStatus.findUnique.mockResolvedValue({ status: "attempted" });

    await recordVerdictForStats({ ...base, isAccepted: false });

    expect(tx.userProblemStatus.update).not.toHaveBeenCalled();
  });
});

describe("recordVerdictForStats — concurrency and derived rate", () => {
  it("takes a per-(user, problem) advisory lock so concurrent accepts can't double-count", async () => {
    tx.userProblemStatus.findUnique.mockResolvedValue(null);

    await recordVerdictForStats({ ...base, isAccepted: true });

    expect(tx.$executeRaw).toHaveBeenCalled();
  });

  it("recomputes acceptanceRate from the post-update counters", async () => {
    tx.userProblemStatus.findUnique.mockResolvedValue(null);
    tx.problemStat.findUniqueOrThrow.mockResolvedValue({
      totalSubmissions: 4,
      acceptedSubmissions: 1,
    });

    await recordVerdictForStats({ ...base, isAccepted: true });

    expect(tx.problemStat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { acceptanceRate: 0.25 } }),
    );
  });

  it("reports a zero rate rather than dividing by zero", async () => {
    tx.userProblemStatus.findUnique.mockResolvedValue(null);
    tx.problemStat.findUniqueOrThrow.mockResolvedValue({
      totalSubmissions: 0,
      acceptedSubmissions: 0,
    });

    await recordVerdictForStats({ ...base, isAccepted: false });

    expect(tx.problemStat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { acceptanceRate: 0 } }),
    );
  });
});

describe("recordVerdictForStatsSafe", () => {
  it("swallows failures — a counter must never cost a user their verdict", async () => {
    tx.userProblemStatus.findUnique.mockRejectedValue(new Error("db down"));

    await expect(recordVerdictForStatsSafe({ ...base, isAccepted: true })).resolves.toBeUndefined();
  });
});
