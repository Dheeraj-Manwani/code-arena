import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddMcqSchema, type AddMcqType } from "@/schema/problem.schema";

interface McqFormProps {
  initialData?: Partial<AddMcqType>;
  onSubmit: (data: AddMcqType) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  errors?: Record<string, string>;
  onErrorsChange?: (errors: Record<string, string>) => void;
}

export const McqForm = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Create MCQ Question",
  errors = {},
  onErrorsChange,
}: McqFormProps) => {
  const [formData, setFormData] = useState({
    questionText: initialData?.questionText || "",
    points: initialData?.points || 10,
    options: initialData?.options || ["", "", "", ""],
    correctOptionIndex: initialData?.correctOptionIndex || 0,
    maxDurationMs: initialData?.maxDurationMs
      ? String(Math.round(initialData.maxDurationMs / 60000))
      : "",
  });
  const [optionDragIndex, setOptionDragIndex] = useState<number | null>(null);

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
    if (errors.options) {
      const newErrors = { ...errors };
      delete newErrors.options;
      onErrorsChange?.(newErrors);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const mcqData: AddMcqType = {
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
    const result = AddMcqSchema.safeParse(mcqData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (err.message) {
          fieldErrors[path] = err.message;
        }
      });
      onErrorsChange?.(fieldErrors);
      return;
    }

    onSubmit(mcqData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="arena-label">Question Text</Label>
        <Textarea
          placeholder="Enter your question..."
          value={formData.questionText}
          onChange={(e) => {
            setFormData({ ...formData, questionText: e.target.value });
            if (errors.questionText) {
              const newErrors = { ...errors };
              delete newErrors.questionText;
              onErrorsChange?.(newErrors);
            }
          }}
          disabled={isSubmitting}
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
                const newErrors = { ...errors };
                delete newErrors.points;
                onErrorsChange?.(newErrors);
              }
            }}
            disabled={isSubmitting}
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
                const newErrors = { ...errors };
                delete newErrors.maxDurationMs;
                onErrorsChange?.(newErrors);
              }
            }}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                disabled={isSubmitting}
                className={cn(
                  "w-8 h-8 rounded-md flex items-center justify-center border transition-all",
                  formData.correctOptionIndex === index
                    ? "bg-green-500/20 border-green-500 text-green-500"
                    : "border-border text-muted-foreground hover:border-muted-foreground",
                  isSubmitting && "opacity-50 cursor-not-allowed"
                )}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => removeOption(index)}
                disabled={formData.options.length <= 2 || isSubmitting}
                className={cn(
                  "w-8 h-8 rounded-md flex items-center justify-center transition-all",
                  formData.options.length > 2 && !isSubmitting
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

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : submitLabel}
        </Button>
      </div>
    </form>
  );
};
