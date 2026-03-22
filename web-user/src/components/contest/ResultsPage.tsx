import { Check, X, Code, HelpCircle, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContestQuestion } from "@/schema/problem.schema";

interface ResultsPageProps {
  questions: ContestQuestion[];
  submittedQuestionIds: number[];
  onRestart: () => void;
}

const ResultsPage = ({ questions, submittedQuestionIds, onRestart }: ResultsPageProps) => {
  const answeredQuestions = questions.filter((q) => submittedQuestionIds.includes(q.id));
  const score = answeredQuestions.length;
  const total = questions.length;
  const percentage = Math.round((score / total) * 100);

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Score Card */}
        <div className="arena-card p-8 mb-8 text-center arena-glow">
          <div className="mb-6">
            <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="font-mono text-3xl font-bold mb-2">Contest Complete!</h1>
            <p className="text-muted-foreground">{getScoreMessage()}</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <span className={cn("font-mono text-6xl font-bold", getScoreColor())}>
              {score}
            </span>
            <span className="text-muted-foreground text-2xl">/</span>
            <span className="font-mono text-4xl text-muted-foreground">{total}</span>
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
          <p className="text-sm text-muted-foreground">
            {percentage}% completion rate
          </p>
        </div>

        {/* Questions Summary */}
        <div className="arena-card p-6 mb-8">
          <h2 className="font-mono text-lg font-semibold mb-4">Question Summary</h2>
          <div className="space-y-3">
            {questions.map((q: ContestQuestion, index: number) => {
              const isAnswered = submittedQuestionIds.includes(q.id);
              const isCoding = q.type === "dsa";

              return (
                <div
                  key={q.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg",
                    isAnswered ? "bg-arena-success/10" : "bg-destructive/10"
                  )}
                >
                  <span className="font-mono text-sm text-muted-foreground w-8">
                    #{index + 1}
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    {isCoding ? (
                      <Code className="h-4 w-4 text-primary" />
                    ) : (
                      <HelpCircle className="h-4 w-4 text-primary" />
                    )}
                    <span className="text-sm font-medium">{q.type === "mcq" ? q.questionText : q.title}</span>
                    {isCoding && q.difficulty && (
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          q.difficulty === "easy" && "bg-arena-success/20 text-arena-success",
                          q.difficulty === "medium" && "bg-arena-warning/20 text-arena-warning",
                          q.difficulty === "hard" && "bg-destructive/20 text-destructive"
                        )}
                      >
                        {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isAnswered ? (
                      <>
                        <Check className="h-4 w-4 text-arena-success" />
                        <span className="text-xs text-arena-success">Submitted</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-destructive" />
                        <span className="text-xs text-destructive">Not Submitted</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          <Button onClick={onRestart} size="lg" className="arena-glow">
            Start New Contest
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
