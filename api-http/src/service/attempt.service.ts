import * as attemptRepo from "../repositories/attempt.repository";
import * as submissionRepo from "../repositories/submission.repository";
import { getLeaderboard } from "./leaderboard.service";
import { AttemptNotFoundError } from "../errors/submission.errors";
import type {
  AttemptListResponse,
  AttemptResultQuestion,
  AttemptResultResponse,
} from "../schema/attempt.schema";

type QuestionPoints = {
  mcq: { points: number } | null;
  dsa: { points: number } | null;
};

const sumMaxPoints = (questions: QuestionPoints[]): number =>
  questions.reduce((sum, q) => sum + (q.mcq?.points ?? q.dsa?.points ?? 0), 0);

export const getUserAttempts = async (
  userId: number,
  page: number,
  limit: number,
): Promise<AttemptListResponse> => {
  const skip = (page - 1) * limit;

  const [attempts, total] = await Promise.all([
    attemptRepo.getAttemptsForUserPaginated(userId, skip, limit),
    attemptRepo.countAttemptsForUser(userId),
  ]);

  const attemptIds = attempts.map((a) => a.id);
  const contestIds = [...new Set(attempts.map((a) => a.contestId))];

  const [mcqSubs, dsaSubs, ranks] = await Promise.all([
    submissionRepo.getMcqSubmissionsByAttemptIds(attemptIds),
    submissionRepo.getDsaSubmissionsByAttemptIds(attemptIds),
    attemptRepo.getLeaderboardRanksForUserContests(userId, contestIds),
  ]);

  // Score per attempt = MCQ points + DSA points. MCQ is unique per (attempt,
  // question), so a plain sum is correct. DSA allows re-submission (issues.md
  // §4.2), so we first take MAX(pointsEarned) per (attempt, problem) before summing.
  const pointsByAttempt = new Map<number, number>();
  for (const s of mcqSubs) {
    pointsByAttempt.set(s.attemptId, (pointsByAttempt.get(s.attemptId) ?? 0) + s.pointsEarned);
  }
  const bestDsaByAttemptProblem = new Map<string, number>();
  for (const s of dsaSubs) {
    const key = `${s.attemptId}:${s.problemId}`;
    const prev = bestDsaByAttemptProblem.get(key) ?? 0;
    if (s.pointsEarned > prev) bestDsaByAttemptProblem.set(key, s.pointsEarned);
  }
  for (const [key, points] of bestDsaByAttemptProblem) {
    const attemptId = Number(key.split(":")[0]);
    pointsByAttempt.set(attemptId, (pointsByAttempt.get(attemptId) ?? 0) + points);
  }

  const rankByContest = new Map(ranks.map((r) => [r.contestId, r.rank]));

  return {
    attempts: attempts.map((a) => ({
      id: a.id,
      contestId: a.contestId,
      contestTitle: a.contest.title,
      contestType: a.contest.type,
      status: a.status,
      startedAt: a.startedAt.toISOString(),
      submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
      durationMs: a.durationMs ?? null,
      totalPoints: pointsByAttempt.get(a.id) ?? 0,
      maxPoints: sumMaxPoints(a.contest.questions),
      rank: rankByContest.get(a.contestId) ?? null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getAttemptResults = async (
  attemptId: number,
  userId: number,
): Promise<AttemptResultResponse> => {
  const attempt = await attemptRepo.getAttemptWithContestQuestions(attemptId);

  if (!attempt || attempt.userId !== userId) {
    throw new AttemptNotFoundError();
  }

  const [mcqSubs, dsaSubs] = await Promise.all([
    submissionRepo.getMcqSubmissionsByAttemptId(attemptId),
    submissionRepo.getDsaSubmissionsByAttemptId(attemptId),
  ]);

  const mcqByQuestion = new Map(mcqSubs.map((s) => [s.questionId, s]));

  // DSA allows re-submission (issues.md §4.2): keep the best submission per problem
  // — highest pointsEarned, tie-broken by the most recent attempt.
  type DsaSub = (typeof dsaSubs)[number];
  const dsaByProblem = new Map<number, DsaSub>();
  for (const s of dsaSubs) {
    const prev = dsaByProblem.get(s.problemId);
    if (
      !prev ||
      s.pointsEarned > prev.pointsEarned ||
      (s.pointsEarned === prev.pointsEarned && s.submittedAt > prev.submittedAt)
    ) {
      dsaByProblem.set(s.problemId, s);
    }
  }

  const questions: AttemptResultQuestion[] = attempt.contest.questions.map((q) => {
    if (q.mcq) {
      const sub = mcqByQuestion.get(q.mcq.id);
      return {
        contestQuestionId: q.id,
        order: q.order,
        type: "mcq" as const,
        title: q.mcq.questionText,
        points: q.mcq.points,
        pointsEarned: sub?.pointsEarned ?? 0,
        attempted: sub != null,
        verdict: sub == null ? "not_attempted" : sub.isCorrect ? "correct" : "incorrect",
      };
    }

    // DSA question
    const dsa = q.dsa;
    const sub = dsa ? dsaByProblem.get(dsa.id) : undefined;
    return {
      contestQuestionId: q.id,
      order: q.order,
      type: "dsa" as const,
      title: dsa?.title ?? "Problem",
      points: dsa?.points ?? 0,
      pointsEarned: sub?.pointsEarned ?? 0,
      attempted: sub != null,
      verdict: sub == null ? "not_attempted" : sub.status,
      testCasesPassed: sub?.testCasesPassed,
      totalTestCases: sub?.totalTestCases,
    };
  });

  const totalPoints = questions.reduce((sum, q) => sum + q.pointsEarned, 0);
  const maxPoints = questions.reduce((sum, q) => sum + q.points, 0);

  // Rank + participant count from the live leaderboard (materialised read path is a later sprint).
  const leaderboard = await getLeaderboard(attempt.contestId);
  const myEntry = leaderboard.find((e) => e.userId === userId);

  return {
    id: attempt.id,
    contestId: attempt.contestId,
    contestTitle: attempt.contest.title,
    contestType: attempt.contest.type,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
    durationMs: attempt.durationMs ?? null,
    totalPoints,
    maxPoints,
    rank: myEntry?.rank ?? null,
    totalParticipants: leaderboard.length,
    questions,
  };
};
