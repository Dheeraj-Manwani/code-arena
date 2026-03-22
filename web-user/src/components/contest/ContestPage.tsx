import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Navigate,
  useBeforeUnload,
  useBlocker,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";
import ContestHeader from "./ContestHeader";
import MCQQuestion from "./MCQQuestion";
import DSAQuestion from "./DSAQuestion";
import { useContestAttemptQuery } from "@/queries/contest.queries";
import {
  useSubmitContestMutation,
  useSubmitDsaMutation,
  useSubmitMcqMutation,
} from "@/queries/submission.mutations";
import { useContestAttemptStore } from "@/stores/contestAttempt.store";
import type { ContestQuestion } from "@/schema/problem.schema";
import { DEFAULT_LANGUAGE, type Language } from "@/schema/language.schema";
import { ContestSubmitDialog } from "../common/ContestSubmitDialog";
import ContestNavigationFooter from "./ContestNavigationFooter";
import { Allotment } from "allotment";
import ContestLeaderboardPanel from "./ContestLeaderboardPanel";
import { Loader } from "../Loader";

const LEAVE_MESSAGE =
  "Are you sure you want to leave? Your progress may be lost.";

const ContestPage = () => {
  const { contestId: conId, attemptId: attId } = useParams();
  const contestId = conId ? Number(conId) : undefined;
  const attemptId = attId ? Number(attId) : undefined;

  if (!contestId || !attemptId) {
    return <Navigate to="/contests" replace />;
  }

  const navigate = useNavigate();
  const allowNavigationRef = useRef(false);
  const previousQuestionRef = useRef<number | null>(null);
  const initialLoadDoneRef = useRef(false);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [showRankUpdatedTooltip, setShowRankUpdatedTooltip] = useState(false);
  const [startTime] = useState(Date.now());

  const {
    _hasHydrated,
    contestId: storeContestId,
    attemptId: storeAttemptId,
    currentProblemId,
    setCurrentProblem,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    setActiveContest,
    submittedQuestionIds,
    setSubmittedQuestionIds,
    dsaAnswer,
    mcqAnswer,
    setMcqAnswer,
    setDsaCode,
    setDsaAnswer,
    markSubmitted: markSubmittedStore,
    hasSubmitted,
    reset: resetStore,
  } = useContestAttemptStore();

  const {
    data: contestAttemptData,
    isLoading,
    isError,
  } = useContestAttemptQuery(contestId, attemptId);

  const submitMcqMutation = useSubmitMcqMutation();
  const submitDsaMutation = useSubmitDsaMutation();
  const submitContestMutation = useSubmitContestMutation();

  const isSubmitting =
    submitMcqMutation.isPending ||
    submitDsaMutation.isPending ||
    submitContestMutation.isPending;

  const contestData = contestAttemptData?.contest;

  const attemptStartedAtMs = contestAttemptData?.startedAt
    ? new Date(contestAttemptData.startedAt).getTime()
    : null;
  const attemptDeadlineAtMs = contestAttemptData?.deadlineAt
    ? new Date(contestAttemptData.deadlineAt).getTime()
    : null;
  const durationMinutesFromAttempt =
    attemptStartedAtMs != null && attemptDeadlineAtMs != null
      ? Math.max(0, (attemptDeadlineAtMs - attemptStartedAtMs) / (60 * 1000))
      : null;

  const contestQuestions: ContestQuestion[] = useMemo(() => {
    if (!contestData) return [];

    const c = contestData;
    const questions: ContestQuestion[] = [];

    if (c.questions && Array.isArray(c.questions)) {
      for (const [index, q] of c.questions.entries()) {
        if (!q) continue;
        if (q.mcq) {
          questions.push({
            ...q.mcq,
            order: index,
            type: "mcq",
          });
        } else if (q.dsa) {
          questions.push({
            ...q.dsa,
            order: index,
            type: "dsa",
          });
        }
      }
    }

    return questions;
  }, [contestData]);

  // Use store questions when available (after load), else fall back to derived
  const currentQuestion = contestQuestions[currentQuestionIndex];

  const currentDsaLanguage =
    currentQuestion?.type === "dsa"
      ? dsaAnswer?.selectedLanguage ?? DEFAULT_LANGUAGE
      : DEFAULT_LANGUAGE;

  const currentDsaCode =
    currentQuestion?.type === "dsa"
      ? dsaAnswer?.codeByLanguage?.[currentDsaLanguage] ??
      currentQuestion.boilerplate?.[currentDsaLanguage] ??
      ""
      : "";

  const contestInfo = useMemo(() => {
    if (!contestData) return null;

    const durationMinutes =
      durationMinutesFromAttempt ??
      (contestData.maxDurationMs
        ? Math.floor(contestData.maxDurationMs / (60 * 1000))
        : contestData.endTime && contestData.startTime
          ? Math.floor(
            (new Date(contestData.endTime).getTime() -
              new Date(contestData.startTime).getTime()) /
            (60 * 1000)
          )
          : 90);

    const startTimeForTimer = attemptStartedAtMs ?? (startTime as number);

    return {
      title: contestData.title,
      duration: Math.floor(durationMinutes),
      totalQuestions: contestQuestions.length,
      startTime: startTimeForTimer,
    };
  }, [
    contestData,
    contestQuestions.length,
    durationMinutesFromAttempt,
    attemptStartedAtMs,
    startTime,
  ]);

  const isLastQuestion = currentQuestionIndex === contestQuestions.length - 1;

  const goToQuestion = (index: number) => {
    const i = Math.max(0, Math.min(index, contestQuestions.length - 1));
    setCurrentQuestionIndex(i);
  };

  const isAttempted = useCallback(
    (q: ContestQuestion) => {
      if (hasSubmitted(q.id)) {
        return true;
      }
      if (q.id === currentProblemId && q.type === "mcq") {
        return mcqAnswer != null;
      }
      if (q.id === currentProblemId && q.type === "dsa") {
        return dsaAnswer != null && Object.values(dsaAnswer.codeByLanguage ?? {}).some(
          (code) => (code ?? "").trim()
        );
      }
      return false;
    },
    [currentProblemId, dsaAnswer, hasSubmitted, mcqAnswer]
  );

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowNavigationRef.current &&
      currentLocation.pathname !== nextLocation.pathname
  );

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = LEAVE_MESSAGE;
    return LEAVE_MESSAGE;
  }, []);

  useBeforeUnload(handleBeforeUnload, { capture: true });

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const ok = window.confirm(LEAVE_MESSAGE);
    ok ? blocker.proceed() : blocker.reset();
  }, [blocker.state]);

  useEffect(() => {
    if (isError) {
      toast.error("Attempt not found");
      allowNavigationRef.current = true;
      resetStore();
      navigate(`/contest/${contestId}/details`);
    }
  }, [isError, contestId, navigate, resetStore]);

  useEffect(() => {
    if (!isLoading && !contestData && !isError) {
      toast.error("Contest not found");
      allowNavigationRef.current = true;
      resetStore();
      navigate("/dashboard");
    }
  }, [isLoading, contestData, contestId, isError, navigate, resetStore]);

  useEffect(() => {
    if (
      isLoading ||
      !contestAttemptData ||
      contestAttemptData.status === "in_progress"
    ) {
      return;
    }
    allowNavigationRef.current = true;
    resetStore();
    navigate(`/results/${contestAttemptData.id}`, { replace: true });
  }, [
    isLoading,
    contestAttemptData?.id,
    contestAttemptData?.status,
    navigate,
    resetStore,
  ]);

  // Only reset store when navigating to a *different* attempt. Wait for rehydration
  // so we don't clear persisted state (e.g. submittedQuestionIds, mcqAnswer, dsaAnswer) on refresh.
  useEffect(() => {
    if (!_hasHydrated) return;
    if (storeContestId === contestId && storeAttemptId === attemptId) return;
    initialLoadDoneRef.current = false;
    setActiveContest(contestId, attemptId);
  }, [
    _hasHydrated,
    contestId,
    attemptId,
    storeContestId,
    storeAttemptId,
    setActiveContest,
  ]);

  // Load effect: set questions and current question from API, with reconciliation for persisted answers.
  // Run only once per attempt load to avoid overwriting user input on query refetch.
  useEffect(() => {
    if (!contestQuestions.length || !contestAttemptData) return;
    if (initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;

    const serverCurrentId = contestAttemptData.currentProblemId ?? undefined;

    // Derive submitted question IDs from currentProblemId: questions before it in order have been submitted.
    const submittedIdx =
      typeof serverCurrentId === "number"
        ? contestQuestions.findIndex((q) => q.id === serverCurrentId)
        : -1;
    const derivedSubmittedIds =
      submittedIdx > 0
        ? contestQuestions.slice(0, submittedIdx).map((q) => q.id)
        : [];
    setSubmittedQuestionIds(derivedSubmittedIds);
    const storeState = useContestAttemptStore.getState();
    const effectiveCurrentId =
      serverCurrentId ?? undefined;

    if (effectiveCurrentId == null) {
      setCurrentQuestionIndex(0);
      const firstQ = contestQuestions[0];
      if (firstQ) {
        setCurrentProblem(firstQ.id, firstQ.type);
      }
      return;
    }

    const idx = contestQuestions.findIndex((q) => q.id === effectiveCurrentId);
    const targetIdx = idx >= 0 ? idx : 0;
    const targetQuestion = contestQuestions[targetIdx];
    if (!targetQuestion) return;

    setCurrentQuestionIndex(targetIdx);

    // Reconciliation: keep persisted mcqAnswer/dsaAnswer only if they belong to the current question
    const persistedMatchesCurrent =
      storeState.currentProblemId === effectiveCurrentId;

    if (targetQuestion.type === "mcq") {
      const initialMcq = persistedMatchesCurrent
        ? storeState.mcqAnswer ?? undefined
        : undefined;
      setCurrentProblem(targetQuestion.id, "mcq", { mcq: initialMcq });
    } else {
      const dsa = storeState.dsaAnswer;
      const lang =
        persistedMatchesCurrent && dsa
          ? dsa.selectedLanguage
          : DEFAULT_LANGUAGE;
      const code =
        persistedMatchesCurrent && dsa
          ? dsa.codeByLanguage?.[lang] ?? targetQuestion.boilerplate?.[lang] ?? ""
          : targetQuestion.boilerplate?.[lang] ?? "";
      setCurrentProblem(targetQuestion.id, "dsa", {
        dsa: { code, language: lang },
      });
    }
  }, [
    contestQuestions,
    contestAttemptData,
    setCurrentProblem,
    setCurrentQuestionIndex,
    setSubmittedQuestionIds,
  ]);

  // Sync current question to store when user navigates (e.g. next) - hydrate from boilerplate if needed
  useEffect(() => {
    if (!currentQuestion) return;
    if (previousQuestionRef.current === currentQuestion.id) return;
    previousQuestionRef.current = currentQuestion.id;

    if (currentQuestion.type === "dsa") {
      const lang = dsaAnswer?.selectedLanguage ?? DEFAULT_LANGUAGE;
      const code =
        dsaAnswer?.codeByLanguage?.[lang] ??
        currentQuestion.boilerplate?.[lang] ??
        "";
      setCurrentProblem(currentQuestion.id, "dsa", {
        dsa: { code, language: lang },
      });
    } else {
      const selected = currentProblemId === currentQuestion.id ? mcqAnswer : null;
      setCurrentProblem(currentQuestion.id, "mcq", {
        mcq: selected ?? undefined,
      });
    }
  }, [
    currentQuestion,
    currentProblemId,
    dsaAnswer,
    mcqAnswer,
    setCurrentProblem,
  ]);

  const handleMCQAnswer = (answerId: number) => {
    if (currentQuestion?.type !== "mcq") return;
    setMcqAnswer(answerId);
  };

  const handleMCQSubmit = async () => {
    if (currentQuestion?.type !== "mcq") return;
    const selected = mcqAnswer;
    if (selected == null) {
      toast.error("Please choose an answer before submitting.");
      return;
    }

    try {
      await submitMcqMutation.mutateAsync({
        contestId,
        attemptId,
        questionId: currentQuestion.id,
        data: { selectedOptionIndex: selected },
      });
      markSubmittedStore(currentQuestion.id);
      setShowRankUpdatedTooltip(true);
      toast.success("Answer submitted!");

      if (isLastQuestion) {
        await submitContestMutation.mutateAsync({ contestId, attemptId });
        toast.success("Contest submitted!");
        allowNavigationRef.current = true;
        resetStore();
        navigate(`/contest/${contestId}/attempt/${attemptId}/leaderboard`);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } catch {
      toast.error("Unable to submit answer, please try again.");
    }
  };

  const handleCodeChange = (code: string) => {
    if (currentQuestion?.type !== "dsa") return;
    setDsaCode(code);
  };

  const handleLanguageChange = (language: Language, boilerplate?: string) => {
    if (currentQuestion?.type !== "dsa") return;
    const existing =
      dsaAnswer?.codeByLanguage?.[language] ??
      boilerplate ??
      currentQuestion.boilerplate?.[language] ??
      "";
    setDsaAnswer({ language, code: existing });
  };

  const handleCodingSubmit = async () => {
    if (currentQuestion?.type !== "dsa" || hasSubmitted(currentQuestion.id)) {
      return;
    }
    const code = currentDsaCode.trim();
    const language = currentDsaLanguage;
    if (!code) {
      toast.error("Please add some code before submitting.");
      return;
    }

    try {
      await submitDsaMutation.mutateAsync({
        contestId,
        attemptId,
        problemId: currentQuestion.id,
        data: { code, language },
      });
      markSubmittedStore(currentQuestion.id);
      setShowRankUpdatedTooltip(true);
      toast.success("Solution submitted!");

      if (isLastQuestion) {
        await submitContestMutation.mutateAsync({ contestId, attemptId });
        toast.success("Contest submitted!");
        allowNavigationRef.current = true;
        resetStore();
        navigate(`/contest/${contestId}/attempt/${attemptId}/leaderboard`);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } catch {
      toast.error("Unable to submit solution, please retry.");
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setShowSubmitConfirm(true);
      return;
    }
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const handleSubmitContest = async () => {
    setShowSubmitConfirm(false);
    try {
      await submitContestMutation.mutateAsync({ contestId, attemptId });
      toast.success("Contest submitted!");
      allowNavigationRef.current = true;
      resetStore();
      navigate(`/results/${attemptId}`);
    } catch {
      toast.error("Unable to submit contest, please try again.");
    }
  };

  if (isLoading || !contestData || !contestInfo) {
    return <Loader message="Loading contest" />;
  }

  if (contestQuestions.length === 0) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              No Questions Available
            </h2>
            <p className="text-muted-foreground mb-4">
              This contest doesn&apos;t have any questions yet.
            </p>
            <Button
              onClick={() => {
                allowNavigationRef.current = true;
                navigate("/dashboard");
              }}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ContestHeader
        title={contestInfo.title}
        submittedCount={submittedQuestionIds.length}
        totalQuestions={contestInfo.totalQuestions}
        duration={contestInfo.duration}
        startTime={contestInfo.startTime}
        isLeaderboardOpen={isLeaderboardOpen}
        onLeaderboardToggle={() => setIsLeaderboardOpen((prev) => !prev)}
        showRankUpdatedTooltip={showRankUpdatedTooltip}
        onRankUpdatedTooltipSeen={() => setShowRankUpdatedTooltip(false)}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        {isLeaderboardOpen ? (
          <Allotment
            defaultSizes={[75, 25]}
            minSize={200}
            proportionalLayout
            className="h-full"
          >
            <Allotment.Pane minSize={300} preferredSize="75%">
              <main className="h-full min-h-0 overflow-hidden flex flex-col">
                {currentQuestion?.type === "mcq" ? (
                  <MCQQuestion
                    key={currentQuestion.id}
                    question={currentQuestion}
                    selectedAnswer={mcqAnswer ?? null}
                    onSelectAnswer={handleMCQAnswer}
                    onSubmit={handleMCQSubmit}
                    hasSubmitted={submittedQuestionIds.includes(
                      currentQuestion.id
                    )}
                    isSubmitting={isSubmitting}
                    isLastQuestion={isLastQuestion}
                  />
                ) : currentQuestion ? (
                  <DSAQuestion
                    key={currentQuestion.id}
                    question={currentQuestion}
                    code={currentDsaCode}
                    language={currentDsaLanguage}
                    onCodeChange={handleCodeChange}
                    onLanguageChange={handleLanguageChange}
                    onSubmit={handleCodingSubmit}
                    isSubmitting={isSubmitting}
                    isLastQuestion={isLastQuestion}
                  />
                ) : null}
              </main>
            </Allotment.Pane>
            <Allotment.Pane minSize={200} preferredSize="25%">
              <div className="h-full flex flex-col border-l border-border bg-card/95">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                  <span className="font-mono text-sm font-semibold">
                    Live Leaderboard
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsLeaderboardOpen(false)}
                    aria-label="Close leaderboard"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden p-4">
                  <ContestLeaderboardPanel />
                </div>
              </div>
            </Allotment.Pane>
          </Allotment>
        ) : (
          <main className="h-full min-h-0 overflow-hidden flex flex-col">
            {currentQuestion?.type === "mcq" ? (
              <MCQQuestion
                key={currentQuestion.id}
                question={currentQuestion}
                selectedAnswer={mcqAnswer ?? null}
                onSelectAnswer={handleMCQAnswer}
                onSubmit={handleMCQSubmit}
                hasSubmitted={submittedQuestionIds.includes(
                  currentQuestion.id
                )}
                isSubmitting={isSubmitting}
                isLastQuestion={isLastQuestion}
              />
            ) : currentQuestion ? (
              <DSAQuestion
                key={currentQuestion.id}
                question={currentQuestion}
                code={currentDsaCode}
                language={currentDsaLanguage}
                onCodeChange={handleCodeChange}
                onLanguageChange={handleLanguageChange}
                onSubmit={handleCodingSubmit}
                isSubmitting={isSubmitting}
                isLastQuestion={isLastQuestion}
              />
            ) : null}
          </main>
        )}
      </div>

      {/* <ContestNavigationFooter
        contestQuestions={contestQuestions}
        currentQuestionIndex={currentQuestionIndex}
        goToQuestion={goToQuestion}
        isAttempted={isAttempted}
        isLastQuestion={isLastQuestion}
        onShowSubmitConfirm={() => setShowSubmitConfirm(true)}
        onNext={handleNext}
      /> */}

      <ContestSubmitDialog
        isOpen={showSubmitConfirm}
        onOpenChange={setShowSubmitConfirm}
        submittedQuestions={submittedQuestionIds.length}
        contestQuestions={contestQuestions.length}
        handleSubmit={handleSubmitContest}
      />
    </div>
  );
};

export default ContestPage;
