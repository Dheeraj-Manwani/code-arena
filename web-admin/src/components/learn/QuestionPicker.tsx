import { useEffect, useMemo, useState } from "react";
import { Search, Lock, Check, AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useMcqQuestionsQuery, useDsaProblemsQuery } from "@/queries/problem.queries";
import { learnApi } from "@/api/learn";
import type { ProblemUsage } from "@/schema/learn.schema";

interface QuestionPickerProps {
  open: boolean;
  onClose: () => void;
  /** Ids already in this lesson — shown but not selectable. */
  usedProblemIds: number[];
  usedMcqIds: number[];
  onPickProblem: (problemId: number) => void;
  onPickMcq: (mcqId: number) => void;
}

const PAGE_SIZE = 20;

/**
 * Picking a question out of the bank — by far the most-used control in the
 * builder, which is why it is a search-and-filter surface rather than a select.
 *
 * Two kinds of unavailable row, deliberately shown rather than hidden:
 *
 *  - **Already in this lesson.** Hiding it makes a curator search again for
 *    something they already added.
 *  - **In a live competitive contest** (§5.6). Hiding it looks like the problem
 *    does not exist. The row names the contest, because "why can't I add this?"
 *    has an answer and a curator who isn't told it will assume a bug.
 */
export const QuestionPicker = ({
  open,
  onClose,
  usedProblemIds,
  usedMcqIds,
  onPickProblem,
  onPickMcq,
}: QuestionPickerProps) => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [usage, setUsage] = useState<Record<number, ProblemUsage>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: dsaData, isLoading: loadingDsa } = useDsaProblemsQuery(
    1,
    PAGE_SIZE,
    debounced || undefined,
    open,
  );
  const { data: mcqData, isLoading: loadingMcq } = useMcqQuestionsQuery(
    1,
    PAGE_SIZE,
    debounced || undefined,
    open,
  );

  const problems = useMemo(() => dsaData?.problems ?? [], [dsaData]);

  // Contest availability is per-problem and not on the list payload, so it is
  // fetched for the visible page only. Failures degrade to "no known blocker"
  // rather than blocking the picker — the server re-checks on attach anyway,
  // so the worst case is a clear error one click later instead of a greyed row.
  useEffect(() => {
    if (!open || problems.length === 0) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        problems.map(async (problem) => {
          try {
            return [problem.id, await learnApi.getProblemUsage(problem.id)] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;
      setUsage(Object.fromEntries(results.filter((r): r is NonNullable<typeof r> => r !== null)));
    })();

    return () => {
      cancelled = true;
    };
  }, [open, problems]);

  const usedProblems = new Set(usedProblemIds);
  const usedMcqs = new Set(usedMcqIds);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a question</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the question bank…"
            className="arena-input w-full pl-9"
          />
        </div>

        <Tabs defaultValue="dsa">
          <TabsList>
            <TabsTrigger value="dsa">Problems</TabsTrigger>
            <TabsTrigger value="mcq">MCQs</TabsTrigger>
          </TabsList>

          <TabsContent value="dsa">
            <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
              {loadingDsa ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))
              ) : problems.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No problems match that search.
                </p>
              ) : (
                problems.map((problem) => {
                  const alreadyUsed = usedProblems.has(problem.id);
                  const blocking = usage[problem.id]?.blockingContest ?? null;
                  const notPublic = problem.visibility !== "public";
                  const disabled = alreadyUsed || blocking !== null;

                  return (
                    <button
                      key={problem.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onPickProblem(problem.id);
                        onClose();
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border border-transparent transition-colors",
                        disabled
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-muted/50 hover:border-border",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-sm text-foreground truncate">
                          {problem.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {problem.difficulty}
                          </Badge>
                          {alreadyUsed && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Check className="w-3 h-3" />
                              Added
                            </Badge>
                          )}
                        </div>
                      </div>

                      {blocking && (
                        <p className="mt-1.5 text-xs text-amber-400/90 flex items-center gap-1.5">
                          <Lock className="w-3 h-3 shrink-0" />
                          In "{blocking.title}" — a competitive contest that hasn't finished.
                        </p>
                      )}

                      {!blocking && notPublic && (
                        <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {problem.visibility === "draft" ? "Draft" : "Contest only"} — make it
                          public before publishing this path.
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="mcq">
            <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
              {loadingMcq ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))
              ) : (mcqData?.questions ?? []).length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No MCQs match that search.
                </p>
              ) : (
                (mcqData?.questions ?? []).map((question) => {
                  const alreadyUsed = usedMcqs.has(question.id);
                  const notPublic = question.visibility !== "public";

                  return (
                    <button
                      key={question.id}
                      type="button"
                      disabled={alreadyUsed}
                      onClick={() => {
                        onPickMcq(question.id);
                        onClose();
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border border-transparent transition-colors",
                        alreadyUsed
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-muted/50 hover:border-border",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground line-clamp-1">
                          {question.questionText}
                        </span>
                        {alreadyUsed && (
                          <Badge variant="outline" className="text-xs gap-1 shrink-0">
                            <Check className="w-3 h-3" />
                            Added
                          </Badge>
                        )}
                      </div>

                      {notPublic && (
                        <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {question.visibility === "draft" ? "Draft" : "Contest only"} — make it
                          public before publishing this path.
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
