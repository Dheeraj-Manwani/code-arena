import * as contestRepo from "../repositories/contest.repository";
import * as submissionRepo from "../repositories/submission.repository";
import * as userRepo from "../repositories/user.repository";
import { ContestNotFoundError } from "../errors/contest.errors";
import { computeLeaderboard } from "./leaderboard.util";

export const getLeaderboard = async (contestId: number) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);

  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  const mcqSubmissions = await submissionRepo.getMcqSubmissionsByContest(
    contestId
  );

  const dsaSubmissions = await submissionRepo.getDsaSubmissionsByContest(
    contestId
  );

  const userIds = new Set<number>();
  for (const submission of mcqSubmissions) userIds.add(submission.userId);
  for (const submission of dsaSubmissions) userIds.add(submission.userId);

  const users = await userRepo.getUsersByIds(Array.from(userIds));

  return computeLeaderboard(mcqSubmissions, dsaSubmissions, users);
};
