import { useEffect, useRef, useState } from "react";

import { MilestoneModal, LessonCompleteToast } from "./MilestoneModal";
import {
  useCelebrationsQuery,
  useAcknowledgeCelebrationMutation,
} from "@/queries/learn.queries";

interface CelebrationHostProps {
  pathSlug: string | undefined;
  pathTitle: string;
  pathCompleted: number;
  pathTotal: number;
  /** Title of the next incomplete module, offered inside the modal. */
  nextModuleTitle: string | null;
}

/**
 * Decides what milestone to show, and marks it seen (LEARN_PATHS.md §5.5).
 *
 * Two rules live here, and both are about *when* the acknowledgement happens:
 *
 *  1. **Acknowledge on show, not on dismiss.** Someone who closes the tab
 *     mid-confetti has still seen it; a duplicate on their next visit is worse
 *     than a miss. The POST fires as the animation starts.
 *  2. **Acknowledge once per mount.** A ref guard, not state — invalidating the
 *     celebrations query after the POST re-renders this component, and state
 *     alone would let the effect fire again on the way through.
 *
 * The server has already applied the module-supersedes-lesson rule (§3.6), so
 * whatever arrives here is what should be shown; `alsoAcknowledge` carries the
 * suppressed lessons that must be marked seen without being displayed.
 */
export const CelebrationHost = ({
  pathSlug,
  pathTitle,
  pathCompleted,
  pathTotal,
  nextModuleTitle,
}: CelebrationHostProps) => {
  const { data } = useCelebrationsQuery(pathSlug);
  const acknowledge = useAcknowledgeCelebrationMutation(pathSlug);

  const [showing, setShowing] = useState<
    | { kind: "module"; title: string; questions: number; lessons: number }
    | { kind: "lesson"; title: string; questions: number }
    | null
  >(null);

  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!data) return;

    const module = data.modules[0];
    const lesson = data.lessons[0];
    if (!module && !lesson) return;

    // Stable identity for what we're about to show, so the guard survives the
    // re-render that the acknowledgement's invalidation triggers.
    const key = module ? `m${module.moduleId}` : `l${lesson.lessonId}`;
    if (handled.current === key) return;
    handled.current = key;

    if (module) {
      setShowing({
        kind: "module",
        title: module.title,
        questions: module.completedQuestions,
        lessons: module.completedLessons,
      });
      acknowledge.mutate({
        moduleId: module.moduleId,
        lessonIds: data.alsoAcknowledge.lessonIds,
      });
      return;
    }

    setShowing({
      kind: "lesson",
      title: lesson.title,
      questions: lesson.totalQuestions,
    });
    acknowledge.mutate({ lessonIds: [lesson.lessonId] });
    // `acknowledge` is intentionally not a dependency: it is recreated each
    // render, and including it would re-run this on every one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!showing) return null;

  if (showing.kind === "module") {
    return (
      <MilestoneModal
        title={showing.title}
        completedQuestions={showing.questions}
        completedLessons={showing.lessons}
        pathTitle={pathTitle}
        pathCompleted={pathCompleted}
        pathTotal={pathTotal}
        nextLabel={nextModuleTitle}
        onDismiss={() => setShowing(null)}
      />
    );
  }

  return (
    <LessonCompleteToast
      title={showing.title}
      totalQuestions={showing.questions}
      onDismiss={() => setShowing(null)}
    />
  );
};
