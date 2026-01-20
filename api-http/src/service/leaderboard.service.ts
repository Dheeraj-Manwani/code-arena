import * as contestRepo from "../repositories/contest.repository";
import * as submissionRepo from "../repositories/submission.repository";
import * as userRepo from "../repositories/user.repository";
import { ContestNotFoundError } from "../errors/contest.errors";

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

  const userPointsMap = new Map<number, number>();
  const userIds = new Set<number>();

  for (const submission of mcqSubmissions) {
    userIds.add(submission.userId);
    const current = userPointsMap.get(submission.userId) || 0;
    userPointsMap.set(submission.userId, current + submission.pointsEarned);
  }

  const userProblemPointsMap = new Map<string, number>();
  for (const submission of dsaSubmissions) {
    userIds.add(submission.userId);
    const key = `${submission.userId}-${submission.problemId}`;
    const current = userProblemPointsMap.get(key) || 0;
    userProblemPointsMap.set(key, Math.max(current, submission.pointsEarned));
  }

  for (const [key, points] of userProblemPointsMap.entries()) {
    const userId = parseInt(key.split("-")[0]);
    const current = userPointsMap.get(userId) || 0;
    userPointsMap.set(userId, current + points);
  }

  const users = await userRepo.getUsersByIds(Array.from(userIds));

  const leaderboard = users
    .map((user) => ({
      userId: user.id,
      name: user.name,
      totalPoints: userPointsMap.get(user.id) || 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const finalLeaderboard: Array<{
    userId: number;
    name: string;
    totalPoints: number;
    rank: number;
  }> = [];

  let currentRank = 1;
  for (let i = 0; i < leaderboard.length; i++) {
    const entry = leaderboard[i];
    if (i > 0 && entry.totalPoints !== leaderboard[i - 1].totalPoints) {
      currentRank = i + 1;
    }
    finalLeaderboard.push({
      ...entry,
      rank: currentRank,
    });
  }

  return finalLeaderboard;
};
