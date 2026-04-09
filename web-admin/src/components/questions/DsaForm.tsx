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
import { Plus, Trash2, Clock, Database, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddDsaSchema, type AddDsaType } from "@/schema/problem.schema";
import {
  BOILERPLATE_TYPE_OPTIONS,
  type BoilerplateSignature,
  type BoilerplateParam,
  type BoilerplateTypeKey,
} from "@/lib/boilerplateGenerator";

interface TestCase {
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
    inputFormat: initialData?.inputFormat ?? "",
    outputFormat: initialData?.outputFormat ?? "",
    constraints: Array.isArray(initialData?.constraints) && initialData.constraints.length > 0
      ? initialData.constraints
      : [""],
  });
  const [boilerplateSignature, setBoilerplateSignature] = useState<
    Omit<BoilerplateSignature, "parameters"> & { parameters: BoilerplateParam[] }
  >({
    functionName: "solve",
    returnType: "int",
    parameters: [{ name: "", type: "int" }],
    className: "Solution",
    useClassWrapper: true,
  });
  const paramCount = boilerplateSignature.parameters.length;
  const [testCases, setTestCases] = useState<TestCase[]>(
    initialData?.testCases && initialData.testCases.length > 0
      ? initialData.testCases.map((tc) => {
          let inputs: string[];
          try {
            const parsed = JSON.parse(tc.input);
            inputs = Array.isArray(parsed)
              ? parsed.map((v: unknown) => typeof v === "string" ? v : JSON.stringify(v))
              : [typeof parsed === "string" ? parsed : JSON.stringify(parsed)];
          } catch {
            inputs = [tc.input];
          }
          return { inputs, expectedOutput: tc.expectedOutput, isHidden: tc.isHidden };
        })
      : [{ inputs: Array(paramCount).fill(""), expectedOutput: "", isHidden: false }]
  );

  useEffect(() => {
    setTestCases((prev) =>
      prev.map((tc) => {
        const newInputs = [...tc.inputs];
        while (newInputs.length < paramCount) newInputs.push("");
        if (newInputs.length > paramCount) newInputs.length = paramCount;
        return { ...tc, inputs: newInputs };
      })
    );
  }, [paramCount]);

  const addTestCase = () => {
    setTestCases([
      ...testCases,
      { inputs: Array(paramCount).fill(""), expectedOutput: "", isHidden: false },
    ]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 0) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const updateTestCaseInput = (
    tcIndex: number,
    paramIndex: number,
    value: string
  ) => {
    setTestCases(
      testCases.map((tc, i) =>
        i === tcIndex
          ? { ...tc, inputs: tc.inputs.map((v, j) => (j === paramIndex ? value : v)) }
          : tc
      )
    );
    if (errors[`testCases.${tcIndex}.input`]) {
      const newErrors = { ...errors };
      delete newErrors[`testCases.${tcIndex}.input`];
      onErrorsChange?.(newErrors);
    }
  };

  const updateTestCase = (
    index: number,
    field: "expectedOutput" | "isHidden",
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
      inputFormat: formData.inputFormat.trim() || undefined,
      outputFormat: formData.outputFormat.trim() || undefined,
      constraints: formData.constraints.map((c) => c.trim()).filter(Boolean),
      boilerplateSignature: {
        ...boilerplateSignature,
        parameters: boilerplateSignature.parameters.filter((p) => p.name.trim() !== ""),
      },
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

      {/* Input / Output Format */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="arena-label">Input Format</Label>
          <Textarea
            placeholder="e.g. First line: integer n. Second line: n space-separated integers."
            value={formData.inputFormat}
            onChange={(e) => {
              setFormData({ ...formData, inputFormat: e.target.value });
              if (errors.inputFormat) {
                const newErrors = { ...errors };
                delete newErrors.inputFormat;
                onErrorsChange?.(newErrors);
              }
            }}
            disabled={isSubmitting}
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
              if (errors.outputFormat) {
                const newErrors = { ...errors };
                delete newErrors.outputFormat;
                onErrorsChange?.(newErrors);
              }
            }}
            disabled={isSubmitting}
            className={cn(
              "arena-input w-full min-h-[100px] resize-y font-mono text-sm",
              errors.outputFormat && "border-destructive"
            )}
          />
          {errors.outputFormat && (
            <p className="text-sm text-destructive mt-1">
              {errors.outputFormat}
            </p>
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
            disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting || formData.constraints.length <= 1}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  className="arena-input flex-1 font-mono text-sm"
                />
                <Select
                  value={p.type}
                  onValueChange={(v: BoilerplateTypeKey) =>
                    updateBoilerplateParam(index, "type", v)
                  }
                  disabled={isSubmitting}
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
                  disabled={isSubmitting || boilerplateSignature.parameters.length <= 1}
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
              id="use-class-wrapper"
              checked={boilerplateSignature.useClassWrapper}
              onChange={(e) =>
                setBoilerplateSignature((s) => ({
                  ...s,
                  useClassWrapper: e.target.checked,
                }))
              }
              disabled={isSubmitting}
              className="rounded border-border"
            />
            <Label htmlFor="use-class-wrapper" className="text-sm text-muted-foreground cursor-pointer">
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
                disabled={isSubmitting}
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
                            updateTestCaseInput(index, pIdx, e.target.value)
                          }
                          placeholder={getParamPlaceholder(param.type)}
                          disabled={isSubmitting}
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
                      updateTestCase(index, "expectedOutput", e.target.value)
                    }
                    placeholder="e.g. [0,1] or 42 or true"
                    disabled={isSubmitting}
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
