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
import { Plus, Trash2, Clock, Database, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DsaProblem } from "@/schema/problem.schema";
import { useUpdateDsaProblemMutation } from "@/queries/problem.mutations";
import { UpdateDsaSchema, type UpdateDsaType } from "@/schema/problem.schema";
import { problemApi } from "@/api/problem";
import {
  BOILERPLATE_TYPE_OPTIONS,
  type BoilerplateParam,
  type BoilerplateTypeKey,
} from "@/lib/boilerplateGenerator";

interface TestCase {
  id: string;
  inputs: string[];
  expectedOutput: string;
  isHidden: boolean;
}

function getParamPlaceholder(type: BoilerplateTypeKey): string {
  switch (type) {
    case "int": case "long": return "e.g. 9";
    case "double": return "e.g. 3.14";
    case "boolean": return "true or false";
    case "string": return "e.g. hello world";
    case "int[]": case "long[]": return "e.g. [1,2,3,4]";
    case "double[]": return "e.g. [1.0,2.5]";
    case "boolean[]": return "e.g. [true,false]";
    case "string[]": return 'e.g. ["a","b"]';
    case "int[][]": return "e.g. [[1,2],[3,4]]";
    default: return "Enter value...";
  }
}

function parseParamValue(raw: string, type: BoilerplateTypeKey): unknown {
  const trimmed = raw.trim();
  if (type === "string") return trimmed;
  if (type === "boolean") return trimmed === "true";
  try { return JSON.parse(trimmed); } catch { return trimmed; }
}

function serializeTestCaseInputs(inputs: string[], paramTypes: BoilerplateTypeKey[]): string {
  const values = inputs.map((raw, i) => parseParamValue(raw, paramTypes[i] || "string"));
  return JSON.stringify(values);
}

