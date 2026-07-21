import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
  PartyPopper,
  RotateCcw,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";
import { pageVariants } from "@/lib/animations";
import { ProgressRing } from "@/components/learn/ProgressRing";
import { ModuleAccordion } from "@/components/learn/ModuleAccordion";
import { CelebrationHost } from "@/components/learn/CelebrationHost";
import ResetPathDialog from "@/components/learn/ResetPathDialog";
import ImportProgressDialog from "@/components/learn/ImportProgressDialog";
import {
  useLearnPathQuery,
  useSelfMarkMutation,
  useUnmarkMutation,
  useUnlockModuleMutation,
  useResetPathMutation,
  useExportPathMutation,
  useImportPathMutation,
} from "@/queries/learn.queries";
import {
  usePathCompleteConfetti,
  forgetPathCelebration,
} from "@/hooks/use-path-complete-confetti";
import type { LearnQuestion } from "@/schema/learn.schema";

/**
 * The path page (LEARN_PATHS.md §3.2).
 *
 * Exactly one module and one lesson auto-expand — the current ones — so the
 * 474-row wall from the reference sheet never appears. Everything else is
 * collapsed, and completed topics stay collapsed as banked wins.
 */
const LearnPath = () => {
  const { slug } = useParams();
  const { data: path, isLoading, isError } = useLearnPathQuery(slug);

  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<number>>(new Set());
  // Tracks whether the auto-expand has run, so a refetch (or a completion that
  // moves `current`) can't slam shut a module the user opened by hand.
  const [seeded, setSeeded] = useState(false);

  const selfMark = useSelfMarkMutation(slug);
  const unmark = useUnmarkMutation(slug);
  const unlockModule = useUnlockModuleMutation(slug);
  const resetPath = useResetPathMutation(slug);

  const exportPath = useExportPathMutation(slug);
  const importPath = useImportPathMutation(slug);

  const [pendingQuestionId, setPendingQuestionId] = useState<number | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const confirmReset = () => {
    if (!slug) return;
    resetPath.mutate(slug, {
      onSuccess: () => {
        setResetOpen(false);
        // Re-arm the auto-expand: `current` has moved back to the first
        // unfinished question, and leaving `seeded` true would strand the user
        // looking at whichever topic they had open before.
        setSeeded(false);
        // Re-arm the celebration too — someone redoing a path deliberately
        // should get the same payoff at the end of it.
        forgetPathCelebration(slug);
      },
    });
  };

  const toggleSelfMark = (question: LearnQuestion) => {
    // A verified completion has no checkbox, so reaching here means the row is
    // either untouched or self-marked.
    setPendingQuestionId(question.id);
    const mutation = question.isComplete ? unmark : selfMark;
    mutation.mutate(question.id, { onSettled: () => setPendingQuestionId(null) });
  };

  const isFinished = Boolean(
    path && path.totalQuestions > 0 && path.completedQuestions >= path.totalQuestions,
  );

  usePathCompleteConfetti(slug, isFinished);

  const currentModuleSlug = path?.current?.moduleSlug ?? null;

  const currentModuleId = useMemo(
    () => path?.modules.find((m) => m.slug === currentModuleSlug)?.id ?? null,
    [path, currentModuleSlug],
  );

  useEffect(() => {
    if (!path || seeded) return;

    // Fall back to the first module so a finished path still shows something
    // rather than a page of collapsed rows.
    const moduleId = currentModuleId ?? path.modules[0]?.id ?? null;
    if (moduleId !== null) setExpandedModules(new Set([moduleId]));
    if (path.current) setExpandedLessons(new Set([path.current.lessonId]));

    setSeeded(true);
  }, [path, currentModuleId, seeded]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-28 rounded-xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !path) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="font-medium text-foreground">This path isn't available.</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link to={paths.learn}>Back to Learn</Link>
        </Button>
      </div>
    );
  }

  const toggle = (set: Set<number>, id: number, update: (next: Set<number>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update(next);
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-4xl space-y-6 px-4 py-8"
    >
      <div>
        <Link
          to={paths.learn}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Learn
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">{path.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{path.description}</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-5">
          <ProgressRing
            completed={path.completedQuestions}
            total={path.totalQuestions}
            size={72}
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Overall progress</p>
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
              {path.completedQuestions}
              <span className="text-base text-muted-foreground"> / {path.totalQuestions}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {path.completedModules} of {path.totalModules} topics complete
              {/* Only worth saying when the two differ — otherwise it is noise
                  on a number that is entirely verified anyway (§3.2). */}
              {path.verifiedQuestions < path.completedQuestions && (
                <>
                  {" "}
                  · {path.verifiedQuestions} verified ·{" "}
                  {path.completedQuestions - path.verifiedQuestions} self-marked
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1 self-start">
            {/* Export is offered on an untouched path too: the sheet is also a
                way to plan and tick off work, not only to back up progress. */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportPath.mutate()}
              disabled={exportPath.isPending}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              title="Download your progress as a spreadsheet"
            >
              {exportPath.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Export</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              title="Apply an edited spreadsheet"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Import</span>
            </Button>

            {/* Only offer it once there is something to reset — an empty path
                gives the control nothing to do but look alarming. */}
            {path.completedQuestions > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResetOpen(true)}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
          </div>
        </div>

        {exportPath.isError && (
          <p className="mt-3 text-xs text-destructive">
            Couldn't build your spreadsheet. Please try again.
          </p>
        )}

        {/* §3.8: a user opening a path they already have history in must be told
            why the bar isn't empty, or a pre-filled ring reads as a bug. */}
        {path.completedQuestions > 0 && !isFinished && (
          <p className="mt-4 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            You've already completed {path.completedQuestions}{" "}
            {path.completedQuestions === 1 ? "question" : "questions"} in this path from earlier
            practice and contests.
          </p>
        )}

        {isFinished && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
            <PartyPopper className="h-4 w-4 shrink-0" />
            You've finished this path — all {path.totalQuestions} questions.
          </div>
        )}
      </section>

      {path.current && (
        <section className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Next up</p>
            <p className="truncate text-sm text-foreground">{path.current.questionTitle}</p>
            <p className="truncate text-xs text-muted-foreground">
              {path.current.moduleTitle} · {path.current.lessonTitle}
            </p>
          </div>

          {path.current.problemSlug && (
            <Button asChild size="sm" className="shrink-0 gap-1.5">
              <Link
                to={`${paths.problemSolve(path.current.problemSlug)}?path=${path.slug}&question=${path.current.questionId}`}
              >
                Solve
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </section>
      )}

      {/* Milestones are driven by stored pending state, not by whatever just
          happened on this page — the completing verdict usually lands on the
          *solve* page, so the path is where it gets noticed (§5.5). */}
      <CelebrationHost
        pathSlug={slug}
        pathTitle={path.title}
        pathCompleted={path.completedQuestions}
        pathTotal={path.totalQuestions}
        nextModuleTitle={path.modules.find((m) => !m.isComplete)?.title ?? null}
      />

      <ImportProgressDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onConfirm={(file) => importPath.mutate(file)}
        pathTitle={path.title}
        isImporting={importPath.isPending}
        isError={importPath.isError}
        summary={importPath.data ?? null}
        // Clears the last run's report so reopening the dialog starts at the
        // file picker rather than at a stale summary.
        onDone={() => importPath.reset()}
      />

      <ResetPathDialog
        open={resetOpen}
        onOpenChange={(open) => {
          if (!resetPath.isPending) setResetOpen(open);
        }}
        onConfirm={confirmReset}
        pathTitle={path.title}
        selfMarkedCount={path.completedQuestions - path.verifiedQuestions}
        verifiedCount={path.verifiedQuestions}
        isResetting={resetPath.isPending}
        isError={resetPath.isError}
      />

      <div className="space-y-3">
        {path.modules.map((mod) => (
          <ModuleAccordion
            key={mod.id}
            module={mod}
            isExpanded={expandedModules.has(mod.id)}
            onToggle={() => toggle(expandedModules, mod.id, setExpandedModules)}
            expandedLessons={expandedLessons}
            onToggleLesson={(lessonId) => toggle(expandedLessons, lessonId, setExpandedLessons)}
            current={path.current}
            pathSlug={path.slug}
            isCurrent={mod.id === currentModuleId}
            onToggleSelfMark={toggleSelfMark}
            pendingQuestionId={pendingQuestionId}
            onOpenAnyway={(moduleId) => unlockModule.mutate(moduleId)}
          />
        ))}

        {path.modules.length === 0 && (
          <p className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
            This path has no topics yet.
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default LearnPath;
