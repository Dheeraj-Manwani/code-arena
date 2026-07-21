import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProgressRing } from "./ProgressRing";

interface MilestoneModalProps {
  title: string;
  completedQuestions: number;
  completedLessons: number;
  pathTitle: string;
  pathCompleted: number;
  pathTotal: number;
  /** The next topic, offered while the user is most willing to continue. */
  nextLabel: string | null;
  onDismiss: () => void;
}

/** Respects the OS setting; a celebration must never be the thing that hurts. */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * The module milestone (LEARN_PATHS.md §3.6).
 *
 * Fires at module completion only. Lesson completions get the quiet inline toast
 * instead — a modal several times a session stops being a reward and becomes an
 * interruption, which is precisely how restrained gamification degrades into the
 * thing §1 rejected.
 *
 * It names the *next* module and offers it: the moment of maximum satisfaction
 * is the moment of maximum willingness to continue, and ending it with a dead
 * end wastes that.
 */
export const MilestoneModal = ({
  title,
  completedQuestions,
  completedLessons,
  pathTitle,
  pathCompleted,
  pathTotal,
  nextLabel,
  onDismiss,
}: MilestoneModalProps) => {
  const reduced = prefersReducedMotion();

  // The ring animates 0 → 100% on mount, which is the one place a sweep from
  // zero is honest: this milestone *did* just complete.
  const [filled, setFilled] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  const percent = pathTotal > 0 ? Math.round((pathCompleted / pathTotal) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} complete`}
      // Skippable by clicking anywhere (§3.6) — a celebration that traps you is
      // not a celebration.
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex justify-center">
          <ProgressRing
            completed={filled ? completedQuestions : 0}
            total={completedQuestions}
            size={88}
            strokeWidth={6}
            label={`${completedQuestions}`}
          />
        </div>

        <h2 className="text-lg font-semibold text-foreground">{title} complete</h2>

        <p className="mt-1.5 text-sm text-muted-foreground">
          {completedQuestions} {completedQuestions === 1 ? "question" : "questions"} ·{" "}
          {completedLessons} {completedLessons === 1 ? "lesson" : "lessons"}
        </p>

        <p className="mt-3 text-sm text-foreground/80">
          You're {percent}% through {pathTitle}.
        </p>

        <div className="mt-6 space-y-2">
          <Button onClick={onDismiss} className="w-full gap-2">
            {nextLabel ? (
              <>
                Start: {nextLabel}
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              "Continue"
            )}
          </Button>
          <button
            onClick={onDismiss}
            className="w-full text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to path
          </button>
        </div>
      </div>
    </div>
  );
};

interface LessonCompleteToastProps {
  title: string;
  totalQuestions: number;
  onDismiss: () => void;
}

/**
 * The lesson milestone — inline, quiet, and self-dismissing (§3.6).
 *
 * This fires several times a session, so it is deliberately the small treatment:
 * no modal, no confetti, nothing to click away.
 */
export const LessonCompleteToast = ({
  title,
  totalQuestions,
  onDismiss,
}: LessonCompleteToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 shadow-lg backdrop-blur-sm motion-safe:animate-in motion-safe:slide-in-from-bottom-4"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/20 text-xs text-emerald-300">
        ✓
      </span>
      <span className="text-sm text-emerald-100">
        <strong className="font-medium">{title}</strong> complete · {totalQuestions}/
        {totalQuestions}
      </span>
    </div>
  );
};
