import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/Loader";
import DSAQuestion from "@/components/contest/DSAQuestion";
import PracticeSubmissionsPanel from "@/components/practice/PracticeSubmissionsPanel";
import {
  useProblemQuery,
  usePracticeDraftQuery,
  useSavePracticeDraftMutation,
  useSubmitPracticeMutation,
  usePracticeSubmissionsQuery,
  practiceSubmissionsKey,
} from "@/queries/practice.queries";
import type { SolveProblem, TestCaseUI } from "@/schema/problem.schema";
import type {
  PracticeDraft,
  PracticeProblem,
  SubmissionStatus,
} from "@/schema/practice.schema";
import { DEFAULT_LANGUAGE, LanguageEnum, type Language } from "@/schema/language.schema";
import { useAuthStore } from "@/stores/auth.store";
import { contestWebSocket } from "@/lib/websocket";
import { paths } from "@/lib/paths";
import { ArrowLeft, History, X } from "lucide-react";
import { Allotment } from "allotment";

const VERDICT_TOAST: Record<Exclude<SubmissionStatus, "pending">, string> = {
  accepted: "Accepted — all tests passed!",
  wrong_answer: "Wrong answer",
  time_limit_exceeded: "Time limit exceeded",
  runtime_error: "Runtime error",
};

interface SolveSurfaceProps {
  slug: string;
  problem: PracticeProblem;
  /** Resolved before this renders, so editor state seeds synchronously. */
  draft: PracticeDraft | null;
}

