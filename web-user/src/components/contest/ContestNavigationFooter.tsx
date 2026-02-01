import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import type { ContestQuestion } from "@/schema/problem.schema";

interface ContestNavigationFooterProps {
  contestQuestions: ContestQuestion[];
  currentQuestionIndex: number;
  goToQuestion: (index: number) => void;
  isAttempted: (q: ContestQuestion) => boolean;
  isLastQuestion: boolean;
  onShowSubmitConfirm: () => void;
  onNext: () => void;
}

export default function ContestNavigationFooter({
  contestQuestions,
  currentQuestionIndex,
  goToQuestion,
  isAttempted,
  isLastQuestion,
  onShowSubmitConfirm,
  onNext,
}: ContestNavigationFooterProps) {
  return (
    <footer className="bg-card border-t border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {contestQuestions.map((q, index) => {
            const attempted = isAttempted(q);
            return (
              <button
                key={index}
                type="button"
                onClick={() => goToQuestion(index)}
                className={`w-8 h-8 rounded-full font-mono text-sm font-medium transition-all hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  index === currentQuestionIndex
                    ? "bg-primary text-primary-foreground arena-glow"
                    : attempted
                      ? "bg-arena-success/20 text-arena-success hover:bg-arena-success/30"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Button
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
          )}
        </div>
      </div>
    </footer>
  );
}
