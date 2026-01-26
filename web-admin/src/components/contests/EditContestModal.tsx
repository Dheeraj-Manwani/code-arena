import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { Info, Clock } from "lucide-react";
import type { Contest, ContestStatus } from "@/schema/contest.schema";
import { useUpdateContestMutation } from "@/queries/contest.mutations";
import { useParams } from "react-router-dom";
import { type UpdateContestInput, UpdateContestSchema } from "@/schema/contest.schema";
import { StatusInfoModal } from "@/components/contests/StatusInfoModal";
import { cn, convertHHmmToMilliseconds } from "@/lib/utils";
import { useCreateMcqQuestionMutation, useCreateDsaProblemMutation } from "@/queries/problem.mutations";
import { contestApi } from "@/api/contest";
import type { AddDsaType, AddMcqType } from "@/schema/problem.schema";
import { CreateQuestionDialog } from "./CreateQuestionDialog";
import { ContestQuestionsList } from "./ContestQuestionsList";
import type { ContestQuestion } from "./ContestQuestionItem";
import type { McqQuestion, DsaProblem } from "@/schema/problem.schema";

// Helper function to convert milliseconds to HH:mm format
const convertMillisecondsToHHmm = (ms: number | null | undefined): string => {
  if (!ms || ms <= 0) return "";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

interface EditContestModalProps {
  contest: Contest | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedContest: Partial<Contest>) => void;
}

