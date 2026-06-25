/**
 * Pure leaderboard ranking logic — no DB / network access, so it is unit-testable.
 *
 * Scoring rules:
 * - MCQ points are summed per user.
 * - DSA points take the MAX points earned per (user, problem) — supports re-submission.
 * - Users are ranked by total points descending.
 * - Ties on total points break by *earliest time-to-last-accepted-submission*
 *   (issues.md §4.3): the user who locked in their total soonest ranks higher.
 *   Only users with the same total AND the same lock-in time share a rank
 *   ("standard competition ranking": 1, 1, 3, ...). Users who never scored have no
 *   lock-in time and (being all 0 points) remain tied.
 *
 * `submittedAt` is optional so callers/tests without timing data still get the
 * points-only ranking; when present it drives the tiebreaker.
 */

type Timestamp = Date | string | number;

const toMs = (t: Timestamp): number =>
  t instanceof Date ? t.getTime() : new Date(t).getTime();

export interface McqPoints {
  userId: number;
  pointsEarned: number;
  submittedAt?: Timestamp;
}

export interface DsaPoints {
  userId: number;
  problemId: number;
  pointsEarned: number;
  submittedAt?: Timestamp;
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

/** Track the time a user reaches a score component; we keep the latest such time. */
function noteScoringTime(map: Map<number, number>, userId: number, at: number): void {
  const prev = map.get(userId);
  if (prev === undefined || at > prev) {
    map.set(userId, at);
  }
}

export function computeLeaderboard(
  mcqSubmissions: McqPoints[],
  dsaSubmissions: DsaPoints[],
  users: LeaderboardUser[]
): LeaderboardEntry[] {
  const userPointsMap = new Map<number, number>();
  // Per user, the time they locked in their final score (latest score-earning submission).
  const lockInTimeMap = new Map<number, number>();

  for (const submission of mcqSubmissions) {
    const current = userPointsMap.get(submission.userId) || 0;
    userPointsMap.set(submission.userId, current + submission.pointsEarned);
    if (submission.pointsEarned > 0 && submission.submittedAt !== undefined) {
      noteScoringTime(lockInTimeMap, submission.userId, toMs(submission.submittedAt));
    }
  }

  // For DSA: MAX points per (user, problem) — best submission counts — and the
  // EARLIEST submission that first achieved that max (when the score was locked).
  const bestPointsByUserProblem = new Map<string, number>();
  const bestTimeByUserProblem = new Map<string, number>();
  for (const submission of dsaSubmissions) {
    const key = `${submission.userId}-${submission.problemId}`;
    const prevBest = bestPointsByUserProblem.get(key) ?? -1;
    const at = submission.submittedAt !== undefined ? toMs(submission.submittedAt) : undefined;

    if (submission.pointsEarned > prevBest) {
      bestPointsByUserProblem.set(key, submission.pointsEarned);
      if (at !== undefined) bestTimeByUserProblem.set(key, at);
      else bestTimeByUserProblem.delete(key);
    } else if (submission.pointsEarned === prevBest && at !== undefined) {
      // Same (max) score reached again — keep the earliest time it was achieved.
      const prevTime = bestTimeByUserProblem.get(key);
      if (prevTime === undefined || at < prevTime) bestTimeByUserProblem.set(key, at);
    }
  }

  for (const [key, points] of bestPointsByUserProblem.entries()) {
    const userId = parseInt(key.split("-")[0]);
    const current = userPointsMap.get(userId) || 0;
    userPointsMap.set(userId, current + points);
    const at = bestTimeByUserProblem.get(key);
    if (points > 0 && at !== undefined) {
      noteScoringTime(lockInTimeMap, userId, at);
    }
  }

  const sorted = users
    .map((user) => ({
      userId: user.id,
      name: user.name,
      totalPoints: userPointsMap.get(user.id) || 0,
      lockInTime: lockInTimeMap.get(user.id) ?? null,
    }))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      // Earlier lock-in wins; a user with no recorded time sorts after one with a time.
      const at = a.lockInTime ?? Number.POSITIVE_INFINITY;
      const bt = b.lockInTime ?? Number.POSITIVE_INFINITY;
      return at - bt;
    });

  const finalLeaderboard: LeaderboardEntry[] = [];

  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const prev = sorted[i - 1];
    // A new rank begins when total points OR lock-in time differs from the previous.
    if (i > 0 && (entry.totalPoints !== prev.totalPoints || entry.lockInTime !== prev.lockInTime)) {
      currentRank = i + 1;
    }
    finalLeaderboard.push({
      userId: entry.userId,
      name: entry.name,
      totalPoints: entry.totalPoints,
      rank: currentRank,
    });
  }

  return finalLeaderboard;
}
