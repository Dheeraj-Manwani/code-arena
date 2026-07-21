import { Link } from "react-router-dom";
import { Check, CheckCircle2, Circle, Code2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { paths } from "@/lib/paths";
import type { LearnQuestion } from "@/schema/learn.schema";
import { McqQuestion } from "./McqQuestion";

interface QuestionRowProps {
  question: LearnQuestion;
  /** The one question the path is pointing at (§3.2's `▸` marker). */
  isNext: boolean;
  pathSlug: string;
  onToggleSelfMark?: () => void;
  isPending?: boolean;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "text-emerald-400",
  medium: "text-amber-400",
  hard: "text-rose-400",
};

/**
 * The atom of the design (§3.4). Four states, and the transitions between them
 * are the product:
 *
 *   ○  not started   grey circle, secondary action
 *   ▸  next up       accent bar + ring, primary action
 *   ✓  verified      solid green check, no checkbox — nothing to retract
 *   ✓  self-marked   hollow check, clickable to undo
 *
 * MCQs never reach here: they render inline via McqQuestion (§3.5).
 */
export const QuestionRow = ({
  question,
  isNext,
  pathSlug,
  onToggleSelfMark,
  isPending,
}: QuestionRowProps) => {
  const { isComplete, problem } = question;
  const title = problem?.title ?? "Untitled";
  const isVerified = question.completionSource === "verified";

  // MCQs are answered inline and have their own affordances (§3.5), so they get
  // a different component rather than a branch inside this one.
  if (question.kind === "mcq") {
    return <McqQuestion question={question} isNext={isNext} pathSlug={pathSlug} />;
  }

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        isNext && "bg-primary/5",
        !isNext && "hover:bg-muted/40",
      )}
    >
      {/* The accent bar carries the "you are here" signal; §3.7 asks for a
          near-subliminal pulse, so it is deliberately low-contrast. */}
      {isNext && (
        <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary animate-pulse motion-reduce:animate-none" />
      )}

      {/*
        Problems get a real checkbox: solving is the primary path, but someone
        who solved this elsewhere shouldn't have to re-solve it to un-grey the
        row (D3). MCQs get none — answering one takes seconds, so an override
        there would exist purely to inflate the number.

        A *verified* completion has no checkbox either: it is backed by a real
        submission, so there is nothing to retract. The distinction is carried by
        a solid vs hollow check, and by whether the control is interactive at all.
      */}
      {!isVerified ? (
        <button
          type="button"
          onClick={onToggleSelfMark}
          disabled={isPending}
          aria-label={isComplete ? "Mark as not done" : "Mark as done"}
          title={isComplete ? "Marked by you — click to undo" : "Mark as done"}
          className="shrink-0 disabled:opacity-50"
        >
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400/70" />
          ) : (
            <Circle
              className={cn(
                "h-4 w-4 transition-colors hover:text-primary",
                isNext ? "text-primary" : "text-muted-foreground/40",
              )}
            />
          )}
        </button>
      ) : (
        <span className="shrink-0" title={isVerified ? "Solved on Code Arena" : undefined}>
          {isComplete ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <Circle
              className={cn(
                "h-4 w-4",
                isNext ? "text-primary" : "text-muted-foreground/40",
              )}
            />
          )}
        </span>
      )}

      <Code2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm",
            isComplete ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {title}
        </p>
        {question.note && (
          <p className="truncate text-xs text-muted-foreground/70">{question.note}</p>
        )}
      </div>

      {problem && (
        <span
          className={cn(
            "shrink-0 text-xs capitalize",
            DIFFICULTY_STYLES[problem.difficulty] ?? "text-muted-foreground",
          )}
        >
          {problem.difficulty}
        </span>
      )}

      {problem && (
        <Button
          asChild
          size="sm"
          variant={isNext ? "default" : isComplete ? "ghost" : "secondary"}
          className="h-7 shrink-0 px-3 text-xs"
        >
          {/* Path context rides along as query params so Phase 6 can add
              "Next question →" without forking the solve route (D9). */}
          <Link to={`${paths.problemSolve(problem.slug)}?path=${pathSlug}&question=${question.id}`}>
            {isComplete ? "Review" : "Solve"}
          </Link>
        </Button>
      )}
    </div>
  );
};
