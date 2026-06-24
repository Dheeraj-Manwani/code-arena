/**
 * Attempt-lifecycle coverage for Sprint 4 (issues.md §4.4/§4.5/§2.1).
 * Repositories and the judge queue are mocked so this stays a pure, DB-free unit test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/contest.repository", () => ({
  getContestById: vi.fn(),
}));

vi.mock("../repositories/attempt.repository", () => ({
  createCompetitiveAttempt: vi.fn(),
  getOrCreateContestAttempt: vi.fn(),
  getContestAttemptById: vi.fn(),
  applyAttemptTimeout: vi.fn(),
  markAttemptSubmitted: vi.fn(),
}));

vi.mock("../repositories/submission.repository", () => ({}));
vi.mock("../lib/judgeQueue", () => ({ enqueueJudgeJob: vi.fn() }));

import * as contestRepo from "../repositories/contest.repository";
import * as attemptRepo from "../repositories/attempt.repository";
import { createAttempt, submitContest } from "./submission.service";
import { AttemptLimitReachedError } from "../errors/contest.errors";
import { AttemptDeadlinePassedError, AttemptNotFoundError } from "../errors/submission.errors";

const USER_ID = 1;
const CONTEST_ID = 10;
const ATTEMPT_ID = 100;

const competitiveContest = {
  id: CONTEST_ID,
  type: "competitive",
  status: "published",
  startTime: new Date(Date.now() - 60_000),
  endTime: new Date(Date.now() + 3_600_000),
} as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAttempt — competitive attempt limit (issues.md §4.4)", () => {
  it("throws AttemptLimitReachedError when the atomic create returns null", async () => {
    (contestRepo.getContestById as any).mockResolvedValue(competitiveContest);
    (attemptRepo.createCompetitiveAttempt as any).mockResolvedValue(null);

    await expect(createAttempt(CONTEST_ID, USER_ID)).rejects.toBeInstanceOf(
      AttemptLimitReachedError
    );
  });

  it("returns the new attempt id when the atomic create succeeds", async () => {
    (contestRepo.getContestById as any).mockResolvedValue(competitiveContest);
    (attemptRepo.createCompetitiveAttempt as any).mockResolvedValue({ id: ATTEMPT_ID });

    await expect(createAttempt(CONTEST_ID, USER_ID)).resolves.toBe(ATTEMPT_ID);
    expect(attemptRepo.createCompetitiveAttempt).toHaveBeenCalledWith(
      USER_ID,
      CONTEST_ID,
      competitiveContest.endTime
    );
  });
});

describe("submitContest — deadline enforcement (issues.md §4.5/§2.1)", () => {
  const inProgressAttempt = {
    id: ATTEMPT_ID,
    contestId: CONTEST_ID,
    userId: USER_ID,
    status: "in_progress",
    startedAt: new Date(Date.now() - 1000),
    deadlineAt: new Date(Date.now() + 1000),
  } as any;

  it("rejects with AttemptDeadlinePassedError when the attempt has expired", async () => {
    (attemptRepo.getContestAttemptById as any).mockResolvedValue(inProgressAttempt);
    // Lazy timeout flips the expired attempt to timed_out.
    (attemptRepo.applyAttemptTimeout as any).mockResolvedValue("timed_out");

    await expect(submitContest(CONTEST_ID, ATTEMPT_ID, USER_ID)).rejects.toBeInstanceOf(
      AttemptDeadlinePassedError
    );
    expect(attemptRepo.markAttemptSubmitted).not.toHaveBeenCalled();
  });

  it("submits successfully when the attempt is still in progress", async () => {
    (attemptRepo.getContestAttemptById as any).mockResolvedValue(inProgressAttempt);
    (attemptRepo.applyAttemptTimeout as any).mockResolvedValue("in_progress");
    (attemptRepo.markAttemptSubmitted as any).mockResolvedValue(true);

    await expect(submitContest(CONTEST_ID, ATTEMPT_ID, USER_ID)).resolves.toEqual({
      success: true,
    });
  });

  it("throws AttemptNotFoundError for an attempt that isn't the user's", async () => {
    (attemptRepo.getContestAttemptById as any).mockResolvedValue({
      ...inProgressAttempt,
      userId: 999,
    });

    await expect(submitContest(CONTEST_ID, ATTEMPT_ID, USER_ID)).rejects.toBeInstanceOf(
      AttemptNotFoundError
    );
  });
});
