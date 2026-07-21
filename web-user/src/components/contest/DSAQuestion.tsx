import { useState, useCallback, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/common/Markdown";
import Editor from "@monaco-editor/react";
import type { TestCaseUI, SolveProblem } from "@/schema/problem.schema";
import { LANGUAGE_CONFIG, type Language } from "@/schema/language.schema";
import { Button } from "@/components/ui/button";
import { Play, Send, Loader2, FileText, Terminal, AlertTriangle, Zap, BookOpen, Award, Clock, Database, Tag, Copy, Check } from "lucide-react";
import { Allotment } from "allotment";
import TestCasePanel from "./TestCasePanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TestCaseResult } from "@/schema/problem.schema";
import { useDebouncedCallback } from "use-debounce";
import { runApi } from "@/api/run";
import type { RunCodeApiResult } from "@/api/run";
import { useMutation } from "@tanstack/react-query";
import type { RunCodeBodySchemaType } from "@/schema/submission.schema";
import { harnessStdoutToTestResults } from "@/lib/runStdout";

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

/** Which view the left pane is showing, when it has more than one. */
export type SolveSideTab = "description" | "submissions";

interface PaneShellProps {
  hasTabs: boolean;
  activeTab: SolveSideTab;
  onTabChange?: (tab: SolveSideTab) => void;
  submissionCount: number;
  submissions: ReactNode;
  children: ReactNode;
}

/**
 * The left pane's frame.
 *
 * Two shapes on purpose. Without tabs it reproduces the original single
 * scrolling container byte for byte, so the contest surface — which shares this
 * component — sees no change at all. With tabs, scrolling has to move inside
 * the panel so the tab strip stays pinned while the description scrolls under
 * it, which the original structure could not do.
 *
 * The description stays MOUNTED while Submissions is showing, hidden with CSS
 * rather than unmounted. Losing your scroll position in a long problem
 * statement every time you glance at a verdict is precisely the annoyance that
 * makes people stop using the tab.
 */
const PaneShell = ({
  hasTabs,
  activeTab,
  onTabChange,
  submissionCount,
  submissions,
  children,
}: PaneShellProps) => {
  if (!hasTabs) {
    return <div className="h-full w-full overflow-auto bg-background">{children}</div>;
  }

  const tabs: { id: SolveSideTab; label: string; badge?: number }[] = [
    { id: "description", label: "Description" },
    { id: "submissions", label: "Submissions", badge: submissionCount },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <div
        role="tablist"
        aria-label="Problem panel"
        className="flex shrink-0 items-center gap-1 border-b border-border bg-card px-2"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`pane-${tab.id}`}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 font-mono text-sm transition-colors",
                // The active marker is a border on the element itself rather
                // than an absolutely-positioned bar, so it can't drift out of
                // alignment when the pane is resized by the split handle.
                "border-b-2",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        id="pane-description"
        role="tabpanel"
        // `hidden` rather than conditional rendering — see the note above about
        // preserving scroll position.
        hidden={activeTab !== "description"}
        className="min-h-0 flex-1 overflow-auto"
      >
        {children}
      </div>

      <div
        id="pane-submissions"
        role="tabpanel"
        hidden={activeTab !== "submissions"}
        className="min-h-0 flex-1 overflow-auto p-3"
      >
        {submissions}
      </div>
    </div>
  );
};

interface CodingQuestionProps {
  question: SolveProblem;
  code: string;
  language: Language;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: Language, boilerplate?: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  /** Submit button text. Contest and practice word this differently. */
  submitLabel?: string;

  /**
   * Optional second view for the left pane, shown as a "Submissions" tab beside
   * "Description".
   *
   * Opt-in because this component is shared: practice has a submission history
   * worth putting a tab on, and a contest attempt does not. When omitted the
   * pane renders exactly as it always has — no tab strip at all — so the
   * contest surface is untouched by this.
   */
  submissionsPanel?: ReactNode;
  /** Count shown on the tab. */
  submissionCount?: number;
  /**
   * Controlled by the parent, because the parent is what knows when to change
   * it: submitting should pull the Submissions tab forward, and that event
   * happens up in the page, not here.
   */
  activeSideTab?: SolveSideTab;
  onSideTabChange?: (tab: SolveSideTab) => void;
}

