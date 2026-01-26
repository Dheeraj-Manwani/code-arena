import * as profileRepo from "../repositories/profile.repository";
import { UserNotFoundError } from "../errors/auth.errors";
import type { ProfileResponse } from "../schema/profile.schema";
import { AttemptStatus } from "@prisma/client";

function getMaxPointsForAttempt(
  questions: Array<{ mcq: { points: number } | null; dsa: { points: number } | null }>,
): number {
  return questions.reduce(
    (sum, q) => sum + (q.mcq?.points ?? q.dsa?.points ?? 0),
    0,
  );
}

export const getProfile = async (userId: number): Promise<ProfileResponse> => {
  const [user, attempts, leaderboardRanks] = await Promise.all([
    profileRepo.getProfileUser(userId),
    profileRepo.getAttemptsWithContestForProfile(userId),
    profileRepo.getLeaderboardRanksForUser(userId),
  ]);

  if (!user) {
    throw new UserNotFoundError();
  }

  const contestIdsByType = { competitive: new Set<number>(), practice: new Set<number>() };
  let totalCompleted = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const a of attempts) {
    const maxPoints = getMaxPointsForAttempt(a.contest.questions);
    if (a.contest.type === "competitive") {
      contestIdsByType.competitive.add(a.contestId);
    } else {
      contestIdsByType.practice.add(a.contestId);
    }
    if (a.status === AttemptStatus.submitted || a.status === AttemptStatus.timed_out) {
      totalCompleted += 1;
      if (maxPoints > 0) {
        scoreSum += (a.totalPoints / maxPoints) * 100;
        scoreCount += 1;
      }
    }
  }

  const totalParticipated = new Set(attempts.map((a) => a.contestId)).size;
  const competitiveContests = contestIdsByType.competitive.size;
  const practiceContests = contestIdsByType.practice.size;
  const bestRank =
    leaderboardRanks.length > 0
      ? Math.min(...leaderboardRanks.map((r) => r.rank))
      : 0;
  const averageScore = scoreCount > 0 ? scoreSum / scoreCount : 0;

  const recentAttempts = attempts.slice(0, 5).map((a) => {
    const maxPoints = getMaxPointsForAttempt(a.contest.questions);
    return {
      id: a.id,
      contestTitle: a.contest.title,
      startedAt: a.startedAt.toISOString(),
      status: a.status,
      totalPoints: a.totalPoints,
      maxPoints: maxPoints || 1,
    };
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      stats: {
        totalContestsParticipated: totalParticipated,
        totalContestsCompleted: totalCompleted,
        averageScore: Math.round(averageScore * 10) / 10,
        bestRank,
        competitiveContests,
        practiceContests,
      },
    },
    recentAttempts,
  };
};
