import { useState, useEffect } from "react";
import { Plus, Trash2, Check, X, Loader2, Terminal } from "lucide-react";
import type { TestCaseResult, TestCaseUI } from "@/schema/problem.schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatHarnessStdoutForDisplay } from "@/lib/runStdout";


function formatTestCaseInput(
  input: string,
  signature?: { parameters?: Array<{ name: string; type: string }> }
): string {
  if (!signature?.parameters?.length) return input;
  try {
    const parsed = JSON.parse(input);
    if (!Array.isArray(parsed)) return input;
    return parsed
      .map((v: unknown, i: number) => {
        const param = signature.parameters![i];
        const name = param?.name || `arg${i}`;
        const val = typeof v === "string" ? v : JSON.stringify(v);
        return `${name} = ${val}`;
      })
      .join("\n");
  } catch {
    return input;
  }
}

function getParamPlaceholder(type: string): string {
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

function getReturnTypePlaceholder(type?: string): string {
  switch (type) {
    case "int": case "long": return "e.g. 42";
    case "double": return "e.g. 3.14";
    case "boolean": return "true or false";
    case "string": return "e.g. hello";
    case "int[]": case "long[]": return "e.g. [0,1]";
    case "double[]": return "e.g. [1.0,2.5]";
    case "boolean[]": return "e.g. [true,false]";
    case "string[]": return 'e.g. ["a","b"]';
    case "int[][]": return "e.g. [[1,2],[3,4]]";
    case "void": return "null";
    default: return "Enter expected output...";
  }
}

function parseParamValue(raw: string, type: string): unknown {
  const trimmed = raw.trim();
  if (type === "string") return trimmed;
  if (type === "boolean") return trimmed === "true";
  try { return JSON.parse(trimmed); } catch { return trimmed; }
}

function serializeInputs(inputs: string[], paramTypes: string[]): string {
  const values = inputs.map((raw, i) => parseParamValue(raw, paramTypes[i] || "string"));
  return JSON.stringify(values);
}

interface TestCasePanelProps {
  testCases: TestCaseUI[];
  customTestCases: TestCaseUI[];
  onAddCustomTestCase: (testCase: TestCaseUI) => void;
  onRemoveCustomTestCase: (id: number) => void;
  results: TestCaseResult[];
  isRunning: boolean;
  signature?: { parameters?: Array<{ name: string; type: string }>; returnType?: string };
  runOutput?: {
    stdout?: string | null;
    stderr?: string | null;
    status?: { id: number; description: string };
    executionTime?: number | null;
  } | null;
}

const TestCasePanel = ({
  testCases,
  customTestCases,
  onAddCustomTestCase,
  onRemoveCustomTestCase,
  results,
  isRunning,
  signature,
  runOutput,
}: TestCasePanelProps) => {
  const params = signature?.parameters ?? [];
  const hasSignature = params.length > 0;

  const [showAddForm, setShowAddForm] = useState(false);
  const [customInputs, setCustomInputs] = useState<string[]>(() => Array(params.length).fill(""));
  const [customExpectedOutput, setCustomExpectedOutput] = useState("");

  useEffect(() => {
    setCustomInputs((prev) => {
      if (prev.length === params.length) return prev;
      const next = [...prev];
      while (next.length < params.length) next.push("");
      if (next.length > params.length) next.length = params.length;
      return next;
    });
  }, [params.length]);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const allTestCases = [...testCases, ...customTestCases];
  const passedCount = results.filter((r) => r.passed).length;
  const hasResults = results.length > 0;
  const allPassed = hasResults && passedCount === allTestCases.length;

  const hasAnyInput = hasSignature
    ? customInputs.some((v) => v.trim() !== "")
    : false;

  const handleAddCustom = () => {
    if (!hasAnyInput) return;

    const paramTypes = params.map((p) => p.type);
    const inputStr = serializeInputs(customInputs, paramTypes);

    const newTestCase = {
      id: Date.now(),
      input: inputStr,
      expectedOutput: customExpectedOutput.trim(),
      isCustom: true,
    };
    onAddCustomTestCase(newTestCase);
    setCustomInputs(Array(params.length).fill(""));
    setCustomExpectedOutput("");
    setShowAddForm(false);
  };

  const handleCloseAddModal = (open: boolean) => {
    setShowAddForm(open);
    if (!open) {
      setCustomInputs(Array(params.length).fill(""));
      setCustomExpectedOutput("");
    }
  };

  const getResultForTestCase = (tcId: number) => {
    return results.find((r) => r.id === tcId);
  };

  return (
    <div className={cn(
      "h-full flex flex-col min-h-0 overflow-hidden border-t border-border bg-card/50 backdrop-blur-sm",
      allPassed && "border-t-arena-success/50"
    )}>
      {/* Header - static, no accordion toggle */}
      <div className="w-full flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary/20 text-primary">
            <Terminal className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold tracking-tight">
              Test Cases
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ({allTestCases.length})
            </span>
          </div>

          {hasResults && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium",
              allPassed
                ? "bg-arena-success/20 text-arena-success ring-1 ring-arena-success/30"
                : "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
            )}>
              <span>{passedCount}/{allTestCases.length}</span>
            </div>
          )}
        </div>

        {isRunning && (
          <div className="flex items-center gap-2 text-primary animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-medium">Executing...</span>
          </div>
        )}
      </div>

      {/* Content - always visible, fills pane and scrolls when needed */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 pb-4">
          {/* {runOutput && (
            <div className="mb-4 rounded-lg border border-border bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Run Result</span>
                <span>{runOutput.status?.description ?? "Unknown"}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">stdout</p>
                  <pre className="rounded border border-border bg-muted/40 p-2 text-xs whitespace-pre-wrap">
                    {formatHarnessStdoutForDisplay(runOutput.stdout)}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">stderr</p>
                  <pre className="rounded border border-border bg-muted/40 p-2 text-xs whitespace-pre-wrap">
                    {runOutput.stderr?.trim() ? runOutput.stderr : "-"}
                  </pre>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Execution time: {runOutput.executionTime ?? "-"} ms
              </p>
            </div>
          )} */}

          {/* Test Case Tabs */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-thin">
            {allTestCases.map((tc, index) => {
              const result = getResultForTestCase(tc.id);
              const isActive = activeTab === tc.id || (activeTab === null && index === 0);

              return (
                <button
                  key={tc.id}
                  onClick={() => setActiveTab(tc.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono transition-all duration-200 shrink-0 mt-0.5 ml-0.5 border",
                    isActive
                      ? "bg-primary/10 text-foreground border-primary/30 font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent font-medium",
                    result?.passed && isActive && "border-arena-success/50 bg-arena-success/5",
                    result && !result.passed && isActive && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  {result && (
                    <span className={cn(
                      "flex items-center justify-center w-4 h-4 rounded-full text-[10px]",
                      result.passed
                        ? "bg-arena-success text-white"
                        : "bg-destructive text-white"
                    )}>
                      {result.passed ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                    </span>
                  )}
                  {tc.isCustom
                    ? `Custom ${index - testCases.length + 1}`
                    : `Case ${index + 1}`}
                </button>
              );
            })}

            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          {/* Active Test Case Content */}
          <div className="space-y-3">
            {allTestCases.map((tc, index) => {
              const result = getResultForTestCase(tc.id);
              const isActive = activeTab === tc.id || (activeTab === null && index === 0);

              if (!isActive) return null;

              return (
                <div key={tc.id} className="space-y-3 animate-in fade-in-0 duration-200">
                  {/* Status Banner */}
                  {result && (
                    <div className={cn(
                      "flex items-center justify-between p-3 rounded-lg transition-all duration-300",
                      result.passed
                        ? "bg-arena-success/10 border border-arena-success/30"
                        : "bg-destructive/10 border border-destructive/30"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full",
                          result.passed ? "bg-arena-success" : "bg-destructive"
                        )}>
                          {result.passed ? (
                            <Check className="h-3.5 w-3.5 text-white" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>
                        <span className={cn(
                          "font-mono text-sm font-semibold",
                          result.passed ? "text-arena-success" : "text-destructive"
                        )}>
                          {result.passed ? "Test Passed" : "Test Failed"}
                        </span>
                      </div>
                      {tc.isCustom && (
                        <button
                          onClick={() => onRemoveCustomTestCase(tc.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Input/Output Grid */}
                  <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                    {/* Input */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                          Input
                        </span>
                      </div>
                      <pre className="p-3 rounded-lg bg-muted/50 border border-border font-mono text-sm text-foreground/90 overflow-x-auto whitespace-pre-wrap">
                        {formatTestCaseInput(tc.input, signature)}
                      </pre>
                    </div>

                    {/* Expected Output */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          result?.passed ? "bg-arena-success" : result ? "bg-arena-warning" : "bg-muted-foreground"
                        )} />
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                          Expected
                        </span>
                      </div>
                      <pre className={cn(
                        "p-3 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap border",
                        result?.passed
                          ? "bg-arena-success/5 border-arena-success/20 text-arena-success"
                          : "bg-muted/50 border-border text-foreground/90"
                      )}>
                        {tc.expectedOutput || "-"}
                      </pre>
                    </div>

                    {/* Actual Output */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          result?.passed
                            ? "bg-arena-success"
                            : result
                              ? "bg-destructive"
                              : "bg-muted-foreground"
                        )} />
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                          Actual Output
                        </span>
                      </div>
                      <pre className={cn(
                        "p-3 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap border",
                        result?.passed
                          ? "bg-arena-success/5 border-arena-success/20 text-arena-success"
                          : result
                            ? "bg-destructive/5 border-destructive/20 text-destructive"
                            : "bg-muted/50 border-border text-foreground/90"
                      )}>
                        {result?.actualOutput?.trim() ? result.actualOutput : "-"}
                      </pre>
                    </div>
                  </div>

                  {/* Delete button for custom (when no result) */}
                  {tc.isCustom && !result && (
                    <button
                      onClick={() => onRemoveCustomTestCase(tc.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove custom test case
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Custom Test Case Modal */}
          <Dialog open={showAddForm} onOpenChange={handleCloseAddModal}>
            <DialogContent className="bg-card border-border sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-mono">
                  <Plus className="h-4 w-4 text-primary" />
                  New Custom Test Case
                </DialogTitle>
                <DialogDescription>
                  {hasSignature
                    ? "Enter values for each parameter to create a test case."
                    : "Add a custom test case with input and expected output."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {hasSignature ? (
                  <div className="space-y-3">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Input Parameters
                    </label>
                    {params.map((param, pIdx) => (
                      <div key={pIdx} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-medium text-foreground/80">
                            {param.name || `arg${pIdx}`}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground/60">
                            ({param.type})
                          </span>
                        </div>
                        <input
                          value={customInputs[pIdx] ?? ""}
                          onChange={(e) => {
                            const next = [...customInputs];
                            next[pIdx] = e.target.value;
                            setCustomInputs(next);
                          }}
                          className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/40"
                          placeholder={getParamPlaceholder(param.type)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label
                      htmlFor="add-tc-input"
                      className="text-xs font-mono text-muted-foreground uppercase tracking-wider"
                    >
                      Input
                    </label>
                    <textarea
                      id="add-tc-input"
                      value={customInputs[0] ?? ""}
                      onChange={(e) => setCustomInputs([e.target.value])}
                      className="w-full h-24 bg-muted/50 border border-border rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                      placeholder="Enter test input..."
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="add-tc-expected"
                      className="text-xs font-mono text-muted-foreground uppercase tracking-wider"
                    >
                      Expected Output
                    </label>
                    <span className="text-[11px] text-muted-foreground/60">
                      (optional{signature?.returnType ? ` \u00b7 ${signature.returnType}` : ""})
                    </span>
                  </div>
                  <input
                    id="add-tc-expected"
                    value={customExpectedOutput}
                    onChange={(e) => setCustomExpectedOutput(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/40"
                    placeholder={getReturnTypePlaceholder(signature?.returnType)}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleCloseAddModal(false)}
                  className="font-mono"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCustom}
                  disabled={!hasAnyInput}
                  className="font-mono arena-glow"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Test Case
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default TestCasePanel;
