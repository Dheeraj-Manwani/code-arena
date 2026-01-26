import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, Send } from "lucide-react";
import { toast } from "react-hot-toast";
import ContestHeader from "./ContestHeader";
import MCQQuestion from "./MCQQuestion";
import DSAQuestion from "./DSAQuestion";
import ResultsPage from "./ResultsPage";
import { useContestQuery } from "@/queries/contest.queries";
import { useSubmitMcqMutation, useSubmitDsaMutation } from "@/queries/submission.mutations";
import type { Contest } from "@/schema/contest.schema";
import type { ContestDsa, ContestMcq, ContestQuestion } from "@/schema/problem.schema";


const ContestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const contestId = id ? parseInt(id) : undefined;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [codeState, setCodeState] = useState<Record<string, { code: string; language: string }>>({});
  const [isContestComplete, setIsContestComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<number>>(new Set());

  const { data: contestData, isLoading } = useContestQuery(contestId, true);
  const submitMcqMutation = useSubmitMcqMutation();
  const submitDsaMutation = useSubmitDsaMutation();

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

  const contestInfo = useMemo(() => {
    if (!contestData) return null;

    const durationMs = contestData.maxDurationMs ||
      (contestData.endTime && contestData.startTime
        ? new Date(contestData.endTime).getTime() - new Date(contestData.startTime).getTime()
        : 90 * 60 * 1000); // Default 90 minutes

    return {
      title: contestData.title,
      duration: Math.floor(durationMs / (60 * 1000)), // Convert to minutes
      totalQuestions: contestQuestions.length,
    };
  }, [contestData, contestQuestions.length]);

  const currentQuestion = contestQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === contestQuestions.length - 1;

  // Initialize code state for coding questions
  useEffect(() => {
    contestQuestions.forEach((q) => {
      if (q.type === "dsa" && !codeState[q.id]) {
        const codingQ = q as ContestDsa;
        setCodeState((prev) => ({
          ...prev,
          [q.id]: {
            code: codingQ.boilerplate["cpp"] || "",
            language: "cpp",
          },
        }));
      }
    });
  }, [contestQuestions]);

  // Redirect if contest not found
  useEffect(() => {
    if (!isLoading && !contestData && contestId) {
      toast.error("Contest not found");
      navigate("/dashboard");
    }
  }, [isLoading, contestData, contestId, navigate]);

  const handleMCQAnswer = (answerId: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answerId,
    }));
  };

  const handleCodeChange = (code: string) => {
    setCodeState((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        code,
      },
    }));
  };

  const handleLanguageChange = (language: string) => {
    setCodeState((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        language,
      },
    }));
  };

  const handleCodingSubmit = async () => {
    const code = codeState[currentQuestion.id]?.code || "";
    const language = codeState[currentQuestion.id]?.language || "cpp";



    // Submit DSA solution
    if (!submittedQuestions.has(currentQuestion.id) && contestId) {
      try {
        await submitDsaMutation.mutateAsync({
          problemId: currentQuestion.id,
          data: { code, language },
        });
        setSubmittedQuestions((prev) => new Set(prev).add(currentQuestion.id));
        toast.success("Solution submitted!");
      } catch (error) {
        toast.error("Failed to submit solution");
      }
    }
  };

  const handleNext = async () => {
    // Submit MCQ answer if current question is MCQ and not yet submitted
    if (currentQuestion.type === "mcq" && !submittedQuestions.has(currentQuestion.id) && contestId) {
      const selectedAnswer = answers[currentQuestion.id];
      if (selectedAnswer) {
        const optionIndex = selectedAnswer;
        try {
          await submitMcqMutation.mutateAsync({
            contestId,
            questionId: currentQuestion.id,
            data: { selectedOptionIndex: optionIndex },
          });
          setSubmittedQuestions((prev) => new Set(prev).add(currentQuestion.id));
          toast.success("Answer submitted!");
        } catch (error) {
          toast.error("Failed to submit answer");
          return; // Don't proceed to next question if submission fails
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
    setIsContestComplete(true);
  };

  const handleRestart = () => {
    navigate("/dashboard");
  };

  const canProceed = () => {
    if (currentQuestion.type === "mcq") {
      return !!answers[currentQuestion.id];
    }
    // For coding questions, allow proceeding after submitting
    return !!answers[currentQuestion.id];
  };

  if (isLoading || !contestData || !contestInfo) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-96 w-full max-w-4xl" />
          </div>
        </div>
      </div>
    );
  }

  if (contestQuestions.length === 0) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">No Questions Available</h2>
            <p className="text-muted-foreground mb-4">This contest doesn't have any questions yet.</p>
            <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isContestComplete) {
    return (
      <ResultsPage
        questions={contestQuestions}
        answers={answers}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ContestHeader
        title={contestInfo.title}
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={contestInfo.totalQuestions}
        duration={contestInfo.duration}
        startTime={startTime}
      />

      <main className="flex-1 min-h-0 overflow-hidden">
        {currentQuestion.type === "mcq" ? (
          <MCQQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            selectedAnswer={answers[currentQuestion.id] || null}
            onSelectAnswer={handleMCQAnswer}
          />
        ) : (
          <DSAQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            code={codeState[currentQuestion.id]?.code || ""}
            language={codeState[currentQuestion.id]?.language || "cpp"}
            onCodeChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
            onSubmit={handleCodingSubmit}
          />
        )}
      </main>

      {/* Navigation Footer */}
      <footer className="bg-card border-t border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {contestQuestions.map((_, index) => (
              <button
                key={index}
                className={`w-8 h-8 rounded-full font-mono text-sm font-medium transition-all ${index === currentQuestionIndex
                  ? "bg-primary text-primary-foreground arena-glow"
                  : index < currentQuestionIndex
                    ? "bg-arena-success/20 text-arena-success"
                    : "bg-secondary text-muted-foreground"
                  }`}
                disabled
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {isLastQuestion ? (
              <Button
                onClick={handleSubmitContest}
                size="lg"
                className="arena-glow"
              >
                <Send className="h-5 w-5 mr-2" />
                Submit Contest
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                size="lg"
                className={canProceed() ? "arena-glow" : ""}
              >
                Next Question
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContestPage;
