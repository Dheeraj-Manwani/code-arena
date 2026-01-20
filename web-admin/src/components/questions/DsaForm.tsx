import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Clock, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddDsaSchema } from "@/schema/contest.schema";
import type { AddDsaType } from "@/schema/contest.schema";

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface DsaFormProps {
  initialData?: Partial<AddDsaType>;
  onSubmit: (data: AddDsaType) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  errors?: Record<string, string>;
  onErrorsChange?: (errors: Record<string, string>) => void;
}

export const DsaForm = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Create DSA Problem",
  errors = {},
  onErrorsChange,
}: DsaFormProps) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    tags: initialData?.tags?.join(", ") || "",
    points: initialData?.points || 100,
    timeLimit: initialData?.timeLimit || 2000,
    memoryLimit: initialData?.memoryLimit || 256,
    difficulty: (initialData?.difficulty as "easy" | "medium" | "hard") || "",
    maxDurationMs: initialData?.maxDurationMs
      ? String(Math.round(initialData.maxDurationMs / 60000))
      : "",
  });
  const [testCases, setTestCases] = useState<TestCase[]>(
    initialData?.testCases && initialData.testCases.length > 0
      ? initialData.testCases
      : [{ input: "", expectedOutput: "", isHidden: false }]
  );

  const addTestCase = () => {
    setTestCases([
      ...testCases,
      { input: "", expectedOutput: "", isHidden: false },
    ]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 0) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const updateTestCase = (
    index: number,
    field: keyof TestCase,
    value: string | boolean
  ) => {
    setTestCases(
      testCases.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc))
    );
    if (errors[`testCases.${index}.${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`testCases.${index}.${field}`];
      onErrorsChange?.(newErrors);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const dsaData: AddDsaType = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      points: formData.points,
      timeLimit: formData.timeLimit,
      memoryLimit: formData.memoryLimit,
      ...(formData.difficulty && { difficulty: formData.difficulty }),
      ...(formData.maxDurationMs &&
        formData.maxDurationMs.trim() !== "" && {
          maxDurationMs: parseInt(formData.maxDurationMs) * 60000 || undefined,
        }),
      testCases: testCases.map((tc) => ({
        input: tc.input.trim(),
        expectedOutput: tc.expectedOutput.trim(),
        isHidden: tc.isHidden,
      })),
    };

    // Validate using zod schema
    const result = AddDsaSchema.safeParse(dsaData);

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

    onSubmit(dsaData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="arena-label">Problem Title</Label>
        <Input
          placeholder="e.g. Two Sum"
          value={formData.title}
          onChange={(e) => {
            setFormData({ ...formData, title: e.target.value });
            if (errors.title) {
              const newErrors = { ...errors };
              delete newErrors.title;
              onErrorsChange?.(newErrors);
            }
          }}
          disabled={isSubmitting}
          className={cn(
            "arena-input w-full",
            errors.title && "border-destructive"
          )}
        />
        {errors.title && (
          <p className="text-sm text-destructive mt-1">{errors.title}</p>
        )}
      </div>

      <div>
        <Label className="arena-label">Problem Description</Label>
        <Textarea
          placeholder="Describe the problem clearly..."
          value={formData.description}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value });
            if (errors.description) {
              const newErrors = { ...errors };
              delete newErrors.description;
              onErrorsChange?.(newErrors);
            }
          }}
          disabled={isSubmitting}
          className={cn(
            "arena-input w-full min-h-[200px] resize-y",
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
        <div>
          <Label className="arena-label">Tags (comma-separated)</Label>
          <Input
            placeholder="e.g. Array, Hash Table, Two Pointers"
            value={formData.tags}
            onChange={(e) => {
              setFormData({ ...formData, tags: e.target.value });
              if (errors.tags) {
                const newErrors = { ...errors };
                delete newErrors.tags;
                onErrorsChange?.(newErrors);
              }
            }}
            disabled={isSubmitting}
            className={cn(
              "arena-input w-full",
              errors.tags && "border-destructive"
            )}
          />
          {errors.tags && (
            <p className="text-sm text-destructive mt-1">{errors.tags}</p>
          )}
        </div>
        <div>
          <Label className="arena-label">Difficulty</Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value) => {
              setFormData({
                ...formData,
                difficulty: value as "easy" | "medium" | "hard",
              });
              if (errors.difficulty) {
                const newErrors = { ...errors };
                delete newErrors.difficulty;
                onErrorsChange?.(newErrors);
              }
            }}
            disabled={isSubmitting}
          >
            <SelectTrigger className="arena-input w-full">
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          {errors.difficulty && (
            <p className="text-sm text-destructive mt-1">
              {errors.difficulty}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
          <Label className="arena-label flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time Limit (ms)
          </Label>
          <Input
            type="number"
            value={formData.timeLimit}
            onChange={(e) => {
              setFormData({
                ...formData,
                timeLimit: parseInt(e.target.value) || 0,
              });
              if (errors.timeLimit) {
                const newErrors = { ...errors };
                delete newErrors.timeLimit;
                onErrorsChange?.(newErrors);
              }
            }}
            disabled={isSubmitting}
            className={cn(
              "arena-input w-full",
              errors.timeLimit && "border-destructive"
            )}
          />
          {errors.timeLimit && (
            <p className="text-sm text-destructive mt-1">
              {errors.timeLimit}
            </p>
          )}
        </div>
        <div>
          <Label className="arena-label flex items-center gap-2">
            <Database className="w-4 h-4" />
            Memory Limit (MB)
          </Label>
          <Input
            type="number"
            value={formData.memoryLimit}
            onChange={(e) => {
              setFormData({
                ...formData,
                memoryLimit: parseInt(e.target.value) || 0,
              });
              if (errors.memoryLimit) {
                const newErrors = { ...errors };
                delete newErrors.memoryLimit;
                onErrorsChange?.(newErrors);
              }
            }}
            disabled={isSubmitting}
            className={cn(
              "arena-input w-full",
              errors.memoryLimit && "border-destructive"
            )}
          />
          {errors.memoryLimit && (
            <p className="text-sm text-destructive mt-1">
              {errors.memoryLimit}
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <Label className="arena-label">Test Cases</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Add sample and hidden test cases
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTestCase}
            disabled={isSubmitting}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Test Case
          </Button>
        </div>

        <div className="space-y-4">
          {testCases.map((tc, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-muted/30 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">
                  Test Case #{index + 1}
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={tc.isHidden}
                      onChange={(e) =>
                        updateTestCase(index, "isHidden", e.target.checked)
                      }
                      disabled={isSubmitting}
                      className="rounded border-border"
                    />
                    Hidden
                  </label>
                  {testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestCase(index)}
                      disabled={isSubmitting}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Input
                  </Label>
                  <Textarea
                    value={tc.input}
                    onChange={(e) =>
                      updateTestCase(index, "input", e.target.value)
                    }
                    placeholder="Enter input..."
                    disabled={isSubmitting}
                    className={cn(
                      "arena-input w-full font-mono text-sm h-24",
                      errors[`testCases.${index}.input`] &&
                        "border-destructive"
                    )}
                  />
                  {errors[`testCases.${index}.input`] && (
                    <p className="text-xs text-destructive mt-1">
                      {errors[`testCases.${index}.input`]}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Expected Output
                  </Label>
                  <Textarea
                    value={tc.expectedOutput}
                    onChange={(e) =>
                      updateTestCase(index, "expectedOutput", e.target.value)
                    }
                    placeholder="Enter expected output..."
                    disabled={isSubmitting}
                    className={cn(
                      "arena-input w-full font-mono text-sm h-24",
                      errors[`testCases.${index}.expectedOutput`] &&
                        "border-destructive"
                    )}
                  />
                  {errors[`testCases.${index}.expectedOutput`] && (
                    <p className="text-xs text-destructive mt-1">
                      {errors[`testCases.${index}.expectedOutput`]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {errors.testCases && (
          <p className="text-sm text-destructive mt-2">{errors.testCases}</p>
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
