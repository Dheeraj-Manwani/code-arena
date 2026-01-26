import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Check,
  Clock,
  Database,
  FileCode,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { pageVariants } from "@/lib/animations";
import { AddMcqSchema, AddDsaSchema, type AddMcqType, type AddDsaType } from "@/schema/problem.schema";

import {
  useCreateMcqQuestionMutation,
  useCreateDsaProblemMutation,
} from "@/queries/problem.mutations";

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

const CreateQuestion = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("mcq");
  const { mutate: createMcq, isPending: isCreatingMcq } =
    useCreateMcqQuestionMutation();
  const { mutate: createDsa, isPending: isCreatingDsa } =
    useCreateDsaProblemMutation();

  // Validation errors
  const [mcqErrors, setMcqErrors] = useState<Record<string, string>>({});
  const [dsaErrors, setDsaErrors] = useState<Record<string, string>>({});

  // MCQ form state
  const [mcqForm, setMcqForm] = useState({
    questionText: "",
    points: 10,
    options: ["Option 1", "Option 2", "Option 3", "Option 4"],
    correctOptionIndex: 0,
    maxDurationMs: "",
  });
  const [optionDragIndex, setOptionDragIndex] = useState<number | null>(null);

  // DSA form state
  const [dsaForm, setDsaForm] = useState({
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
    constraints: [""],
    boilerplate: { cpp: "", python: "", java: "", javascript: "" },
  });
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: "1", input: "", expectedOutput: "", isHidden: false },
  ]);

  // MCQ option handlers
  const updateOption = (index: number, value: string) => {
    const newOptions = [...mcqForm.options];
    newOptions[index] = value;
    setMcqForm({ ...mcqForm, options: newOptions });
  };

  const addOption = () => {
    setMcqForm({
      ...mcqForm,
      options: [...mcqForm.options, `Option ${mcqForm.options.length + 1}`],
    });
  };

  const removeOption = (index: number) => {
    if (mcqForm.options.length > 2) {
      const newOptions = mcqForm.options.filter((_, i) => i !== index);
      let newCorrectIndex = mcqForm.correctOptionIndex;
      if (index === mcqForm.correctOptionIndex) {
        newCorrectIndex = 0;
      } else if (index < mcqForm.correctOptionIndex) {
        newCorrectIndex = mcqForm.correctOptionIndex - 1;
      }
      setMcqForm({
        ...mcqForm,
        options: newOptions,
        correctOptionIndex: newCorrectIndex,
      });
    }
  };

  // Option drag handlers
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

      setMcqForm((prev) => {
        const newOptions = [...prev.options];
        const draggedItem = newOptions[optionDragIndex];
        newOptions.splice(optionDragIndex, 1);
        newOptions.splice(index, 0, draggedItem);

        // Adjust correct option index
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

  // Test case handlers
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
    if (testCases.length > 1) {
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
  };

  const addConstraint = () => {
    setDsaForm((f) => ({ ...f, constraints: [...f.constraints, ""] }));
  };
  const removeConstraint = (index: number) => {
    setDsaForm((f) => ({
      ...f,
      constraints: f.constraints.filter((_, i) => i !== index),
    }));
  };
  const updateConstraint = (index: number, value: string) => {
    setDsaForm((f) => ({
      ...f,
      constraints: f.constraints.map((c, i) => (i === index ? value : c)),
    }));
  };

  const handleSubmitMcq = async (e: React.FormEvent) => {
    e.preventDefault();
    setMcqErrors({});

    const mcqData: AddMcqType = {
      questionText: mcqForm.questionText.trim(),
      options: mcqForm.options.filter((opt) => opt.trim()),
      correctOptionIndex: mcqForm.correctOptionIndex,
      points: mcqForm.points,
      ...(mcqForm.maxDurationMs &&
        mcqForm.maxDurationMs.trim() !== "" && {
        maxDurationMs: parseInt(mcqForm.maxDurationMs) || undefined,
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
      setMcqErrors(fieldErrors);
      return;
    }

    createMcq(mcqData, {
      onSuccess: () => {
        toast.success("MCQ question created successfully!");
        navigate("/questions");
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

  const handleSubmitDsa = async (e: React.FormEvent) => {
    e.preventDefault();
    setDsaErrors({});

    const dsaData: AddDsaType = {
      title: dsaForm.title.trim(),
      description: dsaForm.description.trim(),
      tags: dsaForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      points: dsaForm.points,
      timeLimit: dsaForm.timeLimit,
      memoryLimit: dsaForm.memoryLimit,
      ...(dsaForm.difficulty && { difficulty: dsaForm.difficulty }),
      ...(dsaForm.maxDurationMs &&
        dsaForm.maxDurationMs.trim() !== "" && {
        maxDurationMs: parseInt(dsaForm.maxDurationMs) || undefined,
      }),
      testCases: testCases.map((tc) => ({
        input: tc.input.trim(),
        expectedOutput: tc.expectedOutput.trim(),
        isHidden: tc.isHidden,
      })),
      inputFormat: dsaForm.inputFormat.trim() || undefined,
      outputFormat: dsaForm.outputFormat.trim() || undefined,
      constraints: dsaForm.constraints.map((c) => c.trim()).filter(Boolean),
      boilerplate: {
        cpp: dsaForm.boilerplate.cpp,
        python: dsaForm.boilerplate.python,
        java: dsaForm.boilerplate.java,
        javascript: dsaForm.boilerplate.javascript,
      },
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
      setDsaErrors(fieldErrors);
      return;
    }

    createDsa(dsaData, {
      onSuccess: () => {
        toast.success("DSA problem created successfully!");
        navigate("/questions");
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
          to="/questions"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            New Question
          </h1>
          <p className="text-muted-foreground">
            Add a new MCQ question or DSA problem to the bank.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="max-w-4xl"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="mcq">MCQ Question</TabsTrigger>
            <TabsTrigger value="dsa">DSA Problem</TabsTrigger>
          </TabsList>

          {/* MCQ Form */}
          <TabsContent value="mcq">
            <form onSubmit={handleSubmitMcq} className="space-y-6">
              <div className="arena-card space-y-6">
                <div>
                  <Label className="arena-label">Question Text</Label>
                  <Textarea
                    placeholder="Enter your question..."
                    value={mcqForm.questionText}
                    onChange={(e) => {
                      setMcqForm({ ...mcqForm, questionText: e.target.value });
                      if (mcqErrors.questionText) {
                        setMcqErrors({ ...mcqErrors, questionText: "" });
                      }
                    }}
                    disabled={isCreatingMcq}
                    className={cn(
                      "arena-input w-full min-h-[120px] resize-y",
                      mcqErrors.questionText && "border-destructive"
                    )}
                  />
                  {mcqErrors.questionText && (
                    <p className="text-sm text-destructive mt-1">
                      {mcqErrors.questionText}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="arena-label">Points</Label>
                    <Input
                      type="number"
                      value={mcqForm.points}
                      onChange={(e) => {
                        setMcqForm({
                          ...mcqForm,
                          points: parseInt(e.target.value) || 0,
                        });
                        if (mcqErrors.points) {
                          setMcqErrors({ ...mcqErrors, points: "" });
                        }
                      }}
                      disabled={isCreatingMcq}
                      className={cn(
                        "arena-input w-full",
                        mcqErrors.points && "border-destructive"
                      )}
                    />
                    {mcqErrors.points && (
                      <p className="text-sm text-destructive mt-1">
                        {mcqErrors.points}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="arena-label">Max Duration (ms)</Label>
                    <Input
                      type="number"
                      placeholder="Optional"
                      value={mcqForm.maxDurationMs}
                      onChange={(e) => {
                        setMcqForm({
                          ...mcqForm,
                          maxDurationMs: e.target.value,
                        });
                        if (mcqErrors.maxDurationMs) {
                          setMcqErrors({ ...mcqErrors, maxDurationMs: "" });
                        }
                      }}
                      disabled={isCreatingMcq}
                      className={cn(
                        "arena-input w-full",
                        mcqErrors.maxDurationMs && "border-destructive"
                      )}
                    />
                    {mcqErrors.maxDurationMs && (
                      <p className="text-sm text-destructive mt-1">
                        {mcqErrors.maxDurationMs}
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
                      disabled={isCreatingMcq}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {mcqForm.options.map((option, index) => (
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
                            onChange={(e) => {
                              updateOption(index, e.target.value);
                              if (mcqErrors.options) {
                                setMcqErrors({ ...mcqErrors, options: "" });
                              }
                            }}
                            disabled={isCreatingMcq}
                            className={cn(
                              "arena-input w-full",
                              mcqErrors[`options.${index}`] && "border-destructive"
                            )}
                          />
                          {mcqErrors[`options.${index}`] && (
                            <p className="text-xs text-destructive mt-1">
                              {mcqErrors[`options.${index}`]}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setMcqForm({
                              ...mcqForm,
                              correctOptionIndex: index,
                            })
                          }
                          disabled={isCreatingMcq}
                          className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center border transition-all",
                            mcqForm.correctOptionIndex === index
                              ? "bg-green-500/20 border-green-500 text-green-500"
                              : "border-border text-muted-foreground hover:border-muted-foreground",
                            isCreatingMcq && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          disabled={mcqForm.options.length <= 2 || isCreatingMcq}
                          className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center transition-all",
                            mcqForm.options.length > 2 && !isCreatingMcq
                              ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              : "text-muted-foreground/30 cursor-not-allowed"
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {mcqErrors.options && (
                    <p className="text-sm text-destructive mt-1">
                      {mcqErrors.options}
                    </p>
                  )}
                  {mcqErrors.correctOptionIndex && (
                    <p className="text-sm text-destructive mt-1">
                      {mcqErrors.correctOptionIndex}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isCreatingMcq}>
                  {isCreatingMcq ? "Creating..." : "Create MCQ Question"}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* DSA Form */}
          <TabsContent value="dsa">
            <form onSubmit={handleSubmitDsa} className="space-y-6">
              <div className="arena-card space-y-6">
                <div>
                  <Label className="arena-label">Problem Title</Label>
                  <Input
                    placeholder="e.g. Two Sum"
                    value={dsaForm.title}
                    onChange={(e) => {
                      setDsaForm({ ...dsaForm, title: e.target.value });
                      if (dsaErrors.title) {
                        setDsaErrors({ ...dsaErrors, title: "" });
                      }
                    }}
                    disabled={isCreatingDsa}
                    className={cn(
                      "arena-input w-full",
                      dsaErrors.title && "border-destructive"
                    )}
                  />
                  {dsaErrors.title && (
                    <p className="text-sm text-destructive mt-1">
                      {dsaErrors.title}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="arena-label">Problem Description</Label>
                  <Textarea
                    placeholder="Describe the problem clearly..."
                    value={dsaForm.description}
                    onChange={(e) => {
                      setDsaForm({ ...dsaForm, description: e.target.value });
                      if (dsaErrors.description) {
                        setDsaErrors({ ...dsaErrors, description: "" });
                      }
                    }}
                    disabled={isCreatingDsa}
                    className={cn(
                      "arena-input w-full min-h-[200px] resize-y",
                      dsaErrors.description && "border-destructive"
                    )}
                  />
                  {dsaErrors.description && (
                    <p className="text-sm text-destructive mt-1">
                      {dsaErrors.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="arena-label">Tags (comma-separated)</Label>
                    <Input
                      placeholder="e.g. Array, Hash Table, Two Pointers"
                      value={dsaForm.tags}
                      onChange={(e) => {
                        setDsaForm({ ...dsaForm, tags: e.target.value });
                        if (dsaErrors.tags) {
                          setDsaErrors({ ...dsaErrors, tags: "" });
                        }
                      }}
                      disabled={isCreatingDsa}
                      className={cn(
                        "arena-input w-full",
                        dsaErrors.tags && "border-destructive"
                      )}
                    />
                    {dsaErrors.tags && (
                      <p className="text-sm text-destructive mt-1">
                        {dsaErrors.tags}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="arena-label">Difficulty</Label>
                    <Select
                      value={dsaForm.difficulty}
                      onValueChange={(value) => {
                        setDsaForm({
                          ...dsaForm,
                          difficulty: value as "easy" | "medium" | "hard",
                        });
                        if (dsaErrors.difficulty) {
                          setDsaErrors({ ...dsaErrors, difficulty: "" });
                        }
                      }}
                      disabled={isCreatingDsa}
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
                    {dsaErrors.difficulty && (
                      <p className="text-sm text-destructive mt-1">
                        {dsaErrors.difficulty}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <Label className="arena-label">Points</Label>
                    <Input
                      type="number"
                      value={dsaForm.points}
                      onChange={(e) => {
                        setDsaForm({
                          ...dsaForm,
                          points: parseInt(e.target.value) || 0,
                        });
                        if (dsaErrors.points) {
                          setDsaErrors({ ...dsaErrors, points: "" });
                        }
                      }}
                      disabled={isCreatingDsa}
                      className={cn(
                        "arena-input w-full",
                        dsaErrors.points && "border-destructive"
                      )}
                    />
                    {dsaErrors.points && (
                      <p className="text-sm text-destructive mt-1">
                        {dsaErrors.points}
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
                      value={dsaForm.timeLimit}
                      onChange={(e) => {
                        setDsaForm({
                          ...dsaForm,
                          timeLimit: parseInt(e.target.value) || 0,
                        });
                        if (dsaErrors.timeLimit) {
                          setDsaErrors({ ...dsaErrors, timeLimit: "" });
                        }
                      }}
                      disabled={isCreatingDsa}
                      className={cn(
                        "arena-input w-full",
                        dsaErrors.timeLimit && "border-destructive"
                      )}
                    />
                    {dsaErrors.timeLimit && (
                      <p className="text-sm text-destructive mt-1">
                        {dsaErrors.timeLimit}
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
                      value={dsaForm.memoryLimit}
                      onChange={(e) => {
                        setDsaForm({
                          ...dsaForm,
                          memoryLimit: parseInt(e.target.value) || 0,
                        });
                        if (dsaErrors.memoryLimit) {
                          setDsaErrors({ ...dsaErrors, memoryLimit: "" });
                        }
                      }}
                      disabled={isCreatingDsa}
                      className={cn(
                        "arena-input w-full",
                        dsaErrors.memoryLimit && "border-destructive"
                      )}
                    />
                    {dsaErrors.memoryLimit && (
                      <p className="text-sm text-destructive mt-1">
                        {dsaErrors.memoryLimit}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="arena-label">Max Duration (ms)</Label>
                    <Input
                      type="number"
                      placeholder="Optional"
                      value={dsaForm.maxDurationMs}
                      onChange={(e) => {
                        setDsaForm({
                          ...dsaForm,
                          maxDurationMs: e.target.value,
                        });
                        if (dsaErrors.maxDurationMs) {
                          setDsaErrors({ ...dsaErrors, maxDurationMs: "" });
                        }
                      }}
                      disabled={isCreatingDsa}
                      className={cn(
                        "arena-input w-full",
                        dsaErrors.maxDurationMs && "border-destructive"
                      )}
                    />
                    {dsaErrors.maxDurationMs && (
                      <p className="text-sm text-destructive mt-1">
                        {dsaErrors.maxDurationMs}
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
                      value={dsaForm.inputFormat}
                      onChange={(e) => {
                        setDsaForm({ ...dsaForm, inputFormat: e.target.value });
                        if (dsaErrors.inputFormat) {
                          setDsaErrors({ ...dsaErrors, inputFormat: "" });
                        }
                      }}
                      disabled={isCreatingDsa}
                      className={cn(
                        "arena-input w-full min-h-[100px] resize-y font-mono text-sm",
                        dsaErrors.inputFormat && "border-destructive"
                      )}
                    />
                    {dsaErrors.inputFormat && (
                      <p className="text-sm text-destructive mt-1">
                        {dsaErrors.inputFormat}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="arena-label">Output Format</Label>
                    <Textarea
                      placeholder="e.g. Print one integer — the result."
                      value={dsaForm.outputFormat}
                      onChange={(e) => {
                        setDsaForm({ ...dsaForm, outputFormat: e.target.value });
                        if (dsaErrors.outputFormat) {
                          setDsaErrors({ ...dsaErrors, outputFormat: "" });
                        }
                      }}
                      disabled={isCreatingDsa}
                      className={cn(
                        "arena-input w-full min-h-[100px] resize-y font-mono text-sm",
                        dsaErrors.outputFormat && "border-destructive"
                      )}
                    />
                    {dsaErrors.outputFormat && (
                      <p className="text-sm text-destructive mt-1">
                        {dsaErrors.outputFormat}
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
                      disabled={isCreatingDsa}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add constraint
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    One constraint per line (e.g. 1 ≤ n ≤ 10^5)
                  </p>
                  <div className="space-y-2">
                    {dsaForm.constraints.map((c, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={c}
                          onChange={(e) =>
                            updateConstraint(index, e.target.value)
                          }
                          placeholder={`Constraint ${index + 1}`}
                          disabled={isCreatingDsa}
                          className={cn(
                            "arena-input flex-1 font-mono text-sm",
                            dsaErrors[`constraints.${index}`] && "border-destructive"
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeConstraint(index)}
                          disabled={
                            isCreatingDsa || dsaForm.constraints.length <= 1
                          }
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {dsaErrors.constraints && (
                    <p className="text-sm text-destructive mt-1">
                      {dsaErrors.constraints}
                    </p>
                  )}
                </div>

                {/* Boilerplate templates */}
                <div>
                  <Label className="arena-label flex items-center gap-2 mb-2">
                    <FileCode className="w-4 h-4" />
                    Boilerplate templates (per language)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Optional starter code for C++, Python, Java, and JavaScript.
                  </p>
                  <Tabs defaultValue="cpp" className="w-full">
                    <TabsList className="bg-muted/50 w-full flex flex-wrap h-auto gap-1 p-1">
                      <TabsTrigger value="cpp">C++</TabsTrigger>
                      <TabsTrigger value="python">Python</TabsTrigger>
                      <TabsTrigger value="java">Java</TabsTrigger>
                      <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    </TabsList>
                    <TabsContent value="cpp" className="mt-2">
                      <Textarea
                        value={dsaForm.boilerplate.cpp}
                        onChange={(e) =>
                          setDsaForm({
                            ...dsaForm,
                            boilerplate: {
                              ...dsaForm.boilerplate,
                              cpp: e.target.value,
                            },
                          })
                        }
                        placeholder="#include <bits/stdc++.h>&#10;using namespace std;&#10;&#10;int main() { ... }"
                        disabled={isCreatingDsa}
                        className="arena-input w-full min-h-[160px] resize-y font-mono text-sm"
                      />
                    </TabsContent>
                    <TabsContent value="python" className="mt-2">
                      <Textarea
                        value={dsaForm.boilerplate.python}
                        onChange={(e) =>
                          setDsaForm({
                            ...dsaForm,
                            boilerplate: {
                              ...dsaForm.boilerplate,
                              python: e.target.value,
                            },
                          })
                        }
                        placeholder="# Your code here&#10;def main():&#10;    pass&#10;&#10;if __name__ == &quot;__main__&quot;:&#10;    main()"
                        disabled={isCreatingDsa}
                        className="arena-input w-full min-h-[160px] resize-y font-mono text-sm"
                      />
                    </TabsContent>
                    <TabsContent value="java" className="mt-2">
                      <Textarea
                        value={dsaForm.boilerplate.java}
                        onChange={(e) =>
                          setDsaForm({
                            ...dsaForm,
                            boilerplate: {
                              ...dsaForm.boilerplate,
                              java: e.target.value,
                            },
                          })
                        }
                        placeholder="import java.util.*;&#10;&#10;public class Solution {&#10;    public static void main(String[] args) { ... }&#10;}"
                        disabled={isCreatingDsa}
                        className="arena-input w-full min-h-[160px] resize-y font-mono text-sm"
                      />
                    </TabsContent>
                    <TabsContent value="javascript" className="mt-2">
                      <Textarea
                        value={dsaForm.boilerplate.javascript}
                        onChange={(e) =>
                          setDsaForm({
                            ...dsaForm,
                            boilerplate: {
                              ...dsaForm.boilerplate,
                              javascript: e.target.value,
                            },
                          })
                        }
                        placeholder="const readline = require('readline');&#10;// Your code here"
                        disabled={isCreatingDsa}
                        className="arena-input w-full min-h-[160px] resize-y font-mono text-sm"
                      />
                    </TabsContent>
                  </Tabs>
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
                      Add sample and hidden test cases
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTestCase}
                    disabled={isCreatingDsa}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Test Case
                  </Button>
                </div>

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
                                updateTestCase(
                                  tc.id,
                                  "isHidden",
                                  e.target.checked
                                )
                              }
                              disabled={isCreatingDsa}
                              className="rounded border-border"
                            />
                            Hidden
                          </label>
                          {testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTestCase(tc.id)}
                              disabled={isCreatingDsa}
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
                            onChange={(e) => {
                              updateTestCase(tc.id, "input", e.target.value);
                              if (dsaErrors[`testCases.${index}.input`]) {
                                setDsaErrors({
                                  ...dsaErrors,
                                  [`testCases.${index}.input`]: "",
                                });
                              }
                            }}
                            placeholder="Enter input..."
                            disabled={isCreatingDsa}
                            className={cn(
                              "arena-input w-full font-mono text-sm h-24",
                              dsaErrors[`testCases.${index}.input`] &&
                              "border-destructive"
                            )}
                          />
                          {dsaErrors[`testCases.${index}.input`] && (
                            <p className="text-xs text-destructive mt-1">
                              {dsaErrors[`testCases.${index}.input`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Expected Output
                          </Label>
                          <Textarea
                            value={tc.expectedOutput}
                            onChange={(e) => {
                              updateTestCase(
                                tc.id,
                                "expectedOutput",
                                e.target.value
                              );
                              if (
                                dsaErrors[`testCases.${index}.expectedOutput`]
                              ) {
                                setDsaErrors({
                                  ...dsaErrors,
                                  [`testCases.${index}.expectedOutput`]: "",
                                });
                              }
                            }}
                            placeholder="Enter expected output..."
                            disabled={isCreatingDsa}
                            className={cn(
                              "arena-input w-full font-mono text-sm h-24",
                              dsaErrors[`testCases.${index}.expectedOutput`] &&
                              "border-destructive"
                            )}
                          />
                          {dsaErrors[`testCases.${index}.expectedOutput`] && (
                            <p className="text-xs text-destructive mt-1">
                              {dsaErrors[`testCases.${index}.expectedOutput`]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {dsaErrors.testCases && (
                  <p className="text-sm text-destructive mt-2">
                    {dsaErrors.testCases}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isCreatingDsa}>
                  {isCreatingDsa ? "Creating..." : "Create DSA Problem"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </motion.div>
    </AdminLayout>
  );
};

export default CreateQuestion;
