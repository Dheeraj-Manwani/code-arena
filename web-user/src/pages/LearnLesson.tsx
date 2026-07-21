import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";
import { pageVariants } from "@/lib/animations";
import { ProgressBar } from "@/components/learn/ProgressBar";
import { QuestionRow } from "@/components/learn/QuestionRow";
import { Markdown } from "@/components/learn/Markdown";
import {
  useLearnLessonQuery,
  useSelfMarkMutation,
  useUnmarkMutation,
} from "@/queries/learn.queries";
import type { LearnQuestion } from "@/schema/learn.schema";

/**
 * The lesson page (LEARN_PATHS.md §3.3).
 *
 * Prose above, questions below. Reading is optional and uncounted (D4) — there
 * is no "mark as read", and the progress line counts questions only.
 *
 * Prose renders through `<Markdown>`, which parses to React elements and never
 * to HTML (§5.8). See that component for why that distinction is the actual
 * defence rather than the sanitiser sitting on top of it.
 */
const LearnLesson = () => {
  const { slug, lessonId } = useParams();
  const parsedId = Number(lessonId);
  const { data: lesson, isLoading, isError } = useLearnLessonQuery(parsedId);

  const selfMark = useSelfMarkMutation(slug);
  const unmark = useUnmarkMutation(slug);
  const [pendingQuestionId, setPendingQuestionId] = useState<number | null>(null);

  const toggleSelfMark = (question: LearnQuestion) => {
    setPendingQuestionId(question.id);
    const mutation = question.isComplete ? unmark : selfMark;
    mutation.mutate(question.id, { onSettled: () => setPendingQuestionId(null) });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !lesson) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-medium text-foreground">This lesson isn't available.</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link to={slug ? paths.learnPath(slug) : paths.learn}>Back to the path</Link>
        </Button>
      </div>
    );
  }

  const pathSlug = lesson.module.pathSlug;
  const nextQuestion = lesson.questions.find((q) => !q.isComplete);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-3xl space-y-6 px-4 py-8"
    >
      <div>
        <Link
          to={paths.learnPath(pathSlug)}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {lesson.module.title}
        </Link>

        <h1 className="text-2xl font-semibold text-foreground">{lesson.title}</h1>

        <div className="mt-3 flex items-center gap-3">
          <ProgressBar
            completed={lesson.completedQuestions}
            total={lesson.totalQuestions}
            className="max-w-48"
          />
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {lesson.completedQuestions} / {lesson.totalQuestions}
          </span>
        </div>
      </div>

      {lesson.body && (
        <section className="rounded-xl border border-border bg-card p-5">
          <Markdown>{lesson.body}</Markdown>
        </section>
      )}

      <section className="space-y-1">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Questions</h2>

        {lesson.questions.map((question) => (
          <QuestionRow
            key={question.id}
            question={question}
            isNext={question.id === nextQuestion?.id}
            pathSlug={pathSlug}
            onToggleSelfMark={() => toggleSelfMark(question)}
            isPending={pendingQuestionId === question.id}
          />
        ))}

        {lesson.questions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            This lesson has no questions yet.
          </p>
        )}
      </section>
    </motion.div>
  );
};

export default LearnLesson;
