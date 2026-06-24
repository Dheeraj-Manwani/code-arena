import { describe, it, expect } from "vitest";
import { computeLeaderboard } from "./leaderboard.util";

const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
];

describe("computeLeaderboard", () => {
  it("ranks users by total points descending", () => {
    const board = computeLeaderboard(
      [
        { userId: 1, pointsEarned: 10 },
        { userId: 2, pointsEarned: 30 },
        { userId: 3, pointsEarned: 20 },
      ],
      [],
      users
    );

    expect(board.map((e) => e.userId)).toEqual([2, 3, 1]);
    expect(board.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(board.map((e) => e.totalPoints)).toEqual([30, 20, 10]);
  });

  it("sums MCQ points per user", () => {
    const board = computeLeaderboard(
      [
        { userId: 1, pointsEarned: 5 },
        { userId: 1, pointsEarned: 7 },
      ],
      [],
      [{ id: 1, name: "Alice" }]
    );

    expect(board[0].totalPoints).toBe(12);
  });

  it("takes MAX points per (user, problem) for DSA re-submissions", () => {
    const board = computeLeaderboard(
      [],
      [
        { userId: 1, problemId: 100, pointsEarned: 40 }, // first try, partial
        { userId: 1, problemId: 100, pointsEarned: 100 }, // re-submit, full
        { userId: 1, problemId: 100, pointsEarned: 0 }, // later wrong answer
      ],
      [{ id: 1, name: "Alice" }]
    );

    // Best (100), not sum (140) or last (0).
    expect(board[0].totalPoints).toBe(100);
  });

  it("sums DSA points across distinct problems", () => {
    const board = computeLeaderboard(
      [],
      [
        { userId: 1, problemId: 100, pointsEarned: 50 },
        { userId: 1, problemId: 200, pointsEarned: 70 },
      ],
      [{ id: 1, name: "Alice" }]
    );

    expect(board[0].totalPoints).toBe(120);
  });

  it("combines MCQ and DSA points for the same user", () => {
    const board = computeLeaderboard(
      [{ userId: 1, pointsEarned: 15 }],
      [{ userId: 1, problemId: 100, pointsEarned: 85 }],
      [{ id: 1, name: "Alice" }]
    );

    expect(board[0].totalPoints).toBe(100);
  });

  it("includes users with zero points and ranks them last", () => {
    const board = computeLeaderboard(
      [{ userId: 1, pointsEarned: 50 }],
      [],
      users // Bob and Charlie have no submissions
    );

    expect(board).toHaveLength(3);
    const bob = board.find((e) => e.userId === 2)!;
    const charlie = board.find((e) => e.userId === 3)!;
    expect(bob.totalPoints).toBe(0);
    expect(charlie.totalPoints).toBe(0);
    expect(board[0].userId).toBe(1);
  });

  it("assigns equal rank to ties using standard competition ranking (1,1,3)", () => {
    const board = computeLeaderboard(
      [
        { userId: 1, pointsEarned: 50 },
        { userId: 2, pointsEarned: 50 },
        { userId: 3, pointsEarned: 10 },
      ],
      [],
      users
    );

    const ranks = new Map(board.map((e) => [e.userId, e.rank]));
    expect(ranks.get(1)).toBe(1);
    expect(ranks.get(2)).toBe(1);
    expect(ranks.get(3)).toBe(3); // rank 2 is skipped after the tie
  });

  it("returns an empty board when there are no users", () => {
    expect(computeLeaderboard([], [], [])).toEqual([]);
  });

  it("ranks all-zero users at rank 1 (all tied)", () => {
    const board = computeLeaderboard([], [], users);
    expect(board.every((e) => e.rank === 1)).toBe(true);
    expect(board.every((e) => e.totalPoints === 0)).toBe(true);
  });
});