const SolveSurface = ({ slug, problem, draft }: SolveSurfaceProps) => {
  const queryClient = useQueryClient();
  const authUserId = useAuthStore((state) => state.user?.id ?? null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Seeded in the initializer rather than an effect: the draft is already
  // resolved, so there is nothing to sync after mount and no way for a refetch
  // to land on top of code the user is mid-way through typing.
  const [language, setLanguage] = useState<Language>(() => {
    const parsed = LanguageEnum.safeParse(draft?.language);
    return draft?.code && parsed.success ? parsed.data : DEFAULT_LANGUAGE;
  });

  const [codeByLanguage, setCodeByLanguage] = useState<Partial<Record<Language, string>>>(
    () => {
      const parsed = LanguageEnum.safeParse(draft?.language);
      if (draft?.code && parsed.success) {
        return { [parsed.data]: draft.code };
      }
      return { [DEFAULT_LANGUAGE]: problem.boilerplate?.[DEFAULT_LANGUAGE] ?? "" };
    },
  );

  const { data: submissions = [] } = usePracticeSubmissionsQuery(slug);
  const saveDraft = useSavePracticeDraftMutation(slug);
  const submitMutation = useSubmitPracticeMutation(slug);

  /**
   * Practice verdicts arrive on the user room, so this socket carries no
   * contestId (PRACTICE_MODE_AND_NAVIGATION.md §4.2).
   */
  useEffect(() => {
    contestWebSocket.connect();

    const unsubscribe = contestWebSocket.onSubmissionResult((event) => {
      if (event.scope !== "practice") return;
      if (authUserId != null && event.userId !== authUserId) return;

      const label = VERDICT_TOAST[event.status];
      if (event.status === "accepted") {
        toast.success(label);
      } else {
        toast.error(
          `${label} — ${event.testCasesPassed}/${event.totalTestCases} tests passed`,
        );
      }

      // Refetch so the row stops showing "Judging…".
      void queryClient.invalidateQueries({ queryKey: practiceSubmissionsKey(slug) });
      // An accepted verdict flips this user's solved status and moves the
      // problem's acceptance rate, so the detail and catalogue reads are stale.
      void queryClient.invalidateQueries({ queryKey: ["problem", slug] });
      void queryClient.invalidateQueries({ queryKey: ["problems"] });
    });

    return () => {
      unsubscribe();
      contestWebSocket.disconnect();
    };
  }, [authUserId, queryClient, slug]);

  const solveProblem: SolveProblem = useMemo(
    () => ({
      id: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      tags: problem.tags,
      points: problem.points,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      constraints: problem.constraints,
      signature: problem.signature ?? undefined,
      // The API returns sample cases without ids; the panel keys on them.
      testCases: problem.sampleTestCases.map(
        (tc, index): TestCaseUI => ({
          id: index + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        }),
      ),
    }),
    [problem],
  );

  const code = codeByLanguage[language] ?? problem.boilerplate?.[language] ?? "";

  const handleCodeChange = useCallback(
    (next: string) => {
      setCodeByLanguage((prev) => ({ ...prev, [language]: next }));
      // DSAQuestion debounces this (~2s), so it isn't a write per keystroke.
      if (next.trim()) {
        saveDraft.mutate({ code: next, language });
      }
    },
    [language, saveDraft],
  );

  const handleLanguageChange = useCallback(
    (next: Language) => {
      setLanguage(next);
      setCodeByLanguage((prev) => ({
        ...prev,
        [next]: prev[next] ?? problem.boilerplate?.[next] ?? "",
      }));
    },
    [problem],
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Please add some code before submitting.");
      return;
    }

    try {
      await submitMutation.mutateAsync({ code: trimmed, language });
      toast("Submitted — judging…");
      setIsHistoryOpen(true);
    } catch {
      toast.error("Unable to submit, please try again.");
    }
  }, [code, language, submitMutation]);

  const editor = (
    <DSAQuestion
      question={solveProblem}
      code={code}
      language={language}
      onCodeChange={handleCodeChange}
      onLanguageChange={handleLanguageChange}
      onSubmit={handleSubmit}
      isSubmitting={submitMutation.isPending}
      submitLabel="Submit"
    />
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* No countdown and no leave-confirmation prompt: practice has no deadline,
          and leaving mid-problem is normal (§4.6). */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={paths.problem(slug)}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <span className="truncate font-mono text-sm font-semibold text-foreground">
            {problem.title}
          </span>
        </div>

        <Button
          variant={isHistoryOpen ? "secondary" : "ghost"}
          size="sm"
          className="gap-2"
          onClick={() => setIsHistoryOpen((prev) => !prev)}
        >
          <History className="h-4 w-4" />
          Submissions
          {submissions.length > 0 && (
            <span className="text-xs text-muted-foreground">({submissions.length})</span>
          )}
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isHistoryOpen ? (
          <Allotment
            defaultSizes={[75, 25]}
            minSize={200}
            proportionalLayout
            className="h-full"
          >
            <Allotment.Pane minSize={300} preferredSize="75%">
              <main className="flex h-full min-h-0 flex-col overflow-hidden">{editor}</main>
            </Allotment.Pane>
            <Allotment.Pane minSize={220} preferredSize="25%">
              <div className="flex h-full flex-col border-l border-border bg-card/95">
                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                  <span className="font-mono text-sm font-semibold">Submissions</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsHistoryOpen(false)}
                    aria-label="Close submissions"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-3">
                  <PracticeSubmissionsPanel submissions={submissions} />
                </div>
              </div>
            </Allotment.Pane>
          </Allotment>
        ) : (
          <main className="flex h-full min-h-0 flex-col overflow-hidden">{editor}</main>
        )}
      </div>
    </div>
  );
};

const ProblemSolveInner = ({ slug }: { slug: string }) => {
  const navigate = useNavigate();
  const { data: problem, isLoading, isError } = useProblemQuery(slug);
  const { data: draft, isLoading: isDraftLoading } = usePracticeDraftQuery(slug);

  if (isLoading || isDraftLoading) {
    return <Loader message="Loading problem" />;
  }

  if (isError || !problem) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-foreground">Problem Not Found</h2>
          <p className="mb-4 text-muted-foreground">
            This problem doesn&apos;t exist, or isn&apos;t available for practice.
          </p>
          <Button onClick={() => navigate(paths.problems)}>Back to Problems</Button>
        </div>
      </div>
    );
  }

  // `key` so switching problems remounts with freshly seeded editor state.
  return <SolveSurface key={slug} slug={slug} problem={problem} draft={draft ?? null} />;
};

// Param guard above the hook-using component so hooks are never conditional
// (Rules of Hooks — issues.md §6.5, same pattern as ContestPage).
const ProblemSolve = () => {
  const { slug } = useParams();

  if (!slug) {
    return <Navigate to={paths.problems} replace />;
  }

  return <ProblemSolveInner slug={slug} />;
};

export default ProblemSolve;
