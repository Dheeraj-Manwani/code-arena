import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import type { ContestQuestion } from "@/schema/problem.schema";

interface ContestNavigationFooterProps {
  contestQuestions: ContestQuestion[];
  currentQuestionIndex: number;
  goToQuestion: (index: number) => void;
  isAttempted: (q: ContestQuestion) => boolean;
  dsaStatuses?: Partial<
    Record<number, "pending" | "accepted" | "wrong_answer" | "time_limit_exceeded" | "runtime_error">
  >;
  onShowSubmitConfirm: () => void;
}

export default function ContestNavigationFooter({
  contestQuestions,
  currentQuestionIndex,
  goToQuestion,
  isAttempted,
  dsaStatuses = {},
  onShowSubmitConfirm,
}: ContestNavigationFooterProps) {
  return (
    <footer className="bg-card border-t border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Journey - question navigation (commented out - forward-only flow) */}
        <div className="flex items-center gap-2 flex-wrap">
          {contestQuestions.map((q, index) => {
            const attempted = isAttempted(q);
            const dsaStatus = q.type === "dsa" ? dsaStatuses[q.id] : undefined;
            const statusClassName =
              dsaStatus === "accepted"
                ? "bg-arena-success/20 text-arena-success"
                : dsaStatus === "wrong_answer" ||
                    dsaStatus === "runtime_error" ||
                    dsaStatus === "time_limit_exceeded"
                  ? "bg-destructive/15 text-destructive"
                  : dsaStatus === "pending"
                    ? "bg-arena-warning/20 text-arena-warning"
                    : "";
            return (
              <div key={q.id} className="relative">
                <button
                  type="button"
                  onClick={() => goToQuestion(index)}
                  className={`w-8 h-8 rounded-full font-mono text-sm font-medium transition-all hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${index === currentQuestionIndex
                  ? "bg-primary text-primary-foreground arena-glow"
                  : attempted
                    ? "bg-arena-success/20 text-arena-success hover:bg-arena-success/30"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  {index + 1}
                </button>
                {dsaStatus && (
                  <span
                    className={`absolute -top-2 -right-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${statusClassName}`}
                  >
                    {dsaStatus === "accepted"
                      ? "A"
                      : dsaStatus === "pending"
                        ? "P"
                        : "W"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Previous / Next buttons (commented out - forward-only via per-question Submit) */}
          {/* <Button
            variant="outline"
            size="lg"
            onClick={() => goToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Previous
          </Button>
          {isLastQuestion ? (
            <Button
              onClick={onShowSubmitConfirm}
              size="lg"
              className="arena-glow gap-2"
            >
              <Send className="h-5 w-5" />
              Submit Contest
            </Button>
          ) : (
            <Button onClick={onNext} size="lg" className="arena-glow gap-2">
              Next Question
              <ArrowRight className="h-5 w-5" />
            </Button>
          )} */}
          <Button
            onClick={onShowSubmitConfirm}
            size="lg"
            className="arena-glow gap-2"
          >
            <Send className="h-5 w-5" />
            Submit Contest
          </Button>
        </div>
      </div>
    </footer>
  );
}
