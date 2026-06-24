/**
 * Pure leaderboard ranking logic — no DB / network access, so it is unit-testable.
 *
 * Scoring rules (kept identical to the previous inline implementation):
 * - MCQ points are summed per user.
 * - DSA points take the MAX points earned per (user, problem) — supports re-submission.
 * - Users are ranked by total points descending; equal totals share a rank
 *   ("standard competition ranking": 1, 1, 3, ...).
 *
 * NOTE: there is intentionally no tiebreaker beyond equal rank yet — see issues.md §4.3.
 */

export interface McqPoints {
  userId: number;
  pointsEarned: number;
}

export interface DsaPoints {
  userId: number;
  problemId: number;
  pointsEarned: number;
}

export interface LeaderboardUser {
  id: number;
  name: string;
}

export interface LeaderboardEntry {
  userId: number;
  name: string;
  totalPoints: number;
  rank: number;
}

export function computeLeaderboard(
  mcqSubmissions: McqPoints[],
  dsaSubmissions: DsaPoints[],
  users: LeaderboardUser[]
): LeaderboardEntry[] {
  const userPointsMap = new Map<number, number>();
  const userIds = new Set<number>();

  for (const submission of mcqSubmissions) {
    userIds.add(submission.userId);
    const current = userPointsMap.get(submission.userId) || 0;
    userPointsMap.set(submission.userId, current + submission.pointsEarned);
  }

  // MAX points per (user, problem) for DSA — best submission counts.
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

  const sorted = users
    .map((user) => ({
      userId: user.id,
      name: user.name,
      totalPoints: userPointsMap.get(user.id) || 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const finalLeaderboard: LeaderboardEntry[] = [];

  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    if (i > 0 && entry.totalPoints !== sorted[i - 1].totalPoints) {
      currentRank = i + 1;
    }
    finalLeaderboard.push({ ...entry, rank: currentRank });
  }

  return finalLeaderboard;
}
