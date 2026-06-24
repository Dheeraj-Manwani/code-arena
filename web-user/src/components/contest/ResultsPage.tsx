import { Check, X, Code, HelpCircle, Trophy, ArrowRight, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AttemptResultResponse,
  AttemptResultQuestion,
  AttemptResultVerdict,
} from "@/schema/attempt.schema";

interface ResultsPageProps {
  results: AttemptResultResponse;
  onBackToContests: () => void;
  onViewLeaderboard?: () => void;
}

const VERDICT_LABELS: Record<AttemptResultVerdict, string> = {
  correct: "Correct",
  incorrect: "Incorrect",
  accepted: "Accepted",
  wrong_answer: "Wrong Answer",
  time_limit_exceeded: "Time Limit Exceeded",
  runtime_error: "Runtime Error",
  pending: "Pending",
  not_attempted: "Not Attempted",
};

const isPositiveVerdict = (v: AttemptResultVerdict) =>
  v === "correct" || v === "accepted";
const isPendingVerdict = (v: AttemptResultVerdict) => v === "pending";
const isNeutralVerdict = (v: AttemptResultVerdict) => v === "not_attempted";

const formatDuration = (ms: number | null) => {
  if (ms == null) return null;
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const ResultsPage = ({ results, onBackToContests, onViewLeaderboard }: ResultsPageProps) => {
  const { totalPoints, maxPoints, rank, totalParticipants, durationMs, questions } = results;
  const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  const duration = formatDuration(durationMs);

  const getScoreColor = () => {
    if (percentage >= 80) return "text-arena-success";
    if (percentage >= 50) return "text-arena-warning";
    return "text-destructive";
  };

  const getScoreMessage = () => {
    if (percentage === 100) return "Perfect Score! 🎉";
    if (percentage >= 80) return "Excellent Work!";
    if (percentage >= 50) return "Good Effort!";
    return "Keep Practicing!";
  };

  const renderQuestionStatus = (q: AttemptResultQuestion) => {
    const label = VERDICT_LABELS[q.verdict];
    if (isPositiveVerdict(q.verdict)) {
      return (
        <>
          <Check className="h-4 w-4 text-arena-success" />
          <span className="text-xs text-arena-success">{label}</span>
        </>
      );
    }
    if (isPendingVerdict(q.verdict)) {
      return (
        <>
          <Clock className="h-4 w-4 text-arena-warning" />
          <span className="text-xs text-arena-warning">{label}</span>
        </>
      );
    }
    if (isNeutralVerdict(q.verdict)) {
      return (
        <>
          <X className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </>
      );
    }
    return (
      <>
        <X className="h-4 w-4 text-destructive" />
        <span className="text-xs text-destructive">{label}</span>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Score Card */}
        <div className="arena-card p-8 mb-8 text-center arena-glow">
          <div className="mb-6">
            <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="font-mono text-3xl font-bold mb-2">{results.contestTitle}</h1>
            <p className="text-muted-foreground">{getScoreMessage()}</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <span className={cn("font-mono text-6xl font-bold", getScoreColor())}>
              {totalPoints}
            </span>
            <span className="text-muted-foreground text-2xl">/</span>
            <span className="font-mono text-4xl text-muted-foreground">{maxPoints}</span>
          </div>

          <div className="w-full h-4 bg-secondary rounded-full overflow-hidden mb-2">
            <div
              className={cn(
                "h-full transition-all duration-1000",
                percentage >= 80
                  ? "bg-arena-success"
                  : percentage >= 50
                    ? "bg-arena-warning"
                    : "bg-destructive"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mb-4">{percentage}% score</p>

          {/* Summary stats */}
          <div className="flex items-center justify-center gap-6 text-sm">
            {rank != null && (
              <div className="flex items-center gap-1.5 text-primary">
                <Trophy className="h-4 w-4" />
                <span>
                  Rank #{rank}
                  {totalParticipants > 0 ? ` of ${totalParticipants}` : ""}
                </span>
              </div>
            )}
            {totalParticipants > 0 && rank == null && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{totalParticipants} participants</span>
              </div>
            )}
            {duration && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{duration}</span>
              </div>
            )}
          </div>
        </div>

        {/* Questions Summary */}
        <div className="arena-card p-6 mb-8">
          <h2 className="font-mono text-lg font-semibold mb-4">Question Summary</h2>
          <div className="space-y-3">
            {questions.map((q, index) => {
              const isCoding = q.type === "dsa";
              const positive = isPositiveVerdict(q.verdict);
              const pending = isPendingVerdict(q.verdict);
              const neutral = isNeutralVerdict(q.verdict);

              return (
                <div
                  key={q.contestQuestionId}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg",
                    positive
                      ? "bg-arena-success/10"
                      : pending
                        ? "bg-arena-warning/10"
                        : neutral
                          ? "bg-secondary/40"
                          : "bg-destructive/10"
                  )}
                >
                  <span className="font-mono text-sm text-muted-foreground w-8">
                    #{index + 1}
                  </span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isCoding ? (
                      <Code className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{q.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {isCoding && q.totalTestCases != null && q.totalTestCases > 0 && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {q.testCasesPassed ?? 0}/{q.totalTestCases}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">
                      {q.pointsEarned}/{q.points} pts
                    </span>
                    <div className="flex items-center gap-1.5 w-36 justify-end">
                      {renderQuestionStatus(q)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3">
          {onViewLeaderboard && (
            <Button variant="outline" onClick={onViewLeaderboard} size="lg">
              View Leaderboard
            </Button>
          )}
          <Button onClick={onBackToContests} size="lg" className="arena-glow">
            Back to My Contests
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