function parseJsonArrayToInputs(jsonStr: string, paramCount: number): string[] {
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      const inputs = parsed.map((v: unknown) => typeof v === "string" ? v : JSON.stringify(v));
      while (inputs.length < paramCount) inputs.push("");
      return inputs;
    }
    return [typeof parsed === "string" ? parsed : JSON.stringify(parsed)];
  } catch {
    return [jsonStr];
  }
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
    inputFormat: "",
    outputFormat: "",
    constraints: [""] as string[],
  });
  const [boilerplateSignature, setBoilerplateSignature] = useState({
    functionName: "solve",
    returnType: "int" as BoilerplateTypeKey,
    parameters: [{ name: "", type: "int" as BoilerplateTypeKey }] as BoilerplateParam[],
    className: "Solution",
    useClassWrapper: true,
  });
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (problem && isOpen) {
      setFormData((prev) => ({
        ...prev,
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
        inputFormat: (problem as { inputFormat?: string | null }).inputFormat ?? "",
        outputFormat: (problem as { outputFormat?: string | null }).outputFormat ?? "",
        constraints: Array.isArray((problem as { constraints?: string[] }).constraints) &&
          (problem as { constraints?: string[] }).constraints!.length > 0
          ? (problem as { constraints: string[] }).constraints
          : [""],
      }));

      // Fetch full problem details including test cases, format fields, and signature
      const fetchFull = async () => {
        try {
          const response = await problemApi.getDsaProblemById(problem.id);
          const fullProblem = response.data as {
            testCases?: Array<{ id?: number; input?: string; expectedOutput?: string; isHidden?: boolean }>;
            inputFormat?: string | null;
            outputFormat?: string | null;
            constraints?: string[];
            signature?: {
              functionName?: string;
              returnType?: string;
              parameters?: Array<{ name: string; type: string }>;
              className?: string;
              useClassWrapper?: boolean;
            };
          };
          if (fullProblem?.testCases && fullProblem.testCases.length > 0) {
            const sigParams = Array.isArray(fullProblem.signature?.parameters)
              ? fullProblem.signature!.parameters.length
              : 1;
            setTestCases(
              fullProblem.testCases.map((tc, i) => ({
                id: tc.id?.toString() ?? String(i),
                inputs: parseJsonArrayToInputs(tc.input || "[]", sigParams),
                expectedOutput: tc.expectedOutput || "",
                isHidden: tc.isHidden || false,
              }))
            );
          } else {
            setTestCases([]);
          }
          setFormData((prev) => ({
            ...prev,
            inputFormat: fullProblem.inputFormat ?? "",
            outputFormat: fullProblem.outputFormat ?? "",
            constraints:
              Array.isArray(fullProblem.constraints) && fullProblem.constraints.length > 0
                ? fullProblem.constraints
                : [""],
          }));
          // Populate signature form from stored signature (single source of truth)
          const sig = fullProblem?.signature;
          if (sig && typeof sig === "object" && "functionName" in sig) {
            const params = Array.isArray(sig.parameters) && sig.parameters.length > 0
              ? sig.parameters.map((p) => ({
                  name: typeof p.name === "string" ? p.name : "",
                  type: (typeof p.type === "string" ? p.type : "int") as BoilerplateTypeKey,
                }))
              : [{ name: "", type: "int" as BoilerplateTypeKey }];
            setBoilerplateSignature({
              functionName: typeof sig.functionName === "string" ? sig.functionName : "solve",
              returnType: (typeof sig.returnType === "string" ? sig.returnType : "int") as BoilerplateTypeKey,
              parameters: params,
              className: typeof sig.className === "string" ? sig.className : "Solution",
              useClassWrapper: typeof sig.useClassWrapper === "boolean" ? sig.useClassWrapper : true,
            });
          }
        } catch (error) {
          console.error("Failed to fetch problem details:", error);
          setTestCases([]);
        }
      };

      fetchFull();
      setErrors({});
    }
  }, [problem, isOpen]);

  const editParamCount = boilerplateSignature.parameters.length;

  useEffect(() => {
    setTestCases((prev) =>
      prev.map((tc) => {
        const newInputs = [...tc.inputs];
        while (newInputs.length < editParamCount) newInputs.push("");
        if (newInputs.length > editParamCount) newInputs.length = editParamCount;
        return { ...tc, inputs: newInputs };
      })
    );
  }, [editParamCount]);

  const addTestCase = () => {
    setTestCases([
      ...testCases,
      {
        id: Date.now().toString(),
        inputs: Array(editParamCount).fill(""),
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

  const updateTestCaseInput = (
    id: string,
    paramIndex: number,
    value: string
  ) => {
    setTestCases(
      testCases.map((tc) =>
        tc.id === id
          ? { ...tc, inputs: tc.inputs.map((v, j) => (j === paramIndex ? value : v)) }
          : tc
      )
    );
    const tcIndex = testCases.findIndex((tc) => tc.id === id);
    if (errors[`testCases.${tcIndex}.input`]) {
      const newErrors = { ...errors };
      delete newErrors[`testCases.${tcIndex}.input`];
      setErrors(newErrors);
    }
  };

  const updateTestCase = (
    id: string,
    field: "expectedOutput" | "isHidden",
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

  const addConstraint = () => {
    setFormData((f) => ({ ...f, constraints: [...f.constraints, ""] }));
  };
  const removeConstraint = (index: number) => {
    setFormData((f) => ({
      ...f,
      constraints: f.constraints.filter((_, i) => i !== index),
    }));
  };
  const updateConstraint = (index: number, value: string) => {
    setFormData((f) => ({
      ...f,
      constraints: f.constraints.map((c, i) => (i === index ? value : c)),
    }));
  };

  const addBoilerplateParam = () => {
    setBoilerplateSignature((s) => ({
      ...s,
      parameters: [...s.parameters, { name: "", type: "int" }],
    }));
  };
  const removeBoilerplateParam = (index: number) => {
    setBoilerplateSignature((s) => ({
      ...s,
      parameters: s.parameters.filter((_, i) => i !== index),
    }));
  };
  const updateBoilerplateParam = (
    index: number,
    field: keyof BoilerplateParam,
    value: string | BoilerplateTypeKey
  ) => {
    setBoilerplateSignature((s) => ({
      ...s,
      parameters: s.parameters.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
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
      inputFormat: formData.inputFormat.trim() || null,
      outputFormat: formData.outputFormat.trim() || null,
      constraints: formData.constraints.map((c) => c.trim()).filter(Boolean),
      boilerplateSignature: {
        ...boilerplateSignature,
        parameters: boilerplateSignature.parameters.filter((p) => p.name.trim() !== ""),
      },
      ...(testCases.length > 0 && {
        testCases: testCases.map((tc) => {
          const filteredParams = boilerplateSignature.parameters.filter((p) => p.name.trim() !== "");
          const paramTypes = filteredParams.map((p) => p.type);
          const filteredInputs = tc.inputs.filter((_, i) => boilerplateSignature.parameters[i]?.name.trim() !== "");
          return {
            input: serializeTestCaseInputs(filteredInputs, paramTypes),
            expectedOutput: tc.expectedOutput.trim(),
            isHidden: tc.isHidden,
          };
        }),
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

          {/* Input / Output Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="arena-label">Input Format</Label>
              <Textarea
                placeholder="e.g. First line: integer n. Second line: n space-separated integers."
                value={formData.inputFormat}
                onChange={(e) => {
                  setFormData({ ...formData, inputFormat: e.target.value });
                  if (errors.inputFormat) setErrors({ ...errors, inputFormat: "" });
                }}
                disabled={isUpdating}
                className={cn(
                  "arena-input w-full min-h-[100px] resize-y font-mono text-sm",
                  errors.inputFormat && "border-destructive"
                )}
              />
              {errors.inputFormat && (
                <p className="text-sm text-destructive mt-1">{errors.inputFormat}</p>
              )}
            </div>
            <div>
              <Label className="arena-label">Output Format</Label>
              <Textarea
                placeholder="e.g. Print one integer — the result."
                value={formData.outputFormat}
                onChange={(e) => {
                  setFormData({ ...formData, outputFormat: e.target.value });
                  if (errors.outputFormat) setErrors({ ...errors, outputFormat: "" });
                }}
                disabled={isUpdating}
                className={cn(
                  "arena-input w-full min-h-[100px] resize-y font-mono text-sm",
                  errors.outputFormat && "border-destructive"
                )}
              />
              {errors.outputFormat && (
                <p className="text-sm text-destructive mt-1">{errors.outputFormat}</p>
              )}
            </div>
          </div>

          {/* Constraints */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="arena-label">Constraints</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addConstraint}
                disabled={isUpdating}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add constraint
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              One constraint per line (e.g. 1 ≤ n ≤ 10^5)
            </p>
            <div className="space-y-2">
              {formData.constraints.map((c, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={c}
                    onChange={(e) => updateConstraint(index, e.target.value)}
                    placeholder={`Constraint ${index + 1}`}
                    disabled={isUpdating}
                    className={cn(
                      "arena-input flex-1 font-mono text-sm",
                      errors[`constraints.${index}`] && "border-destructive"
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeConstraint(index)}
                    disabled={isUpdating || formData.constraints.length <= 1}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            {errors.constraints && (
              <p className="text-sm text-destructive mt-1">{errors.constraints}</p>
            )}
          </div>

          {/* Solution signature — generates boilerplate for C++, Java, JS, Python */}
          <div className="space-y-4 rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="arena-label mb-0">
                  Solution signature (generates starter code for all languages)
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Define the function/method signature; boilerplate for C++, Java, JavaScript, and Python is generated automatically.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Function / method name</Label>
                <Input
                  placeholder="e.g. twoSum, maxProfit"
                  value={boilerplateSignature.functionName}
                  onChange={(e) =>
                    setBoilerplateSignature((s) => ({
                      ...s,
                      functionName: e.target.value.trim() || "solve",
                    }))
                  }
                  disabled={isUpdating}
                  className="arena-input w-full font-mono mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Return type</Label>
                <Select
                  value={boilerplateSignature.returnType}
                  onValueChange={(v: BoilerplateTypeKey) =>
                    setBoilerplateSignature((s) => ({ ...s, returnType: v }))
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger className="arena-input w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOILERPLATE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm text-muted-foreground">Parameters</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBoilerplateParam}
                  disabled={isUpdating}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add parameter
                </Button>
              </div>
              <div className="space-y-2">
                {boilerplateSignature.parameters.map((p, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Param name (e.g. nums, target)"
                      value={p.name}
                      onChange={(e) =>
                        updateBoilerplateParam(index, "name", e.target.value)
                      }
                      disabled={isUpdating}
                      className="arena-input flex-1 font-mono text-sm"
                    />
                    <Select
                      value={p.type}
                      onValueChange={(v: BoilerplateTypeKey) =>
                        updateBoilerplateParam(index, "type", v)
                      }
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="arena-input w-[140px] font-mono text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOILERPLATE_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBoilerplateParam(index)}
                      disabled={isUpdating || boilerplateSignature.parameters.length <= 1}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-use-class-wrapper"
                  checked={boilerplateSignature.useClassWrapper}
                  onChange={(e) =>
                    setBoilerplateSignature((s) => ({
                      ...s,
                      useClassWrapper: e.target.checked,
                    }))
                  }
                  disabled={isUpdating}
                  className="rounded border-border"
                />
                <Label htmlFor="edit-use-class-wrapper" className="text-sm text-muted-foreground cursor-pointer">
                  Use class wrapper (Java/C++: <code className="text-xs">class Solution</code> with method)
                </Label>
              </div>
              {boilerplateSignature.useClassWrapper && (
                <div>
                  <Label className="text-sm text-muted-foreground">Class name</Label>
                  <Input
                    placeholder="Solution"
                    value={boilerplateSignature.className}
                    onChange={(e) =>
                      setBoilerplateSignature((s) => ({
                        ...s,
                        className: e.target.value.trim() || "Solution",
                      }))
                    }
                    disabled={isUpdating}
                    className="arena-input w-full font-mono mt-1"
                  />
                </div>
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
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Input Parameters
                        </Label>
                        <div className="space-y-2">
                          {boilerplateSignature.parameters.map((param, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground w-24 shrink-0 truncate" title={`${param.name || `arg${pIdx}`} (${param.type})`}>
                                {param.name || `arg${pIdx}`}
                                <span className="text-muted-foreground/60 ml-1">({param.type})</span>
                              </span>
                              <Input
                                value={tc.inputs[pIdx] ?? ""}
                                onChange={(e) =>
                                  updateTestCaseInput(tc.id, pIdx, e.target.value)
                                }
                                placeholder={getParamPlaceholder(param.type)}
                                disabled={isUpdating}
                                className={cn(
                                  "arena-input flex-1 font-mono text-sm",
                                  errors[`testCases.${index}.input`] && "border-destructive"
                                )}
                              />
                            </div>
                          ))}
                        </div>
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
                        <Input
                          value={tc.expectedOutput}
                          onChange={(e) =>
                            updateTestCase(tc.id, "expectedOutput", e.target.value)
                          }
                          placeholder="e.g. [0,1] or 42 or true"
                          disabled={isUpdating}
                          className={cn(
                            "arena-input w-full font-mono text-sm",
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
