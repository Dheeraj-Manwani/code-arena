import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProgressBar } from "./ProgressBar";
import { paths } from "@/lib/paths";
import type { NextQuestion } from "@/api/learn";

interface SolvePathHeaderProps {
  data: NextQuestion;
  pathSlug: string;
}

/**
 * The path strip above the editor (LEARN_PATHS.md §3.4).
 *
 * Only rendered when the solve page was reached *from* a path — the URL carries
 * `?path=&question=` (D9), so a plain catalogue visit is unaffected. Reusing the
 * route rather than forking it is what keeps this a strip rather than a second
 * solve page.
 */
export const SolvePathHeader = ({ data, pathSlug }: SolvePathHeaderProps) => (
  <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted/30 px-4 py-2">
    <Link
      to={paths.learnPath(pathSlug)}
      className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span className="max-w-40 truncate">{data.pathTitle}</span>
    </Link>

    {data.progress && (
      <>
        <ProgressBar
          completed={data.progress.completedQuestions}
          total={data.progress.totalQuestions}
          className="w-32"
        />
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {data.progress.completedQuestions} / {data.progress.totalQuestions}
        </span>
      </>
    )}
  </div>
);

interface NextQuestionPanelProps {
  data: NextQuestion;
  pathSlug: string;
  onDismiss: () => void;
}

/**
 * Shown after an accepted verdict.
 *
 * **This is the most important element in the feature.** Without it a solved
 * problem is an exit: the user lands back on the catalogue, the path becomes a
 * bookmark list, and the session ends at one question. With it, finishing is the
 * start of the next thing rather than the end of this one.
 */
export const NextQuestionPanel = ({ data, pathSlug, onDismiss }: NextQuestionPanelProps) => (
  <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
    <div className="pointer-events-auto w-full max-w-md rounded-xl border border-emerald-500/30 bg-card p-4 shadow-xl motion-safe:animate-in motion-safe:slide-in-from-bottom-4">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
        <Check className="h-4 w-4" />
        Accepted
      </div>

      {data.progress && (
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar
            completed={data.progress.completedQuestions}
            total={data.progress.totalQuestions}
            className="flex-1"
          />
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {data.progress.completedQuestions} / {data.progress.totalQuestions}
          </span>
        </div>
      )}

      <div className="mt-4">
        {data.next ? (
          <Button asChild className="w-full justify-between gap-2">
            <Link
              to={
                data.next.problemSlug
                  ? `${paths.problemSolve(data.next.problemSlug)}?path=${pathSlug}&question=${data.next.questionId}`
                  : paths.learnLesson(pathSlug, data.next.lessonId)
              }
            >
              <span className="min-w-0 truncate text-left">
                Next: {data.next.title}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
        ) : (
          // No next question is a real state, not an error — say so rather than
          // rendering a button that goes nowhere.
          <Button asChild className="w-full">
            <Link to={paths.learnPath(pathSlug)}>Back to path</Link>
          </Button>
        )}

        <button
          onClick={onDismiss}
          className="mt-2 w-full text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Stay here
        </button>
      </div>
    </div>
  </div>
);