export const EditContestModal = ({
  contest,
  isOpen,
  onClose,
  onUpdate,
}: EditContestModalProps) => {
  const { id } = useParams();
  const contestId = parseInt(id || "0");
  const { mutate: updateContest, isPending: isUpdating } =
    useUpdateContestMutation();
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    type: "practice" | "competitive";
    status?: ContestStatus;
    maxDurationTime?: string;
  }>({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    type: "competitive",
    status: "draft",
    maxDurationTime: "",
  });

  const [isStatusInfoOpen, setIsStatusInfoOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Question management states
  const [contestQuestions, setContestQuestions] = useState<ContestQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Modal states for question management
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Drag states
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Form errors
  const [mcqFormErrors, setMcqFormErrors] = useState<Record<string, string>>({});
  const [dsaFormErrors, setDsaFormErrors] = useState<Record<string, string>>({});

  const { mutate: createMcq, isPending: isCreatingMcq } = useCreateMcqQuestionMutation();
  const { mutate: createDsa, isPending: isCreatingDsa } = useCreateDsaProblemMutation();

  // Fetch contest questions when modal opens
  useEffect(() => {
    const fetchContestQuestions = async () => {
      if (!contest || !isOpen || !contestId) return;
      setIsLoadingQuestions(true);
      try {
        const contestData = await contestApi.getContestById(contestId, true);
        // Parse questions from the API response
        if (contestData?.data?.questions) {
          const questions = contestData.data.questions
            .sort((a: any, b: any) => a.order - b.order)
            .map((q: any) => {
              // Check if it's an MCQ question
              if (q.mcq) {
                return {
                  id: q.mcq.id,
                  type: "mcq" as const,
                  order: q.order,
                  questionText: q.mcq.questionText,
                  points: q.mcq.points || 0,
                  options: q.mcq.options,
                };
              }
              // Check if it's a DSA problem
              if (q.dsa) {
                return {
                  id: q.dsa.id,
                  type: "dsa" as const,
                  order: q.order,
                  title: q.dsa.title,
                  points: q.dsa.points || 0,
                  tags: q.dsa.tags,
                };
              }
              return null;
            })
            .filter((q: any) => q !== null) as ContestQuestion[];
          setContestQuestions(questions);
        } else {
          // Fallback to empty array if no questions
          setContestQuestions([]);
        }
      } catch (error) {
        console.error("Failed to fetch contest questions:", error);
        setContestQuestions([]);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchContestQuestions();
  }, [contest, isOpen, contestId]);


  useEffect(() => {
    if (contest && isOpen) {
      const startTime = contest.startTime
        ? typeof contest.startTime === "string"
          ? contest.startTime
          : new Date(contest.startTime).toISOString()
        : "";
      const endTime = contest.endTime
        ? typeof contest.endTime === "string"
          ? contest.endTime
          : new Date(contest.endTime).toISOString()
        : "";

      // Convert milliseconds to HH:mm format
      const maxDurationTime = convertMillisecondsToHHmm(contest.maxDurationMs);

      setFormData({
        title: contest.title || "",
        description: contest.description || "",
        startTime,
        endTime,
        type: contest.type || "competitive",
        status: contest.status || "draft",
        maxDurationTime,
      });
    }
  }, [contest, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contest) return;
    setErrors({});

    try {
      // Prepare update data according to schema
      const updateData: UpdateContestInput = {
        ...(formData.title !== undefined && { title: formData.title.trim() }),
        ...(formData.description !== undefined && {
          description: formData.description.trim(),
        }),
        ...(formData.type !== undefined && { type: formData.type }),
        ...(formData.status !== undefined && { status: formData.status }),
      };

      // Handle fields based on contest type
      if (formData.type === "competitive") {
        // For competitive contests, require startTime and endTime
        if (formData.startTime && formData.endTime) {
          updateData.startTime = new Date(formData.startTime).toISOString();
          updateData.endTime = new Date(formData.endTime).toISOString();
        }
        // Always set maxDurationMs to null for competitive contests
        updateData.maxDurationMs = null;
      } else if (formData.type === "practice") {
        // For practice contests, explicitly set startTime and endTime to null to clear them
        updateData.startTime = null;
        updateData.endTime = null;
        // Convert HH:mm to milliseconds for practice contests
        // If maxDurationTime is provided, convert it; otherwise let schema validation catch it
        if (formData.maxDurationTime && formData.maxDurationTime.trim() !== "") {
          updateData.maxDurationMs = convertHHmmToMilliseconds(formData.maxDurationTime);
        }
        // If maxDurationTime is empty, don't include it - schema will validate and show error
      }

      // Include questions in update data
      updateData.questions = contestQuestions.map((question) => ({
        type: question.type,
        id: question.id,
        order: question.order,
      }));

      // Validate using zod schema
      const result = UpdateContestSchema.safeParse(updateData);

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

      // Update contest with all changes (including questions) in one request
      updateContest(
        { contestId, data: updateData },
        {
          onSuccess: () => {
            const updatedContest: Partial<Contest> = {
              ...contest,
              ...updateData,
              // Convert ISO strings back to Date objects if needed
              ...(updateData.startTime && {
                startTime: updateData.startTime,
              }),
              ...(updateData.endTime && {
                endTime: updateData.endTime,
              }),
            };
            onUpdate(updatedContest);
            toast.success("Contest updated successfully!");
            onClose();
          },
          onError: (error: any) => {
            const errorMessage =
              error?.response?.data?.error ||
              error?.message ||
              "Failed to update contest. Please try again.";
            toast.error(errorMessage);
          },
        }
      );
    } catch (error: any) {
      toast.error(error?.message || "An unexpected error occurred");
    }
  };

  // Question handlers - these now only update local state
  const importMcq = (question: McqQuestion) => {
    const newOrder = contestQuestions.length + 1;
    setContestQuestions([
      ...contestQuestions,
      {
        id: question.id,
        type: "mcq",
        order: newOrder,
        questionText: question.questionText,
        points: question.points,
        options: question.options,
      },
    ]);
  };

  const importDsa = (problem: DsaProblem) => {
    const newOrder = contestQuestions.length + 1;
    setContestQuestions([
      ...contestQuestions,
      {
        id: problem.id,
        type: "dsa",
        order: newOrder,
        title: problem.title,
        points: problem.points,
        tags: problem.tags,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setContestQuestions(
      contestQuestions
        .filter((_, i) => i !== index)
        .map((q, idx) => ({ ...q, order: idx + 1 }))
    );
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
  const handleDragEnd = () => {
    setDragIndex(null);
  };

  // Create new MCQ - only create the question, link it when updating contest
  const handleCreateMcq = (mcqData: AddMcqType) => {
    createMcq(mcqData, {
      onSuccess: (response) => {
        const createdMcq = response.data;
        const newOrder = contestQuestions.length + 1;
        setContestQuestions([
          ...contestQuestions,
          {
            id: createdMcq.id,
            type: "mcq",
            order: newOrder,
            questionText: createdMcq.questionText,
            points: createdMcq.points,
            options: Array.isArray(createdMcq.options)
              ? createdMcq.options
              : typeof createdMcq.options === "string"
                ? JSON.parse(createdMcq.options)
                : [],
          },
        ]);
        setIsCreateOpen(false);
        setMcqFormErrors({});
        toast.success("MCQ question created and added to contest!");
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

  // Create new DSA - only create the problem, link it when updating contest
  const handleCreateDsa = (dsaData: AddDsaType) => {
    createDsa(dsaData, {
      onSuccess: (response) => {
        const createdDsa = response.data;
        const newOrder = contestQuestions.length + 1;
        setContestQuestions([
          ...contestQuestions,
          {
            id: createdDsa.id,
            type: "dsa",
            order: newOrder,
            title: createdDsa.title,
            points: createdDsa.points,
            tags: createdDsa.tags,
          },
        ]);
        setIsCreateOpen(false);
        setDsaFormErrors({});
        toast.success("DSA problem created and added to contest!");
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

  if (!contest) return null;

  return (
    <>
      <CreateQuestionDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreateMcq={handleCreateMcq}
        onCreateDsa={handleCreateDsa}
        isCreatingMcq={isCreatingMcq}
        isCreatingDsa={isCreatingDsa}
        mcqFormErrors={mcqFormErrors}
        dsaFormErrors={dsaFormErrors}
        onMcqErrorsChange={setMcqFormErrors}
        onDsaErrorsChange={setDsaFormErrors}
      />

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl w-full bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-xl">Edit Contest</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <Label htmlFor="title" className="arena-label">
                Contest Title
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="Weekly Coding Challenge"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (errors.title) {
                    setErrors({ ...errors, title: "" });
                  }
                }}
                disabled={isUpdating}
                className={cn(
                  "arena-input w-full h-10",
                  errors.title && "border-destructive"
                )}
                required
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
                placeholder="Describe the contest, rules, and prizes..."
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) {
                    setErrors({ ...errors, description: "" });
                  }
                }}
                disabled={isUpdating}
                className={cn(
                  "arena-input w-full min-h-[100px] max-h-[250px] overflow-y-auto",
                  errors.description && "border-destructive"
                )}
                required
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
                  disabled={isUpdating}
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
                  disabled={isUpdating}
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
                    Start Date & Time <span className="text-destructive">*</span>
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
                        startTime: date?.toISOString() ?? "",
                      });
                      if (errors.startTime) {
                        setErrors({ ...errors, startTime: "" });
                      }
                    }}
                    placeholder="Select start date and time"
                    disabled={isUpdating}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.startTime}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="arena-label">
                    End Date & Time <span className="text-destructive">*</span>
                  </Label>
                  <DateTimePicker
                    date={
                      formData.endTime ? new Date(formData.endTime) : undefined
                    }
                    onDateChange={(date) => {
                      setFormData({
                        ...formData,
                        endTime: date?.toISOString() ?? "",
                      });
                      if (errors.endTime) {
                        setErrors({ ...errors, endTime: "" });
                      }
                    }}
                    placeholder="Select end date and time"
                    disabled={isUpdating}
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
                    value={formData.maxDurationTime || ""}
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
                    disabled={isUpdating}
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

            {/* Questions Section */}
            <ContestQuestionsList
              questions={contestQuestions}
              isLoading={isLoadingQuestions}
              dragIndex={dragIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onRemove={removeQuestion}
              onImportMcq={importMcq}
              onImportDsa={importDsa}
              onCreateQuestion={() => setIsCreateOpen(true)}
              isImportOpen={isImportOpen}
              onImportOpenChange={setIsImportOpen}
              disabled={isUpdating}
            />

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Update Contest"}
              </Button>
            </div>
          </form>

          {/* Status Info Modal */}
          <StatusInfoModal
            isOpen={isStatusInfoOpen}
            onClose={() => setIsStatusInfoOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
