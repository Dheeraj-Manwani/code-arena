import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, Navigate, useBlocker, useBeforeUnload } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import ContestHeader from "./ContestHeader";
import MCQQuestion from "./MCQQuestion";
import DSAQuestion from "./DSAQuestion";
import ResultsPage from "./ResultsPage";
import { useContestAttemptQuery } from "@/queries/contest.queries";
import { useSaveMcqDraftMutation, useSaveDsaDraftMutation } from "@/queries/submission.mutations";
import { useContestAttemptStore } from "@/stores/contestAttempt.store";
import type { Contest } from "@/schema/contest.schema";
import type { ContestDsa, ContestMcq, ContestQuestion } from "@/schema/problem.schema";
import { ContestSubmitDialog } from "../common/ContestSubmitDialog";
import ContestNavigationFooter from "./ContestNavigationFooter";
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
  const {
    mcqAnswers,
    dsaAnswers,
    submittedQuestionIds,
    setActiveContest,
    setMcqAnswer,
    setDsaAnswer,
    markSubmitted,
    hasSubmitted,
    reset,
  } = useContestAttemptStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isContestComplete, setIsContestComplete] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [startTime] = useState(Date.now());

  const { data: contestAttemptData, isLoading, isError } = useContestAttemptQuery(contestId, attemptId);
  const saveMcqDraftMutation = useSaveMcqDraftMutation();
  const saveDsaDraftMutation = useSaveDsaDraftMutation();

  const contestData = contestAttemptData?.contest;

  // Use attempt's startedAt/deadlineAt for timer; fallback to contest duration for display
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

    const c = contestData as Contest & { questions?: Array<{ order?: number; mcq?: unknown; dsa?: unknown }> };
    const questions: ContestQuestion[] = [];

    if (c.questions && Array.isArray(c.questions)) {
      for (const [index, q] of c.questions.entries()) {
        if (!q) continue;
        if (q.mcq) {
          questions.push({
            ...q.mcq,
            order: index,
            type: "mcq",
          } as ContestMcq);
        } else if (q.dsa) {
          questions.push({
            ...q.dsa,
            order: index,
            type: "dsa",
          } as ContestDsa);
        }
      }
    }

    return questions;
  }, [contestData]);

  // Hydrate store from server draft answers once per attempt (on load/refresh)
  const hasHydratedDrafts = useRef(false);
  useEffect(() => {
    if (!contestAttemptData || hasHydratedDrafts.current || contestQuestions.length === 0) return;
    hasHydratedDrafts.current = true;
    const drafts = contestAttemptData.draftAnswers ?? [];

    contestQuestions.forEach((q) => {
      if (q.type !== "dsa") return;
      if (!dsaAnswers[q.id]) {
        const codingQ = q;
        const draftAns = drafts.find((d) => d.problemId === q.id);
        if (draftAns) {
          setDsaAnswer(draftAns.problemId, {
            code: draftAns.code ?? "",
            language: draftAns.language ?? "cpp",
          });
        } else {
          const bp = codingQ.boilerplate;
          const code = (bp?.cpp ?? bp?.python ?? "") || "";
          setDsaAnswer(q.id, { code, language: "cpp" });
        }
      }
    });

    for (const draft of drafts) {
      if (draft.mcqOption != null) {
        setMcqAnswer(draft.problemId, draft.mcqOption);
      }
    }
  }, [contestAttemptData, setMcqAnswer, setDsaAnswer, contestQuestions]);

  const contestInfo = useMemo(() => {
    if (!contestData) return null;

    const durationMinutes =
      durationMinutesFromAttempt ??
      (contestData.maxDurationMs
        ? Math.floor(contestData.maxDurationMs / (60 * 1000))
        : contestData.endTime && contestData.startTime
          ? Math.floor(
            (new Date(contestData.endTime).getTime() - new Date(contestData.startTime).getTime()) /
            (60 * 1000)
          )
          : 90);

    const startTimeForTimer =
      attemptStartedAtMs ?? (startTime as number);

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

  const currentQuestion = contestQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === contestQuestions.length - 1;

  const goToQuestion = (index: number) => {
    const i = Math.max(0, Math.min(index, contestQuestions.length - 1));
    setCurrentQuestionIndex(i);
  };

  const isAttempted = (q: ContestQuestion) => {
    if (q.type === "mcq") return mcqAnswers[q.id] != null;
    return hasSubmitted(q.id);
  };

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowNavigationRef.current &&
      !isContestComplete &&
      currentLocation.pathname !== nextLocation.pathname
  );

  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (!isContestComplete) {
        e.preventDefault();
        e.returnValue = LEAVE_MESSAGE;
        return LEAVE_MESSAGE;
      }
    },
    [isContestComplete]
  );
  useBeforeUnload(handleBeforeUnload, { capture: true });

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const ok = window.confirm(LEAVE_MESSAGE);
    ok ? blocker.proceed() : blocker.reset();
  }, [blocker.state]);


  useEffect(() => {
    setActiveContest(contestId, attemptId);
    hasHydratedDrafts.current = false;
  }, [contestId, attemptId, setActiveContest]);

  useEffect(() => {
    if (isError) {
      toast.error("Attempt not found");
      allowNavigationRef.current = true;
      navigate(`/contest/${contestId}/details`);
    }
  }, [isError, contestId, navigate]);

  useEffect(() => {
    if (!isLoading && !contestData && !isError) {
      toast.error("Contest not found");
      allowNavigationRef.current = true;
      navigate("/dashboard");
    }
  }, [isLoading, contestData, contestId, isError, navigate]);

  // Redirect if attempt is already submitted / ended
  useEffect(() => {
    if (isLoading || !contestAttemptData || contestAttemptData.status === "in_progress") return;
    allowNavigationRef.current = true;
    navigate(`/results/${contestAttemptData.id}`, { replace: true });
  }, [isLoading, contestAttemptData?.id, contestAttemptData?.status, navigate]);

  const handleMCQAnswer = (answerId: number) => {
    setMcqAnswer(currentQuestion.id, answerId);
    saveMcqDraftMutation.mutate({
      contestId,
      attemptId,
      questionId: currentQuestion.id,
      data: { selectedOptionIndex: answerId },
    });
  };

  const handleCodeChange = (code: string) => {
    const current = dsaAnswers[currentQuestion.id];
    setDsaAnswer(currentQuestion.id, {
      code,
      language: current?.language ?? "cpp",
    });
  };

  const handleLanguageChange = (language: string, boilerplate?: string) => {
    const current = dsaAnswers[currentQuestion.id];
    setDsaAnswer(currentQuestion.id, {
      code: boilerplate ?? current?.code ?? "",
      language,
    });
  };

  const handleCodingSubmit = async () => {
    if (!hasSubmitted(currentQuestion.id)) {
      const answer = dsaAnswers[currentQuestion.id];
      const code = answer?.code ?? "";
      const language = answer?.language ?? "cpp";
      if (!code.trim()) {
        toast.error("Cannot submit empty solution");
        return;
      }
      try {
        await saveDsaDraftMutation.mutateAsync({
          contestId,
          attemptId,
          problemId: currentQuestion.id,
          data: { code, language },
        });
        markSubmitted(currentQuestion.id);
        toast.success("Solution submitted!");
      } catch {
        toast.error("Failed to submit solution");
      }
    }
  };

  const handleNext = async () => {
    if (currentQuestion.type === "mcq" && !hasSubmitted(currentQuestion.id)) {
      const selectedAnswer = mcqAnswers[currentQuestion.id];
      if (selectedAnswer != null) {
        try {
          // await submitMcqMutation.mutateAsync({
          //   contestId,
          //   questionId: currentQuestion.id,
          //   data: { selectedOptionIndex: selectedAnswer },
          // });
          // markSubmitted(currentQuestion.id);
          toast.success("Answer submitted!");
        } catch (error) {
          toast.error("Failed to submit answer");
          return;
        }
      }
    }

    if (isLastQuestion) {
      setIsContestComplete(true);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleSubmitContest = () => {
    setShowSubmitConfirm(false);
    setIsContestComplete(true);
  };

  const handleRestart = () => {
    reset();
    allowNavigationRef.current = true;
    navigate("/dashboard");
  };



  if (isLoading || !contestData || !contestInfo) {
    return <Loader message="Loading contest" />
  }

  if (contestQuestions.length === 0) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">No Questions Available</h2>
            <p className="text-muted-foreground mb-4">This contest doesn't have any questions yet.</p>
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

  if (isContestComplete) {
    return (
      <ResultsPage
        questions={contestQuestions}
        answers={mcqAnswers}
        onRestart={handleRestart}
      />
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
      />

      <main className="flex-1 min-h-0 overflow-hidden">
        {currentQuestion.type === "mcq" ? (
          <MCQQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            selectedAnswer={mcqAnswers[currentQuestion.id] ?? null}
            onSelectAnswer={handleMCQAnswer}
          />
        ) : (
          <DSAQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            code={dsaAnswers[currentQuestion.id]?.code ?? ""}
            language={dsaAnswers[currentQuestion.id]?.language ?? "cpp"}
            onCodeChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
            onSubmit={handleCodingSubmit}
          />
        )}
      </main>

      <ContestNavigationFooter
        contestQuestions={contestQuestions}
        currentQuestionIndex={currentQuestionIndex}
        goToQuestion={goToQuestion}
        isAttempted={isAttempted}
        isLastQuestion={isLastQuestion}
        onShowSubmitConfirm={() => setShowSubmitConfirm(true)}
        onNext={handleNext}
      />
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
