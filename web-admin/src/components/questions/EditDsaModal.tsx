import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { Plus, Trash2, Clock, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DsaProblem } from "@/schema/problem.schema";
import { useUpdateDsaProblemMutation } from "@/queries/problem.mutations";
import { UpdateDsaSchema } from "@/schema/contest.schema";
import type { UpdateDsaType } from "@/schema/contest.schema";
import { problemApi } from "@/api/problem";

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface EditDsaModalProps {
  problem: DsaProblem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditDsaModal = ({
  problem,
  isOpen,
  onClose,
}: EditDsaModalProps) => {
  const { mutate: updateDsa, isPending: isUpdating } =
    useUpdateDsaProblemMutation();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
    points: 100,
    timeLimit: 2000,
    memoryLimit: 256,
    difficulty: "" as "easy" | "medium" | "hard" | "",
    maxDurationMs: "",
  });
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (problem && isOpen) {
      setFormData({
        title: problem.title || "",
        description: problem.description || "",
        tags: problem.tags?.join(", ") || "",
        points: problem.points || 100,
        timeLimit: problem.timeLimit || 2000,
        memoryLimit: problem.memoryLimit || 256,
        difficulty: (problem.difficulty as "easy" | "medium" | "hard") || "",
        maxDurationMs: problem.maxDurationMs
          ? String(Math.round(problem.maxDurationMs / 60000))
          : "",
      });

      // Fetch full problem details including test cases
      const fetchTestCases = async () => {
        try {
          const response = await problemApi.getDsaProblemById(problem.id);
          const fullProblem = response.data;
          // Check if testCases are included in the response
          if (fullProblem && fullProblem.testCases && fullProblem.testCases.length > 0) {
            const testCasesData = fullProblem.testCases.map(
              (tc, index: number) => ({
                id: tc.id?.toString() || index.toString(),
                input: tc.input || "",
                expectedOutput: tc.expectedOutput || "",
                isHidden: tc.isHidden || false,
              })
            );
            setTestCases(testCasesData);
          } else {
            setTestCases([]);
          }
        } catch (error) {
          console.error("Failed to fetch test cases:", error);
          setTestCases([]);
        }
      };

      fetchTestCases();
      setErrors({});
    }
  }, [problem, isOpen]);

  const addTestCase = () => {
    setTestCases([
      ...testCases,
      {
        id: Date.now().toString(),
        input: "",
        expectedOutput: "",
        isHidden: false,
      },
    ]);
  };

  const removeTestCase = (id: string) => {
    if (testCases.length > 0) {
      setTestCases(testCases.filter((tc) => tc.id !== id));
    }
  };

  const updateTestCase = (
    id: string,
    field: keyof TestCase,
    value: string | boolean
  ) => {
    setTestCases(
      testCases.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
    if (errors[`testCases.${testCases.findIndex((tc) => tc.id === id)}.${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`testCases.${testCases.findIndex((tc) => tc.id === id)}.${field}`];
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem) return;
    setErrors({});

    const updateData: UpdateDsaType = {
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
      // Only include testCases if they have been modified (non-empty)
      // If testCases array is empty, don't include it to keep existing test cases
      // If testCases array has items, replace all test cases
      ...(testCases.length > 0 && {
        testCases: testCases.map((tc) => ({
          input: tc.input.trim(),
          expectedOutput: tc.expectedOutput.trim(),
          isHidden: tc.isHidden,
        })),
      }),
    };

    // Validate using zod schema
    const result = UpdateDsaSchema.safeParse(updateData);

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

    updateDsa(
      { problemId: problem.id, data: updateData },
      {
        onSuccess: () => {
          toast.success("DSA problem updated successfully!");
          onClose();
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.error ||
            error?.message ||
            "Failed to update DSA problem. Please try again.";
          toast.error(errorMessage);
        },
      }
    );
  };

  if (!problem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl">Edit DSA Problem</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="arena-label">Problem Title</Label>
            <Input
              placeholder="e.g. Two Sum"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) {
                  setErrors({ ...errors, title: "" });
                }
              }}
              disabled={isUpdating}
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
                  setErrors({ ...errors, description: "" });
                }
              }}
              disabled={isUpdating}
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
                    setErrors({ ...errors, tags: "" });
                  }
                }}
                disabled={isUpdating}
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
                    setErrors({ ...errors, difficulty: "" });
                  }
                }}
                disabled={isUpdating}
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
                    setErrors({ ...errors, timeLimit: "" });
                  }
                }}
                disabled={isUpdating}
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
                    setErrors({ ...errors, memoryLimit: "" });
                  }
                }}
                disabled={isUpdating}
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

          {/* Test Cases */}
          <div className="arena-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-mono font-semibold text-foreground">
                  Test Cases
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {testCases.length === 0
                    ? "Leave empty to keep existing test cases. Add new ones to replace all."
                    : "Add sample and hidden test cases"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTestCase}
                disabled={isUpdating}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Test Case
              </Button>
            </div>

            {testCases.length > 0 && (
              <div className="space-y-4">
                {testCases.map((tc, index) => (
                  <div
                    key={tc.id}
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
                              updateTestCase(tc.id, "isHidden", e.target.checked)
                            }
                            disabled={isUpdating}
                            className="rounded border-border"
                          />
                          Hidden
                        </label>
                        <button
                          type="button"
                          onClick={() => removeTestCase(tc.id)}
                          disabled={isUpdating}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                            updateTestCase(tc.id, "input", e.target.value)
                          }
                          placeholder="Enter input..."
                          disabled={isUpdating}
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
                            updateTestCase(
                              tc.id,
                              "expectedOutput",
                              e.target.value
                            )
                          }
                          placeholder="Enter expected output..."
                          disabled={isUpdating}
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
            )}
            {errors.testCases && (
              <p className="text-sm text-destructive mt-2">{errors.testCases}</p>
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
              {isUpdating ? "Updating..." : "Update Problem"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
