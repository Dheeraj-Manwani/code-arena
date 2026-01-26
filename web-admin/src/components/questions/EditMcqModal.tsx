import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { Plus, Trash2, GripVertical, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { McqQuestion } from "@/schema/problem.schema";
import { useUpdateMcqQuestionMutation } from "@/queries/problem.mutations";
import { UpdateMcqSchema, type UpdateMcqType } from "@/schema/problem.schema";

interface EditMcqModalProps {
  question: McqQuestion | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditMcqModal = ({
  question,
  isOpen,
  onClose,
}: EditMcqModalProps) => {
  const { mutate: updateMcq, isPending: isUpdating } =
    useUpdateMcqQuestionMutation();
  const [formData, setFormData] = useState({
    questionText: "",
    points: 10,
    options: [] as string[],
    correctOptionIndex: 0,
    maxDurationMs: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [optionDragIndex, setOptionDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (question && isOpen) {
      const options = Array.isArray(question.options)
        ? question.options
        : typeof question.options === "string"
          ? JSON.parse(question.options)
          : [];

      setFormData({
        questionText: question.questionText || "",
        points: question.points || 10,
        options,
        correctOptionIndex: question.correctOptionIndex || 0,
        maxDurationMs: question.maxDurationMs
          ? String(Math.round(question.maxDurationMs / 60000))
          : "",
      });
      setErrors({});
    }
  }, [question, isOpen]);

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
    if (errors.options) {
      setErrors({ ...errors, options: "" });
    }
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ""],
    });
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      let newCorrectIndex = formData.correctOptionIndex;
      if (index === formData.correctOptionIndex) {
        newCorrectIndex = 0;
      } else if (index < formData.correctOptionIndex) {
        newCorrectIndex = formData.correctOptionIndex - 1;
      }
      setFormData({
        ...formData,
        options: newOptions,
        correctOptionIndex: newCorrectIndex,
      });
    }
  };

  const handleOptionDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      setOptionDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleOptionDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (optionDragIndex === null || optionDragIndex === index) return;

      setFormData((prev) => {
        const newOptions = [...prev.options];
        const draggedItem = newOptions[optionDragIndex];
        newOptions.splice(optionDragIndex, 1);
        newOptions.splice(index, 0, draggedItem);

        let newCorrectIndex = prev.correctOptionIndex;
        if (optionDragIndex === prev.correctOptionIndex) {
          newCorrectIndex = index;
        } else if (
          optionDragIndex < prev.correctOptionIndex &&
          index >= prev.correctOptionIndex
        ) {
          newCorrectIndex = prev.correctOptionIndex - 1;
        } else if (
          optionDragIndex > prev.correctOptionIndex &&
          index <= prev.correctOptionIndex
        ) {
          newCorrectIndex = prev.correctOptionIndex + 1;
        }

        return {
          ...prev,
          options: newOptions,
          correctOptionIndex: newCorrectIndex,
        };
      });
      setOptionDragIndex(index);
    },
    [optionDragIndex]
  );

  const handleOptionDragEnd = useCallback(() => {
    setOptionDragIndex(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;
    setErrors({});

    const updateData: UpdateMcqType = {
      questionText: formData.questionText.trim(),
      options: formData.options.filter((opt) => opt.trim()),
      correctOptionIndex: formData.correctOptionIndex,
      points: formData.points,
      ...(formData.maxDurationMs &&
        formData.maxDurationMs.trim() !== "" && {
        maxDurationMs: parseInt(formData.maxDurationMs) * 60000 || undefined,
      }),
    };

    // Validate using zod schema
    const result = UpdateMcqSchema.safeParse(updateData);

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

    updateMcq(
      { questionId: question.id, data: updateData },
      {
        onSuccess: () => {
          toast.success("MCQ question updated successfully!");
          onClose();
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.error ||
            error?.message ||
            "Failed to update MCQ question. Please try again.";
          toast.error(errorMessage);
        },
      }
    );
  };

  if (!question) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl">Edit MCQ Question</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="arena-label">Question Text</Label>
            <Textarea
              placeholder="Enter your question..."
              value={formData.questionText}
              onChange={(e) => {
                setFormData({ ...formData, questionText: e.target.value });
                if (errors.questionText) {
                  setErrors({ ...errors, questionText: "" });
                }
              }}
              disabled={isUpdating}
              className={cn(
                "arena-input w-full min-h-[120px] resize-y",
                errors.questionText && "border-destructive"
              )}
            />
            {errors.questionText && (
              <p className="text-sm text-destructive mt-1">
                {errors.questionText}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="arena-label">Points</Label>
              <Input
                type="number"
                value={formData.points}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    points: parseInt(e.target.value) || 0,
                  });
                  if (errors.points) {
                    setErrors({ ...errors, points: "" });
                  }
                }}
                disabled={isUpdating}
                className={cn(
                  "arena-input w-full",
                  errors.points && "border-destructive"
                )}
              />
              {errors.points && (
                <p className="text-sm text-destructive mt-1">
                  {errors.points}
                </p>
              )}
            </div>
            <div>
              <Label className="arena-label">Duration (minutes)</Label>
              <Input
                type="number"
                placeholder="Optional"
                value={formData.maxDurationMs}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    maxDurationMs: e.target.value,
                  });
                  if (errors.maxDurationMs) {
                    setErrors({ ...errors, maxDurationMs: "" });
                  }
                }}
                disabled={isUpdating}
                className={cn(
                  "arena-input w-full",
                  errors.maxDurationMs && "border-destructive"
                )}
              />
              {errors.maxDurationMs && (
                <p className="text-sm text-destructive mt-1">
                  {errors.maxDurationMs}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="arena-label">Answer Options</Label>
                <p className="text-sm text-muted-foreground">
                  Drag to reorder, click checkmark to set correct answer
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={isUpdating}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>

            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleOptionDragStart(e, index)}
                  onDragOver={(e) => handleOptionDragOver(e, index)}
                  onDragEnd={handleOptionDragEnd}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-all relative",
                    optionDragIndex === index &&
                    "bg-primary/10 border border-primary/30"
                  )}
                >
                  <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      disabled={isUpdating}
                      className={cn(
                        "arena-input w-full",
                        errors[`options.${index}`] && "border-destructive"
                      )}
                    />
                    {errors[`options.${index}`] && (
                      <p className="text-xs text-destructive mt-1">
                        {errors[`options.${index}`]}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        correctOptionIndex: index,
                      })
                    }
                    disabled={isUpdating}
                    className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center border transition-all",
                      formData.correctOptionIndex === index
                        ? "bg-green-500/20 border-green-500 text-green-500"
                        : "border-border text-muted-foreground hover:border-muted-foreground",
                      isUpdating && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={formData.options.length <= 2 || isUpdating}
                    className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center transition-all",
                      formData.options.length > 2 && !isUpdating
                        ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        : "text-muted-foreground/30 cursor-not-allowed"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.options && (
              <p className="text-sm text-destructive mt-1">{errors.options}</p>
            )}
            {errors.correctOptionIndex && (
              <p className="text-sm text-destructive mt-1">
                {errors.correctOptionIndex}
              </p>
            )}
          </div>

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
              {isUpdating ? "Updating..." : "Update Question"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
