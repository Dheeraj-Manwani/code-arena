import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Calendar,
  Clock,
  Code,
  FileText,
  Loader2,
  BookOpen,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { cn, getContestDuration } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { EditContestModal } from "@/components/contests/EditContestModal";
import type { ContestStatus, ContestWithQuestions } from "@/schema/contest.schema";
import { useContestQuery } from "@/queries/contest.queries";
import { motion } from "motion/react";
import { pageVariants } from "@/lib/animations";

const ContestDetail = () => {
  const { id } = useParams();
  const contestId = id ? parseInt(id) : undefined;

  // Fetch contest data from API
  const {
    data: contestData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useContestQuery(contestId, true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Map API response to Contest type
  const contest: ContestWithQuestions | undefined = useMemo(() => {
    if (!contestData) return undefined;

    const apiContest = contestData;
    return {
      id: apiContest.id,
      title: apiContest.title,
      description: apiContest.description,
      startTime: apiContest.startTime || null,
      endTime: apiContest.endTime || null,
      maxDurationMs: apiContest.maxDurationMs || null,
      type: apiContest.type || "competitive",
      status: apiContest.status || "draft",
      createdAt: apiContest.createdAt || new Date().toISOString(),
      updatedAt: apiContest.updatedAt || new Date().toISOString(),
      creatorId: apiContest.creatorId,
      mcqCount: apiContest.mcqCount || 0,
      dsaCount: apiContest.dsaCount || 0,
      questions: apiContest.questions || [],
    };
  }, [contestData]);

  // Merge and sort questions by order
  const mergedQuestions = useMemo(() => {
    if (!contestData?.questions) {
      // Fallback to old format if questions array doesn't exist
      const mcqs = contest?.questions?.filter((q: any) => q.type === "mcq") || [];
      const dsaProblems = contest?.questions?.filter((q: any) => q.type === "dsa") || [];
      const merged: Array<{
        type: "mcq" | "dsa";
        order: number;
        data: any;
      }> = [];

      mcqs.forEach((mcq: any, index: number) => {
        merged.push({
          type: "mcq",
          order: mcq.order || index + 1,
          data: mcq,
        });
      });

      dsaProblems.forEach((dsa: any, index: number) => {
        merged.push({
          type: "dsa",
          order: dsa.order || mcqs.length + index + 1,
          data: dsa,
        });
      });

      return merged.sort((a, b) => a.order - b.order);
    }

    return contestData.questions
      .map((q: any) => {
        if (q.mcq) {
          return { type: "mcq" as const, order: q.order, data: q.mcq };
        } else if (q.dsa) {
          return { type: "dsa" as const, order: q.order, data: q.dsa };
        }
        return null;
      })
      .filter((q: any) => q !== null)
      .sort((a: any, b: any) => a.order - b.order);
  }, [contestData, contest]);

  const isPractice = contest?.type === "practice";
  // Use questionCount if available (when questions not loaded), otherwise use mergedQuestions length
  const totalQuestions = (contestData as any)?.questionCount ?? mergedQuestions.length;
  const duration = contest ? getContestDuration(contest) : undefined;

  // Loading state (initial load or refetch)
  if (isLoading || isFetching) {
    return (
      <AdminLayout>
        <div className="p-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading contest...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (isError || !contest) {
    return (
      <AdminLayout>
        <div className="p-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Contest not found
            </h1>
            <p className="text-muted-foreground mb-6">
              {error?.message || "The contest you're looking for doesn't exist or you don't have permission to view it."}
            </p>
            <Button asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const getStatusBadgeClass = (status: ContestStatus) => {
    switch (status) {
      case "draft":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "published":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "cancelled":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleContestUpdate = () => {
    refetch(); // Refetch to get updated data
    setIsEditModalOpen(false);
  };

  // Note: Import MCQ/DSA and drag-to-reorder functionality would require additional API endpoints
  // For now, we'll show the existing questions from the API response

  return (
    <AdminLayout>
      <motion.div
        className="p-8"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Back Link */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                {contest.title || "Untitled Contest"}
              </h1>
              {!isPractice && (
                <span
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium capitalize border",
                    getStatusBadgeClass(contest.status)
                  )}
                >
                  {contest.status}
                </span>
              )}
              {isPractice && (
                <span className="px-2 py-1 rounded text-xs font-medium capitalize border bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Practice
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {contest.description || "No description"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Contest
            </Button>
          </div>
        </div>

        {/* Edit Contest Modal */}
        <EditContestModal
          contest={contest}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleContestUpdate}
        />

        {/* Contest Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {!isPractice && contest.startTime && (
            <div className="arena-stat-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Start</span>
              </div>
              <span className="font-mono text-lg text-foreground">
                {format(new Date(contest.startTime), "MMM d, HH:mm")}
              </span>
            </div>
          )}
          {!isPractice && contest.endTime && (
            <div className="arena-stat-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">End</span>
              </div>
              <span className="font-mono text-lg text-foreground">
                {format(new Date(contest.endTime), "MMM d, HH:mm")}
              </span>
            </div>
          )}
          {!isPractice && duration && (
            <div className="arena-stat-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Duration</span>
              </div>
              <span className="font-mono text-lg text-foreground">
                {duration}
              </span>
            </div>
          )}
          {isPractice && (
            <div className="arena-stat-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Type</span>
              </div>
              <span className="font-mono text-lg text-foreground">
                Practice Contest
              </span>
            </div>
          )}
          <div className="arena-stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm">Questions</span>
            </div>
            <span className="font-mono text-lg text-foreground">
              {totalQuestions} Questions
            </span>
          </div>
        </div>

        {/* Questions Section - Merged List */}
        <div className="arena-card">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Contest Questions
            </h2>
            <p className="text-sm text-muted-foreground">
              Questions are displayed in the order they will appear in the contest
            </p>
          </div>

          {totalQuestions === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No questions added yet.</p>
              <p className="text-sm">
                Use the Edit Contest feature to add questions to this contest.
              </p>
            </div>
          ) : mergedQuestions.length === 0 && totalQuestions > 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">{totalQuestions} question{totalQuestions !== 1 ? 's' : ''} in this contest</p>
              <p className="text-sm">
                Click &quot;Edit Contest&quot; to view and manage questions.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {mergedQuestions.map((item: any) => {
                if (item.type === "mcq") {
                  const question = item.data;
                  return (
                    <div
                      key={`mcq-${question.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-mono text-muted-foreground w-6">
                        {item.order}
                      </span>
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-foreground line-clamp-1">
                          {question.questionText || "Untitled Question"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Array.isArray(question.options)
                            ? `${question.options.length} options`
                            : "N/A"}{" "}
                          • {question.points || 0} pts
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        MCQ
                      </Badge>
                    </div>
                  );
                } else {
                  const problem = item.data;
                  return (
                    <div
                      key={`dsa-${problem.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-mono text-muted-foreground w-6">
                        {item.order}
                      </span>
                      <Code className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-mono text-foreground">
                          {problem.title || "Untitled Problem"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {Array.isArray(problem.tags) &&
                            problem.tags.slice(0, 2).map((tag: string) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          <span className="text-xs text-muted-foreground">
                            {problem.points || 0} pts • {problem.timeLimit || 0}
                            ms • {problem.memoryLimit || 0}MB
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        DSA
                      </Badge>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default ContestDetail;
