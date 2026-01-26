import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Plus,
  Import,
  Trash2,
  GripVertical,
  Search,
  Code,
  FileText,
  Info,
  Clock,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import type { McqQuestion, DsaProblem, ContestQuestion } from "@/schema/problem.schema";
import { useMcqQuestionsQuery, useDsaProblemsQuery } from "@/queries/problem.queries";
import { useCreateMcqQuestionMutation, useCreateDsaProblemMutation } from "@/queries/problem.mutations";
import type { AddMcqType, AddDsaType } from "@/schema/problem.schema";
import { McqForm } from "@/components/questions/McqForm";
import { DsaForm } from "@/components/questions/DsaForm";
import { cn, convertHHmmToMilliseconds } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { pageVariants } from "@/lib/animations";
import { useCreateContestMutation } from "@/queries/contest.mutations";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  CreateContestInput,
  ContestStatus,
  ContestType,
} from "@/schema/contest.schema";
import { CreateContestSchema } from "@/schema/contest.schema";
import { StatusInfoModal } from "@/components/contests/StatusInfoModal";

interface ContestFormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  type: ContestType;
  status: ContestStatus;
  maxDurationTime: string;
}



const CreateContest = () => {
  const navigate = useNavigate();
  const { mutate: createContest, isPending: isCreating } =
    useCreateContestMutation();
  const [formData, setFormData] = useState<ContestFormData>({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    type: "competitive",
    status: "draft",
    maxDurationTime: "",
  });

  // Question states - unified list for mixed ordering
  const [contestQuestions, setContestQuestions] = useState<ContestQuestion[]>([]);

  // Modal states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStatusInfoOpen, setIsStatusInfoOpen] = useState(false);

  // Question type states for modals
  const [importQuestionType, setImportQuestionType] = useState<"mcq" | "dsa">("mcq");
  const [createQuestionType, setCreateQuestionType] = useState<"mcq" | "dsa">("mcq");

  // Search states - separate for each question type
  const [mcqSearchQuery, setMcqSearchQuery] = useState("");
  const [dsaSearchQuery, setDsaSearchQuery] = useState("");
  const [debouncedMcqSearch, setDebouncedMcqSearch] = useState("");
  const [debouncedDsaSearch, setDebouncedDsaSearch] = useState("");

  // Drag states
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mcqFormErrors, setMcqFormErrors] = useState<Record<string, string>>({});
  const [dsaFormErrors, setDsaFormErrors] = useState<Record<string, string>>({});

  // Debounce search queries (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMcqSearch(mcqSearchQuery);
    }, 700);
    return () => clearTimeout(timer);
  }, [mcqSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDsaSearch(dsaSearchQuery);
    }, 700);
    return () => clearTimeout(timer);
  }, [dsaSearchQuery]);

  // Fetch questions from API - initial load with limit 10, use search when query exists
  const initialLimit = 10;
  // Only fetch when there's a search query
  const shouldFetchMcq = !!debouncedMcqSearch && debouncedMcqSearch.trim() !== "";
  const shouldFetchDsa = !!debouncedDsaSearch && debouncedDsaSearch.trim() !== "";

  const { data: mcqData, isLoading: isLoadingMcq, isFetching: isFetchingMcq } = useMcqQuestionsQuery(
    1,
    initialLimit,
    debouncedMcqSearch || undefined,
    shouldFetchMcq
  );
  const { data: dsaData, isLoading: isLoadingDsa, isFetching: isFetchingDsa } = useDsaProblemsQuery(
    1,
    initialLimit,
    debouncedDsaSearch || undefined,
    shouldFetchDsa
  );
  const { mutate: createMcq, isPending: isCreatingMcq } = useCreateMcqQuestionMutation();
  const { mutate: createDsa, isPending: isCreatingDsa } = useCreateDsaProblemMutation();

  const isCreatingQuestion = isCreatingMcq || isCreatingDsa;

  // Filter out questions already added to contest
  const availableMcqs = (mcqData?.questions || []).filter(
    (q) => !contestQuestions.some((cq) => cq.type === "mcq" && cq.id === q.id)
  );

  const availableDsa = (dsaData?.problems || []).filter(
    (p) => !contestQuestions.some((cp) => cp.type === "dsa" && cp.id === p.id)
  );

  const filteredMcqs = availableMcqs;
  const filteredDsa = availableDsa;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      // Prepare contest data according to schema
      const contestData: CreateContestInput = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        status: formData.status,
        // Only include startTime and endTime for competitive contests
        ...(formData.type === "competitive" &&
          formData.startTime &&
          formData.endTime && {
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
        }),
        // Include maxDurationMs only for practice contests (convert HH:mm to milliseconds)
        ...(formData.type === "practice" &&
          formData.maxDurationTime &&
          formData.maxDurationTime.trim() !== "" && {
          maxDurationMs: convertHHmmToMilliseconds(formData.maxDurationTime),
        }),
        // Include questions with proper order
        questions: contestQuestions.map((question) => ({
          type: question.type,
          id: question.id,
          order: question.order,
        })),
      };

      // Validate using zod schema
      const result = CreateContestSchema.safeParse(contestData);

      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const path = err.path.join(".");
          if (err.message) {
            fieldErrors[path] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      createContest(contestData, {
        onSuccess: (data) => {
          const contestId = data?.data?.id || data?.id;
          if (!contestId) {
            toast.error("Failed to get contest ID");
            navigate("/dashboard");
            return;
          }

          toast.success("Contest created successfully!");
          navigate(`/contests/${contestId}`);
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.error ||
            error?.message ||
            "Failed to create contest. Please try again.";
          toast.error(errorMessage);
        },
      });
    } catch (error: any) {
      toast.error(error?.message || "An unexpected error occurred");
    }
  };

  const importMcq = (question: McqQuestion) => {
    setContestQuestions([
      ...contestQuestions,
      { ...question, type: "mcq" as const, order: contestQuestions.length + 1 },
    ]);
    toast.success("MCQ added to contest");
  };

  const importDsa = (problem: DsaProblem) => {
    setContestQuestions([
      ...contestQuestions,
      { ...problem, type: "dsa" as const, order: contestQuestions.length + 1 },
    ]);
    toast.success("DSA problem added to contest");
  };

  const removeQuestion = (index: number) => {
    const question = contestQuestions[index];
    setContestQuestions(
      contestQuestions
        .filter((_, i) => i !== index)
        .map((q, idx) => ({ ...q, order: idx + 1 }))
    );
    toast.success(question.type === "mcq" ? "MCQ removed" : "DSA problem removed");
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newQuestions = [...contestQuestions];
    const draggedItem = newQuestions[dragIndex];
    newQuestions.splice(dragIndex, 1);
    newQuestions.splice(index, 0, draggedItem);
    setContestQuestions(newQuestions.map((q, idx) => ({ ...q, order: idx + 1 })));
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  // Create new MCQ
  const handleCreateMcq = (mcqData: AddMcqType) => {
    createMcq(mcqData, {
      onSuccess: (response) => {
        const createdMcq = response.data;
        const mcq: ContestQuestion = {
          ...createdMcq,
          type: "mcq" as const,
          options: Array.isArray(createdMcq.options)
            ? createdMcq.options
            : typeof createdMcq.options === "string"
              ? JSON.parse(createdMcq.options)
              : [],
          createdAt: typeof createdMcq.createdAt === "string"
            ? new Date(createdMcq.createdAt)
            : createdMcq.createdAt,
          order: contestQuestions.length + 1,
        };
        setContestQuestions([...contestQuestions, mcq]);
        setIsCreateOpen(false);
        setMcqFormErrors({});
        toast.success("MCQ created and added");
      },
      onError: (error: any) => {
        const errorMessage =
          error?.response?.data?.error ||
          error?.message ||
          "Failed to create MCQ question. Please try again.";
        toast.error(errorMessage);
      },
    });
  };

  // Create new DSA
  const handleCreateDsa = (dsaData: AddDsaType) => {
    createDsa(dsaData, {
      onSuccess: (response) => {
        const createdDsa = response.data;
        const dsa: ContestQuestion = {
          ...createdDsa,
          type: "dsa" as const,
          createdAt: typeof createdDsa.createdAt === "string"
            ? new Date(createdDsa.createdAt)
            : createdDsa.createdAt,
          testCases: createdDsa.testCases || [],
          order: contestQuestions.length + 1,
        };
        setContestQuestions([...contestQuestions, dsa]);
        setIsCreateOpen(false);
        setDsaFormErrors({});
        toast.success("DSA problem created and added");
      },
      onError: (error: any) => {
        const errorMessage =
          error?.response?.data?.error ||
          error?.message ||
          "Failed to create DSA problem. Please try again.";
        toast.error(errorMessage);
      },
    });
  };

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            New Contest
          </h1>
          <p className="text-muted-foreground">
            Create a new coding contest with MCQ and DSA problems.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="arena-card space-y-6">
              <div>
                <Label htmlFor="title" className="arena-label">
                  Contest Title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Weekly Code Sprint #45"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) {
                      setErrors({ ...errors, title: "" });
                    }
                  }}
                  disabled={isCreating}
                  className={cn(
                    "arena-input w-full h-10",
                    errors.title && "border-destructive"
                  )}
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="arena-label">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="What is this contest about?"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (errors.description) {
                      setErrors({ ...errors, description: "" });
                    }
                  }}
                  disabled={isCreating}
                  className={cn(
                    "arena-input w-full min-h-[100px] max-h-[250px] overflow-y-auto",
                    errors.description && "border-destructive"
                  )}
                />
                {errors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="type" className="arena-label">
                    Contest Type
                  </Label>

                  <Select
                    value={formData.type}
                    onValueChange={(value) => {
                      const newType = value as "practice" | "competitive";
                      setFormData({
                        ...formData,
                        type: newType,
                        ...(newType === "practice" && {
                          startTime: "",
                          endTime: "",
                        }),
                        ...(newType === "competitive" && {
                          maxDurationTime: "",
                        }),
                      });
                      // Clear related errors when switching types
                      setErrors({});
                    }}
                    disabled={isCreating}
                  >
                    <SelectTrigger id="type" className="w-full h-10 arena-input">
                      <SelectValue placeholder="Select contest type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="competitive">Competitive</SelectItem>
                      <SelectItem value="practice">Practice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="status" className="arena-label">
                      Contest Status
                    </Label>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 group relative -translate-y-1"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsStatusInfoOpen(true);
                      }}
                      title="Click to learn about contest statuses"
                    >
                      <Info className="w-4 h-4 text-blue-500 hover:text-blue-600 transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 animate-pulse hover:animate-none" />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        Learn about statuses
                      </span>
                      <span className="absolute inset-0 rounded-full bg-blue-500/30 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300" />
                    </Button>
                  </div>

                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        status: value as ContestStatus,
                      })
                    }
                    disabled={isCreating}
                  >
                    <SelectTrigger id="status" className="w-full h-10 arena-input">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>

              {formData.type === "competitive" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="arena-label">
                      Start Date & Time{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <DateTimePicker
                      date={
                        formData.startTime
                          ? new Date(formData.startTime)
                          : undefined
                      }
                      onDateChange={(date) => {
                        setFormData({
                          ...formData,
                          startTime: date?.toISOString() || "",
                        });
                        if (errors.startTime) {
                          setErrors({ ...errors, startTime: "" });
                        }
                      }}
                      placeholder="Select start date and time"
                      disabled={isCreating}
                    />
                    {errors.startTime && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.startTime}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="arena-label">
                      End Date & Time{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <DateTimePicker
                      date={
                        formData.endTime
                          ? new Date(formData.endTime)
                          : undefined
                      }
                      onDateChange={(date) => {
                        setFormData({
                          ...formData,
                          endTime: date?.toISOString() || "",
                        });
                        if (errors.endTime) {
                          setErrors({ ...errors, endTime: "" });
                        }
                      }}
                      placeholder="Select end date and time"
                      disabled={isCreating}
                    />
                    {errors.endTime && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.endTime}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {formData.type === "practice" && (
                <div>
                  <Label htmlFor="maxDurationTime" className="arena-label">
                    Max Duration (hh:mm) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="maxDurationTime"
                      type="text"
                      placeholder="HH:mm"
                      value={formData.maxDurationTime}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Allow only digits and colon
                        value = value.replace(/[^\d:]/g, "");
                        // Limit to HH:mm format
                        if (value.length > 5) return;
                        // Auto-format as user types
                        if (value.length === 2 && !value.includes(":")) {
                          value = value + ":";
                        }
                        setFormData({
                          ...formData,
                          maxDurationTime: value,
                        });
                        if (errors.maxDurationMs) {
                          setErrors({ ...errors, maxDurationMs: "" });
                        }
                      }}
                      onBlur={(e) => {
                        // Validate and format on blur
                        const value = e.target.value.trim();
                        if (value && !/^\d{1,2}:\d{2}$/.test(value)) {
                          toast.error("Please enter time in HH:mm format (e.g., 01:30)");
                          setFormData({
                            ...formData,
                            maxDurationTime: "",
                          });
                          return;
                        }
                        // Format to ensure 2 digits for hours and minutes
                        if (value) {
                          const [hours, minutes] = value.split(":");
                          const formattedHours = String(parseInt(hours || "0")).padStart(2, "0");
                          const formattedMinutes = String(parseInt(minutes || "0")).padStart(2, "0");
                          if (parseInt(formattedMinutes) >= 60) {
                            toast.error("Minutes must be less than 60");
                            setFormData({
                              ...formData,
                              maxDurationTime: "",
                            });
                            return;
                          }
                          setFormData({
                            ...formData,
                            maxDurationTime: `${formattedHours}:${formattedMinutes}`,
                          });
                        }
                      }}
                      disabled={isCreating}
                      className={cn(
                        "arena-input w-full h-10 pl-10",
                        errors.maxDurationMs && "border-destructive"
                      )}
                      pattern="[0-9]{2}:[0-9]{2}"
                    />
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.maxDurationMs && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.maxDurationMs}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum duration for contestants to complete the contest. Minimum 1 minute (00:01).
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isCreating}>
                  <Save className="w-4 h-4 mr-2" />
                  {isCreating ? "Creating..." : "Create Contest"}
                </Button>
              </div>
            </form>

            {/* Status Info Modal */}
            <StatusInfoModal
              isOpen={isStatusInfoOpen}
              onClose={() => setIsStatusInfoOpen(false)}
            />

            {/* Questions Section */}
            <div className="arena-card">
              <h2 className="text-xl font-bold text-foreground mb-6">
                Contest Questions
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Drag to reorder • Questions are displayed in the order shown below
                  </p>
                  <div className="flex gap-2">
                    {/* Import Questions Modal */}
                    <Dialog
                      open={isImportOpen}
                      onOpenChange={(open) => {
                        setIsImportOpen(open);
                        if (!open) {
                          // Reset search when modal closes
                          setMcqSearchQuery("");
                          setDsaSearchQuery("");
                          setDebouncedMcqSearch("");
                          setDebouncedDsaSearch("");
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Import className="w-4 h-4 mr-2" />
                          Import
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Import Questions</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          {/* Question Type Selector */}
                          <div className="mb-4">
                            <Label className="arena-label mb-2">Question Type</Label>
                            <Select
                              value={importQuestionType}
                              onValueChange={(value) => {
                                setImportQuestionType(value as "mcq" | "dsa");
                                // Reset search when switching types
                                setMcqSearchQuery("");
                                setDsaSearchQuery("");
                                setDebouncedMcqSearch("");
                                setDebouncedDsaSearch("");
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mcq">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    MCQ Questions
                                  </div>
                                </SelectItem>
                                <SelectItem value="dsa">
                                  <div className="flex items-center gap-2">
                                    <Code className="w-4 h-4" />
                                    DSA Problems
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Search Input */}
                          <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder={
                                importQuestionType === "mcq"
                                  ? "Search MCQ questions..."
                                  : "Search DSA problems..."
                              }
                              value={
                                importQuestionType === "mcq"
                                  ? mcqSearchQuery
                                  : dsaSearchQuery
                              }
                              onChange={(e) => {
                                if (importQuestionType === "mcq") {
                                  setMcqSearchQuery(e.target.value);
                                } else {
                                  setDsaSearchQuery(e.target.value);
                                }
                              }}
                              disabled={isCreating}
                              className="arena-input pl-10"
                            />
                          </div>

                          {/* Search status */}
                          {importQuestionType === "mcq" && debouncedMcqSearch && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Showing search results for &quot;{debouncedMcqSearch}&quot;
                            </p>
                          )}
                          {importQuestionType === "dsa" && debouncedDsaSearch && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Showing search results for &quot;{debouncedDsaSearch}&quot;
                            </p>
                          )}

                          {/* Loading indicator when searching (only show when there's a search query) */}
                          {((isFetchingMcq && importQuestionType === "mcq" && debouncedMcqSearch) ||
                            (isFetchingDsa && importQuestionType === "dsa" && debouncedDsaSearch)) && (
                              <div className="flex items-center justify-center py-2 gap-2 text-sm text-muted-foreground mb-2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                Searching...
                              </div>
                            )}

                          {/* Question List */}
                          <div className="overflow-y-auto max-h-[400px] space-y-2">
                            {importQuestionType === "mcq" ? (
                              !debouncedMcqSearch || debouncedMcqSearch.trim() === "" ? (
                                <div className="text-center py-12 text-muted-foreground">
                                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                  <p className="text-base font-medium">Search questions to import</p>
                                  <p className="text-sm mt-2">Enter a search term to find MCQ questions</p>
                                </div>
                              ) : isLoadingMcq || (!mcqData && isFetchingMcq) ? (
                                // Skeleton loaders for MCQ
                                Array.from({ length: 3 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                                  >
                                    <div className="flex-1 space-y-2">
                                      <Skeleton className="h-4 w-full" />
                                      <Skeleton className="h-3 w-1/3" />
                                    </div>
                                    <Skeleton className="h-9 w-9 rounded-md" />
                                  </div>
                                ))
                              ) : filteredMcqs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  No MCQs found matching &quot;{debouncedMcqSearch}&quot;
                                </div>
                              ) : (
                                filteredMcqs.map((q) => (
                                  <div
                                    key={q.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex-1">
                                      <p className="text-foreground line-clamp-1">
                                        {q.questionText}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {q.options.length} options • {q.points} pts
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => importMcq(q)}
                                      disabled={isCreating}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))
                              )
                            ) : !debouncedDsaSearch || debouncedDsaSearch.trim() === "" ? (
                              <div className="text-center py-12 text-muted-foreground">
                                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="text-base font-medium">Search questions to import</p>
                                <p className="text-sm mt-2">Enter a search term to find DSA problems</p>
                              </div>
                            ) : isLoadingDsa || (!dsaData && isFetchingDsa) ? (
                              // Skeleton loaders for DSA
                              Array.from({ length: 3 }).map((_, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                                >
                                  <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <div className="flex gap-2">
                                      <Skeleton className="h-5 w-16" />
                                      <Skeleton className="h-5 w-16" />
                                      <Skeleton className="h-3 w-12" />
                                    </div>
                                  </div>
                                  <Skeleton className="h-9 w-9 rounded-md" />
                                </div>
                              ))
                            ) : filteredDsa.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                No DSA problems found matching &quot;{debouncedDsaSearch}&quot;
                              </div>
                            ) : (
                              filteredDsa.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex-1">
                                    <p className="font-mono text-foreground">
                                      {p.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {p.tags.slice(0, 2).map((tag) => (
                                        <Badge
                                          key={tag}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                      <span className="text-xs text-muted-foreground">
                                        {p.points} pts
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => importDsa(p)}
                                    disabled={isCreating}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Create Question Modal */}
                    <Dialog
                      open={isCreateOpen}
                      onOpenChange={(open) => {
                        // Prevent closing when submitting
                        if (isCreatingQuestion && !open) {
                          return;
                        }
                        setIsCreateOpen(open);
                        if (!open) {
                          setMcqFormErrors({});
                          setDsaFormErrors({});
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" disabled={isCreating} variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Question
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Create Question</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          {/* Question Type Selector */}
                          <div className="mb-6">
                            <Label className="arena-label mb-2">Question Type</Label>
                            <Select
                              value={createQuestionType}
                              onValueChange={(value) => {
                                setCreateQuestionType(value as "mcq" | "dsa");
                                setMcqFormErrors({});
                                setDsaFormErrors({});
                              }}
                              disabled={isCreatingQuestion}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mcq">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    MCQ Question
                                  </div>
                                </SelectItem>
                                <SelectItem value="dsa">
                                  <div className="flex items-center gap-2">
                                    <Code className="w-4 h-4" />
                                    DSA Problem
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Form based on question type */}
                          {createQuestionType === "mcq" ? (
                            <McqForm
                              onSubmit={handleCreateMcq}
                              onCancel={() => {
                                setIsCreateOpen(false);
                                setMcqFormErrors({});
                              }}
                              isSubmitting={isCreatingMcq}
                              submitLabel={isCreatingMcq ? "Creating..." : "Create & Add"}
                              errors={mcqFormErrors}
                              onErrorsChange={setMcqFormErrors}
                            />
                          ) : (
                            <DsaForm
                              onSubmit={handleCreateDsa}
                              onCancel={() => {
                                setIsCreateOpen(false);
                                setDsaFormErrors({});
                              }}
                              isSubmitting={isCreatingDsa}
                              submitLabel={isCreatingDsa ? "Creating..." : "Create & Add"}
                              errors={dsaFormErrors}
                              onErrorsChange={setDsaFormErrors}
                            />
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {contestQuestions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No questions added yet. Import or create questions to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contestQuestions.map((question, index) => (
                      <div
                        key={`${question.type}-${question.id}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-transparent transition-all",
                          dragIndex === index &&
                          "border-primary/50 bg-primary/5"
                        )}
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <span className="text-sm font-mono text-muted-foreground w-6">
                          {question.order}
                        </span>
                        {question.type === "mcq" ? (
                          <>
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-foreground line-clamp-1">
                                {question.questionText}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {question.points} pts
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Code className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-mono text-foreground">{question.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {question.tags.slice(0, 2).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                <span className="text-xs text-muted-foreground">
                                  {question.points} pts
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                        <button
                          onClick={() => removeQuestion(index)}
                          disabled={isCreating}
                          className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="lg:col-span-1">
            <div className="arena-card border-primary/20">
              <h3 className="font-mono font-semibold text-foreground mb-4">
                Instructions
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <div>
                    <span className="font-medium text-foreground">Contest Type:</span>
                    <ul className="mt-1 ml-4 space-y-1">
                      <li>- <span className="font-medium">Practice:</span> Requires duration</li>
                      <li>- <span className="font-medium">Competitive:</span> Requires start and end time</li>
                    </ul>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Add questions by importing from question bank or creating new ones.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Search questions in the import modal to find existing MCQs or DSA problems.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Drag questions to reorder them in the contest.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Questions are automatically linked when you create the contest.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  DSA problems include test cases with time/memory limits.
                </li>

              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default CreateContest;