const DSAQuestion = ({
  question,
  code,
  language,
  onCodeChange,
  onLanguageChange,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Submit",
  submissionsPanel,
  submissionCount = 0,
  activeSideTab = "description",
  onSideTabChange,
}: CodingQuestionProps) => {
  const [customTestCases, setCustomTestCases] = useState<TestCaseUI[]>([]);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState(code);
  const [runOutput, setRunOutput] = useState<{
    stdout?: string | null;
    stderr?: string | null;
    status?: { id: number; description: string };
    executionTime?: number | null;
  } | null>(null);

  const runCodeMutation = useMutation({
    mutationFn: runApi.runCode,
  });

  useEffect(() => {
    setCurrentCode(code);
  }, [code, question.id, language]);

  useEffect(() => {
    return () => {
      debouncedCodeChange.flush();
    };
  }, []);

  const debouncedCodeChange = useDebouncedCallback(
    (value: string) => {
      onCodeChange(value);
    },
    2000
  );

  const handleAddCustomTestCase = (testCase: TestCaseUI) => {
    setCustomTestCases((prev) => [...prev, testCase]);
  };

  const handleRemoveCustomTestCase = (id: number) => {
    setCustomTestCases((prev) => prev.filter((tc) => tc.id !== id));
    setTestResults((prev) => prev.filter((r) => r.id !== id));
  };

  const handleLanguageChange = (newLang: Language) => {
    debouncedCodeChange.flush();
    onLanguageChange(newLang);
  };

  const handleRun = useCallback(async () => {
    debouncedCodeChange.flush();
    setTestResults([]);
    setRunOutput(null);
    const payload: RunCodeBodySchemaType = {
      code: currentCode,
      language,
    };
    if (question.signature && question.testCases.length > 0) {
      payload.signature = question.signature as NonNullable<
        RunCodeBodySchemaType["signature"]
      >;
      payload.testCases = question.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      }));
    }
    const data = await runCodeMutation.mutateAsync(payload);
    const runData = data as RunCodeApiResult;
    setRunOutput({
      stdout: runData.stdout,
      stderr: runData.stderr,
      status: runData.status,
      executionTime: runData.executionTime,
    });
    if (question.testCases.length > 0) {
      setTestResults(
        harnessStdoutToTestResults(data.stdout, question.testCases)
      );
    }
  }, [
    currentCode,
    language,
    debouncedCodeChange,
    runCodeMutation,
    question.signature,
    question.testCases,
  ]);

  const handleSubmit = async () => {
    debouncedCodeChange.flush();
    onSubmit();
  };

  const handleCopy = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // The API sends lowercase difficulties ("easy"), so matching on "Easy" here
  // meant every badge fell through to the grey default.
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "text-arena-success bg-arena-success/20 border-arena-success/30";
      case "medium":
        return "text-arena-warning bg-arena-warning/20 border-arena-warning/30";
      case "hard":
        return "text-destructive bg-destructive/20 border-destructive/30";
      default:
        return "text-muted-foreground bg-muted border-border";
    }
  };

  const handleCodeChange = (value: string) => {
    setCurrentCode(value);
    debouncedCodeChange(value);
  };

  return (
    <div className="h-full min-h-0">
      <Allotment
        defaultSizes={[45, 55]}
        minSize={30}
        proportionalLayout
        className="h-full"
      >
        {/* Left Pane - Problem Description (+ Submissions, when provided) */}
        <Allotment.Pane minSize={200} preferredSize="45%">
          <PaneShell
            hasTabs={Boolean(submissionsPanel)}
            activeTab={activeSideTab}
            onTabChange={onSideTabChange}
            submissionCount={submissionCount}
            submissions={submissionsPanel}
          >
            <div className="flex flex-col min-h-full">
              <div className="px-6 py-4 border-b border-border bg-card/50 shrink-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {question.difficulty && (
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border capitalize ${getDifficultyColor(
                        question.difficulty
                      )}`}
                    >
                      {question.difficulty}
                    </span>
                  )}
                  {/* <span className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md border border-primary/20">
                    <Zap className="inline-block h-3 w-3 mr-1" />
                    Coding
                  </span> */}
                  {(question.tags ?? []).length > 0 && (
                    <>
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      {(question.tags ?? []).map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="text-xs font-normal px-2 py-0"
                        >
                          {t}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>
                <h2 className="font-mono text-2xl font-bold text-foreground mb-3" style={{ fontSize: '24px', fontWeight: 700 }}>{question.title}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-500/80" />
                    {question.points ?? 100} pts
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {question.timeLimit ?? 2000} ms
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Database className="h-4 w-4" />
                    {question.memoryLimit ?? 256} MB
                  </span>
                </div>
              </div>

              <div className="flex-1 p-6 space-y-6">
                <section className="rounded-xl border border-border bg-card/30 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-linear-to-r from-primary/10 to-transparent border-b border-border">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h3 className="font-mono text-sm font-semibold text-primary">
                      Problem Statement
                    </h3>
                  </div>
                  <div className="p-4">
                    {/* Markdown, so a statement can carry formatting and the
                        screenshots authors embed. Sanitised and HTML-free —
                        see `common/Markdown`. */}
                    <Markdown className="text-sm">{question.description}</Markdown>
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {question.inputFormat && <section className="rounded-xl border border-border bg-card/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-mono text-sm font-semibold text-foreground">
                        Input Format
                      </h3>
                    </div>
                    <div className="p-4">
                      <pre className="font-mono text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {question.inputFormat ?? "Read input from standard input."}
                      </pre>
                    </div>
                  </section>}

                  {question.outputFormat && <section className="rounded-xl border border-border bg-card/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-mono text-sm font-semibold text-foreground">
                        Output Format
                      </h3>
                    </div>
                    <div className="p-4">
                      <pre className="font-mono text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {question.outputFormat ?? "Output your result to standard output."}
                      </pre>
                    </div>
                  </section>}
                </div>

                {question.constraints.length > 0 && <section className="rounded-xl border border-border bg-card/30 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-mono text-sm font-semibold text-foreground">
                      Constraints
                    </h3>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-2">
                      {question.constraints.map((constraint: string, index: number) => (
                        <li key={index} className="flex items-start gap-3 text-sm">
                          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0">
                            {index + 1}
                          </span>
                          <code className="font-mono text-foreground/90 leading-relaxed">{constraint}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>}

                <section className="rounded-xl border border-border bg-card/30 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-mono text-sm font-semibold text-foreground">
                      Examples
                    </h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {question.testCases?.slice(0, 2).map((tc: TestCaseUI, index: number) => {
                      const inputFieldId = `example-${tc.id}-input`;
                      const outputFieldId = `example-${tc.id}-output`;
                      return (
                        <div
                          key={tc.id}
                          className="rounded-lg bg-background/50 border border-border overflow-hidden"
                        >
                          <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                            <span className="font-mono text-xs font-semibold text-muted-foreground">
                              Example {index + 1}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-border">
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Input
                                </span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleCopy(tc.input, inputFieldId)}
                                      className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                      {copiedField === inputFieldId ? (
                                        <Check className="h-3.5 w-3.5 text-arena-success" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {copiedField === inputFieldId ? "Copied!" : "Copy input"}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <pre className="font-mono text-sm text-foreground bg-muted/30 rounded-md p-3 overflow-x-auto">
                                {formatTestCaseInput(tc.input, question.signature as { parameters?: Array<{ name: string; type: string }> })}
                              </pre>
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Output
                                </span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleCopy(tc.expectedOutput, outputFieldId)}
                                      className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                      {copiedField === outputFieldId ? (
                                        <Check className="h-3.5 w-3.5 text-arena-success" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {copiedField === outputFieldId ? "Copied!" : "Copy output"}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <pre className="font-mono text-sm text-foreground bg-muted/30 rounded-md p-3 overflow-x-auto">
                                {tc.expectedOutput}
                              </pre>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          </PaneShell>
        </Allotment.Pane>

        {/* Right Pane - Editor + Test Cases (nested vertical Allotment) */}
        <Allotment.Pane minSize={300} preferredSize="55%">
          <div className="h-full w-full overflow-hidden">
            <Allotment
              vertical
              defaultSizes={[70, 30]}
              minSize={80}
              proportionalLayout
              className="h-full"
            >
              {/* Editor Pane */}
              <Allotment.Pane minSize={150} preferredSize="70%">
                <div className="h-full w-full flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className=" h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LANGUAGE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleRun}
                        disabled={runCodeMutation.isPending}
                      >
                        {runCodeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Run Code
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="arena-glow"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {submitLabel}
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden">
                    <Editor
                      height="100%"
                      language={LANGUAGE_CONFIG[language]?.monacoLang ?? "plaintext"}
                      value={currentCode}
                      onChange={(value: string | undefined) => handleCodeChange(value ?? "")}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "JetBrains Mono, monospace",
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        tabSize: 4,
                      }}
                    />
                  </div>
                </div>
              </Allotment.Pane>

              {/* Test Case Panel Pane - snap allows collapse via sash */}
              <Allotment.Pane minSize={50} preferredSize="30%">
                <div className="h-full w-full overflow-hidden">
                  <TestCasePanel
                    testCases={question.testCases}
                    customTestCases={customTestCases}
                    onAddCustomTestCase={handleAddCustomTestCase}
                    onRemoveCustomTestCase={handleRemoveCustomTestCase}
                    results={testResults}
                    isRunning={runCodeMutation.isPending}
                    signature={question.signature as { parameters?: Array<{ name: string; type: string }>; returnType?: string }}
                    runOutput={runOutput}
                  />
                </div>
              </Allotment.Pane>
            </Allotment>
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
};

export default DSAQuestion;
