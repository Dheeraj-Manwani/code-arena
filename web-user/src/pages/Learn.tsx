import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { paths } from "@/lib/paths";
import { pageVariants } from "@/lib/animations";
import { ProgressRing } from "@/components/learn/ProgressRing";
import { ProgressBar } from "@/components/learn/ProgressBar";
import { useLearnGalleryQuery } from "@/queries/learn.queries";
import type { LearnPathCard } from "@/schema/learn.schema";

/**
 * The gallery (LEARN_PATHS.md §3.1).
 *
 * Answers one question: *what should I do right now?* Sorting is in-progress →
 * not-started → complete, and completed paths collapse to a slim row. They have
 * served their purpose and shouldn't crowd live work.
 */
const Learn = () => {
  const { data: pathList, isLoading } = useLearnGalleryQuery();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const all = pathList ?? [];
  const inProgress = all.filter((p) => p.started && p.completedQuestions < p.totalQuestions);
  const notStarted = all.filter((p) => !p.started);
  const finished = all.filter(
    (p) => p.totalQuestions > 0 && p.completedQuestions >= p.totalQuestions,
  );

  // The hero only exists when there is something to continue. An empty progress
  // affordance is an anti-hook — §3.1.
  const hero = inProgress[0] ?? null;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-5xl space-y-8 px-4 py-8"
    >
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Learn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Structured paths that take you from zero to interview-ready.
        </p>
      </div>

      {all.length === 0 ? (
        <EmptyGallery />
      ) : (
        <>
          {hero && <ContinueHero path={hero} />}

          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              {hero ? "All paths" : "Choose a path"}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...inProgress, ...notStarted].map((path) => (
                <PathCard key={path.slug} path={path} />
              ))}
            </div>
          </section>

          {finished.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Completed</h2>
              {finished.map((path) => (
                <Link
                  key={path.slug}
                  to={paths.learnPath(path.slug)}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/15 text-xs text-emerald-400">
                    ✓
                  </span>
                  <span className="flex-1 truncate text-sm text-foreground">{path.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {path.totalQuestions} questions
                  </span>
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </motion.div>
  );
};

const ContinueHero = ({ path }: { path: LearnPathCard }) => (
  <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-primary">
      Continue where you left off
    </p>

    <div className="flex items-center gap-4">
      <ProgressRing completed={path.completedQuestions} total={path.totalQuestions} size={64} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-foreground">{path.title}</h3>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
          {path.completedQuestions} of {path.totalQuestions} questions
        </p>
      </div>

      <Button asChild className="shrink-0 gap-2">
        <Link to={paths.learnPath(path.slug)}>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  </section>
);

const PathCard = ({ path }: { path: LearnPathCard }) => (
  <Link
    to={paths.learnPath(path.slug)}
    className={cn(
      "flex flex-col gap-3 rounded-xl border border-border bg-card p-5",
      "transition-colors hover:border-primary/40 hover:bg-muted/30",
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <h3 className="min-w-0 flex-1 font-semibold text-foreground">{path.title}</h3>
      <ProgressRing
        completed={path.completedQuestions}
        total={path.totalQuestions}
        size={44}
        strokeWidth={4}
      />
    </div>

    <p className="line-clamp-2 text-sm text-muted-foreground">{path.description}</p>

    <div className="mt-auto space-y-2 pt-1">
      <ProgressBar completed={path.completedQuestions} total={path.totalQuestions} />
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground tabular-nums">
        <span>
          {path.completedQuestions} / {path.totalQuestions} questions
        </span>
        <span>{path.totalModules} topics</span>
      </div>
    </div>

    <span className="flex items-center gap-1 text-sm font-medium text-primary">
      {path.started ? "Continue" : "Start"}
      <ArrowRight className="h-3.5 w-3.5" />
    </span>
  </Link>
);

const EmptyGallery = () => (
  <div className="rounded-xl border border-border bg-card py-16 text-center">
    <GraduationCap className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
    <p className="font-medium text-foreground">No learn paths yet</p>
    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
      Paths are published by the Code Arena team. In the meantime, the problem catalogue is
      open.
    </p>
    <Button asChild variant="secondary" className="mt-5">
      <Link to={paths.problems}>Browse problems</Link>
    </Button>
  </div>
);

export default Learn;
