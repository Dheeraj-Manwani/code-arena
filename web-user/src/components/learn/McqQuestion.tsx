import { useState } from "react";
import { Check, X, HelpCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAnswerMcqMutation } from "@/queries/learn.queries";
import type { LearnQuestion } from "@/schema/learn.schema";

interface McqQuestionProps {
  question: LearnQuestion;
  isNext: boolean;
  pathSlug: string | undefined;
}

/**
 * An MCQ, answered inline (LEARN_PATHS.md §3.5).
 *
 * Expands in place rather than navigating: answering takes seconds, and pushing
 * a route for it would make a lesson of five quizzes five round trips through
 * the router.
 *
 * The options are safe to hold client-side — `correctOptionIndex` is not, and
 * never arrives. Grading is a server round-trip on every attempt (§5.7), which
 * also means the answer cannot be discovered by reading the network tab.
 *
 * Retries are unlimited. These are formative questions with no score attached,
 * so the failure mode worth designing against is a learner who gives up, not
 * one who guesses.
 */
export const McqQuestion = ({ question, isNext, pathSlug }: McqQuestionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    correctOptionIndex: number | null;
  } | null>(null);

  const answer = useAnswerMcqMutation(pathSlug);
  const options = question.mcq?.options ?? [];
  const isComplete = question.isComplete;

  const submit = () => {
    if (selected === null) return;

    answer.mutate(
      { questionId: question.id, selectedOptionIndex: selected },
      {
        onSuccess: (data) =>
          setResult({ isCorrect: data.isCorrect, correctOptionIndex: data.correctOptionIndex }),
      },
    );
  };

  const retry = () => {
    setResult(null);
    setSelected(null);
  };

  return (
    <div
      className={cn(
        "relative rounded-lg px-3 py-2.5 transition-colors",
        isNext && !isComplete && "bg-primary/5",
      )}
    >
      {isNext && !isComplete && (
        <span className="absolute left-0 top-4 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary animate-pulse motion-reduce:animate-none" />
      )}

      <button
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="shrink-0">
          {isComplete ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <span
              className={cn(
                "block h-4 w-4 rounded-full border-2",
                isNext ? "border-primary" : "border-muted-foreground/40",
              )}
            />
          )}
        </span>

        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />

        <span
          className={cn(
            "min-w-0 flex-1 text-sm",
            isComplete ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {question.mcq?.questionText}
        </span>

        <span className="shrink-0 text-xs text-muted-foreground">
          {isOpen ? "Hide" : isComplete ? "Review" : "Answer"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-1.5 pl-7">
          {options.map((option, index) => {
            const isPicked = selected === index;
            const revealedCorrect = result?.correctOptionIndex === index;
            const pickedAndWrong = result && !result.isCorrect && isPicked;

            return (
              <button
                key={index}
                type="button"
                disabled={answer.isPending || result?.isCorrect === true}
                onClick={() => setSelected(index)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  "disabled:cursor-default",
                  revealedCorrect
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : pickedAndWrong
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : isPicked
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border text-foreground/90 hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                    isPicked ? "border-primary" : "border-muted-foreground/40",
                  )}
                >
                  {isPicked && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>

                <span className="flex-1">{option}</span>

                {revealedCorrect && <Check className="h-3.5 w-3.5 shrink-0" />}
                {pickedAndWrong && <X className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}

          <div className="flex items-center gap-2 pt-1.5">
            {result?.isCorrect ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-400">
                <Check className="h-4 w-4" />
                Correct.
              </p>
            ) : result ? (
              <>
                {/* Never says which one is right — that would turn unlimited
                    retries into one retry. */}
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-rose-400" />
                  Not quite — have another look.
                </p>
                <Button size="sm" variant="secondary" onClick={retry} className="ml-auto gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try again
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={submit}
                disabled={selected === null || answer.isPending}
                className="ml-auto"
              >
                {answer.isPending ? "Checking…" : "Check"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
