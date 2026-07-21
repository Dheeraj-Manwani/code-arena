import { Link } from "react-router-dom";
import { Check, ChevronDown, ChevronRight, BookOpen, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { paths } from "@/lib/paths";
import { ProgressBar } from "./ProgressBar";
import { QuestionRow } from "./QuestionRow";
import type {
  LearnModuleSummary,
  LearnLessonSummary,
  LearnCurrentPointer,
  LearnQuestion,
} from "@/schema/learn.schema";

interface ModuleAccordionProps {
  module: LearnModuleSummary;
  isExpanded: boolean;
  onToggle: () => void;
  expandedLessons: Set<number>;
  onToggleLesson: (lessonId: number) => void;
  current: LearnCurrentPointer | null;
  pathSlug: string;
  /** True for the module the path is pointing at — drives "YOU ARE HERE". */
  isCurrent: boolean;
  onToggleSelfMark: (question: LearnQuestion) => void;
  pendingQuestionId: number | null;
  onOpenAnyway: (moduleId: number) => void;
}

/**
 * A topic (§3.2). The unit of achievement, and the level soft gating applies to.
 *
 * A completed module collapses to a one-line row with a check and stays that
 * way — §1's goal-gradient argument made visual. Finished topics stack up above
 * the current work as *banked wins* rather than competing with it for attention.
 */
export const ModuleAccordion = ({
  module: mod,
  isExpanded,
  onToggle,
  expandedLessons,
  onToggleLesson,
  current,
  pathSlug,
  isCurrent,
  onToggleSelfMark,
  pendingQuestionId,
  onOpenAnyway,
}: ModuleAccordionProps) => {
  const locked = !mod.gate.unlocked;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card transition-opacity",
        // Dimmed, never `pointer-events: none` — §3.2 requires a locked module
        // to stay clickable. The gate is a suggestion, not permission.
        locked && !isExpanded && "opacity-60",
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        {mod.isComplete ? (
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
        ) : isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "truncate font-medium",
                mod.isComplete ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {mod.title}
            </span>

            {isCurrent && !mod.isComplete && (
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                You are here
              </span>
            )}

            {locked && <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
          </span>
        </span>

        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {mod.completedQuestions} / {mod.totalQuestions}
        </span>

        <ProgressBar
          completed={mod.completedQuestions}
          total={mod.totalQuestions}
          className="hidden w-28 shrink-0 sm:block"
        />
      </button>

      {/* The reason, not just the padlock. A dimmed row with no explanation
          reads as a bug, and the "open anyway" affordance must always be here. */}
      {locked && !isExpanded && (
        <p className="px-4 pb-3 text-xs text-muted-foreground">
          Suggested after the previous topic ·{" "}
          <button
            onClick={() => {
              onOpenAnyway(mod.id);
              onToggle();
            }}
            className="text-primary hover:underline"
          >
            Open anyway ›
          </button>
        </p>
      )}

      {isExpanded && (
        <div className="space-y-1.5 border-t border-border px-3 py-3">
          {mod.lessons.map((lesson) => (
            <LessonAccordion
              key={lesson.id}
              lesson={lesson}
              isExpanded={expandedLessons.has(lesson.id)}
              onToggle={() => onToggleLesson(lesson.id)}
              current={current}
              pathSlug={pathSlug}
              onToggleSelfMark={onToggleSelfMark}
              pendingQuestionId={pendingQuestionId}
            />
          ))}

          {mod.lessons.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              This topic has no lessons yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

interface LessonAccordionProps {
  lesson: LearnLessonSummary;
  isExpanded: boolean;
  onToggle: () => void;
  current: LearnCurrentPointer | null;
  pathSlug: string;
  onToggleSelfMark: (question: LearnQuestion) => void;
  pendingQuestionId: number | null;
}

const LessonAccordion = ({
  lesson,
  isExpanded,
  onToggle,
  current,
  pathSlug,
  onToggleSelfMark,
  pendingQuestionId,
}: LessonAccordionProps) => (
  <div className="rounded-lg border border-border/60 bg-background">
    <button onClick={onToggle} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
      {lesson.isComplete ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : isExpanded ? (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          lesson.isComplete ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {lesson.title}
      </span>

      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
        {lesson.completedQuestions}/{lesson.totalQuestions}
      </span>
    </button>

    {isExpanded && (
      <div className="border-t border-border/60 px-2 py-2">
        {/* Prose is a single link row, not a step — it has no checkbox and no
            state, because reading never counts toward progress (D4). */}
        {lesson.hasBody && (
          <Link
            to={paths.learnLesson(pathSlug, lesson.id)}
            className="mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">Read: {lesson.title}</span>
            <span className="text-xs">›</span>
          </Link>
        )}

        {lesson.questions.map((question) => (
          <QuestionRow
            key={question.id}
            question={question}
            isNext={current?.questionId === question.id}
            pathSlug={pathSlug}
            onToggleSelfMark={() => onToggleSelfMark(question)}
            isPending={pendingQuestionId === question.id}
          />
        ))}

        {lesson.questions.length === 0 && (
          <p className="py-2 text-center text-xs text-muted-foreground">
            No questions in this lesson yet.
          </p>
        )}
      </div>
    )}
  </div>
);
