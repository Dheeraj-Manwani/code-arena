/**
 * Ownership-guard coverage for contest mutations (issues.md §3.3, ROADMAP Sprint 2).
 * The repositories are mocked so this stays a pure, DB-free unit test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/contest.repository", () => ({
  getContestById: vi.fn(),
}));

vi.mock("../repositories/problem.repository", () => ({
  reorderContestQuestions: vi.fn(),
  unlinkMcqFromContest: vi.fn(),
  unlinkDsaFromContest: vi.fn(),
  linkMcqToContest: vi.fn(),
  linkDsaToContest: vi.fn(),
  getMcqQuestionById: vi.fn(),
  getDsaProblemById: vi.fn(),
  getMaxQuestionOrder: vi.fn(),
}));

import * as contestRepo from "../repositories/contest.repository";
import * as problemRepo from "../repositories/problem.repository";
import {
  reorderContestQuestions,
  unlinkMcqFromContest,
  unlinkDsaFromContest,
  linkMcqToContest,
} from "./contest.service";
import { ForbiddenError, ContestNotFoundError } from "../errors/contest.errors";

const OWNER_ID = 1;
const OTHER_ID = 2;
const CONTEST_ID = 10;

const ownedContest = { id: CONTEST_ID, creatorId: OWNER_ID } as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("contest mutation ownership guard", () => {
  it("reorder: throws ContestNotFoundError when the contest does not exist", async () => {
    (contestRepo.getContestById as any).mockResolvedValue(null);

    await expect(
      reorderContestQuestions(CONTEST_ID, [], OWNER_ID),
    ).rejects.toBeInstanceOf(ContestNotFoundError);
    expect(problemRepo.reorderContestQuestions).not.toHaveBeenCalled();
  });

  it("reorder: throws ForbiddenError when a non-owner reorders", async () => {
    (contestRepo.getContestById as any).mockResolvedValue(ownedContest);

    await expect(
      reorderContestQuestions(CONTEST_ID, [], OTHER_ID),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(problemRepo.reorderContestQuestions).not.toHaveBeenCalled();
  });

  it("reorder: proceeds for the owner", async () => {
    (contestRepo.getContestById as any).mockResolvedValue(ownedContest);
    const orders = [{ id: 1, isMcq: true, order: 0 }];

    await reorderContestQuestions(CONTEST_ID, orders, OWNER_ID);
    expect(problemRepo.reorderContestQuestions).toHaveBeenCalledWith(CONTEST_ID, orders);
  });

  it("unlink mcq: blocks a non-owner", async () => {
    (contestRepo.getContestById as any).mockResolvedValue(ownedContest);

    await expect(
      unlinkMcqFromContest(CONTEST_ID, 5, OTHER_ID),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(problemRepo.unlinkMcqFromContest).not.toHaveBeenCalled();
  });

  it("unlink dsa: blocks a non-owner", async () => {
    (contestRepo.getContestById as any).mockResolvedValue(ownedContest);

    await expect(
      unlinkDsaFromContest(CONTEST_ID, 5, OTHER_ID),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(problemRepo.unlinkDsaFromContest).not.toHaveBeenCalled();
  });

  it("link mcq: blocks a non-owner before touching the question", async () => {
    (contestRepo.getContestById as any).mockResolvedValue(ownedContest);

    await expect(
      linkMcqToContest(CONTEST_ID, 5, 0, OTHER_ID),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(problemRepo.getMcqQuestionById).not.toHaveBeenCalled();
    expect(problemRepo.linkMcqToContest).not.toHaveBeenCalled();
  });

  it("link mcq: proceeds for the owner", async () => {
    (contestRepo.getContestById as any).mockResolvedValue(ownedContest);
    (problemRepo.getMcqQuestionById as any).mockResolvedValue({ id: 5 });

    await linkMcqToContest(CONTEST_ID, 5, 0, OWNER_ID);
    expect(problemRepo.linkMcqToContest).toHaveBeenCalledWith(CONTEST_ID, 5, 0);
  });
});
