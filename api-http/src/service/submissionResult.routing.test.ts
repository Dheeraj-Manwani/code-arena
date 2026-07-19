/**
 * Verdict routing: contest verdicts score an attempt and reach a contest room;
 * practice verdicts do neither (PRACTICE_MODE_AND_NAVIGATION.md §4.1/§4.2).
 *
 * The load-bearing assertion is the negative one — a practice submission must
 * never increment an attempt score or emit a leaderboard-visible event. That is
 * the whole reason practice got its own table instead of nullable contest FKs,
 * and it's the regression that would silently corrupt contest rankings.
 *
 * Repositories and the bus are mocked — DB-free unit test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/submission.repository", () => ({
  applyDsaVerdict: vi.fn(),
}));

vi.mock("../repositories/attempt.repository", () => ({
  incrementAttemptScore: vi.fn(),
}));

vi.mock("../repositories/practice.repository", () => ({
  applyPracticeVerdict: vi.fn(),
}));

vi.mock("../realtime/bus", () => ({
  bus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import * as submissionRepo from "../repositories/submission.repository";
import * as attemptRepo from "../repositories/attempt.repository";
import * as practiceRepo from "../repositories/practice.repository";
import { bus } from "../realtime/bus";
import { applyJobResult } from "./submissionResult.service";
import type { UpdateSubmissionPayload } from "../schema/job.schema";

const acceptedVerdict: UpdateSubmissionPayload = {
  status: "accepted",
  pointsEarned: 100,
  testCasesPassed: 5,
  totalTestCases: 5,
  executionTime: 42,
};

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(submissionRepo.applyDsaVerdict).mockResolvedValue({
    id: 7,
    userId: 3,
    attemptId: 11,
    pointsEarned: 100,
    testCasesPassed: 5,
    totalTestCases: 5,
    attempt: { contestId: 9 },
  } as never);

  vi.mocked(practiceRepo.applyPracticeVerdict).mockResolvedValue({
    id: 21,
    userId: 3,
    problemId: 5,
    testCasesPassed: 5,
    totalTestCases: 5,
  } as never);
});

describe("applyJobResult — contest target", () => {
  it("writes the verdict and increments the attempt score", async () => {
    await applyJobResult(
      { kind: "contest", dsaSubmissionId: 7, attemptId: 11, contestId: 9 },
      acceptedVerdict,
    );

    expect(submissionRepo.applyDsaVerdict).toHaveBeenCalledWith(7, acceptedVerdict);
    expect(attemptRepo.incrementAttemptScore).toHaveBeenCalledWith(11, 100);
  });

  it("emits a contest-scoped event carrying the contestId for room fan-out", async () => {
    await applyJobResult(
      { kind: "contest", dsaSubmissionId: 7, attemptId: 11, contestId: 9 },
      acceptedVerdict,
    );

    expect(bus.emit).toHaveBeenCalledWith(
      "submission_result",
      expect.objectContaining({ scope: "contest", contestId: 9, userId: 3, pointsEarned: 100 }),
    );
  });

  it("skips the score increment for a zero-point verdict", async () => {
    await applyJobResult(
      { kind: "contest", dsaSubmissionId: 7, attemptId: 11, contestId: 9 },
      { ...acceptedVerdict, status: "wrong_answer", pointsEarned: 0 },
    );

    expect(attemptRepo.incrementAttemptScore).not.toHaveBeenCalled();
  });
});

describe("applyJobResult — practice target", () => {
  it("writes to the practice table, never the contest one", async () => {
    await applyJobResult({ kind: "practice", practiceSubmissionId: 21 }, acceptedVerdict);

    expect(practiceRepo.applyPracticeVerdict).toHaveBeenCalledTimes(1);
    expect(submissionRepo.applyDsaVerdict).not.toHaveBeenCalled();
  });

  it("never increments an attempt score, even for an accepted verdict worth points", async () => {
    // The guarantee: practice cannot move a contest ranking.
    await applyJobResult({ kind: "practice", practiceSubmissionId: 21 }, acceptedVerdict);

    expect(attemptRepo.incrementAttemptScore).not.toHaveBeenCalled();
  });

  it("drops pointsEarned — practice is unscored", async () => {
    await applyJobResult({ kind: "practice", practiceSubmissionId: 21 }, acceptedVerdict);

    const [, payload] = vi.mocked(practiceRepo.applyPracticeVerdict).mock.calls[0];
    expect(payload).not.toHaveProperty("pointsEarned");

    const [, event] = vi.mocked(bus.emit).mock.calls[0];
    expect(event).not.toHaveProperty("pointsEarned");
  });

  it("emits a practice-scoped event with no contestId to fan out to", async () => {
    await applyJobResult({ kind: "practice", practiceSubmissionId: 21 }, acceptedVerdict);

    const [, event] = vi.mocked(bus.emit).mock.calls[0];
    expect(event).toMatchObject({ scope: "practice", practiceSubmissionId: 21, userId: 3 });
    expect(event).not.toHaveProperty("contestId");
  });
});
