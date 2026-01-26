import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import type { TestCaseUI, ContestDsa } from "@/schema/problem.schema";
import { Button } from "@/components/ui/button";
import { Play, Send, Loader2, FileText, Terminal, AlertTriangle, Zap, BookOpen, Award, Clock, Database, Tag } from "lucide-react";
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
import type { TestCaseResult } from "@/schema/problem.schema";

interface CodingQuestionProps {
  question: ContestDsa;
  code: string;
  language: string;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  onSubmit: () => void;
}

const languageConfig: Record<string, { label: string; monacoLang: string }> = {
  cpp: { label: "C++", monacoLang: "cpp" },
  java: { label: "Java", monacoLang: "java" },
  python: { label: "Python", monacoLang: "python" },
  javascript: { label: "JavaScript", monacoLang: "javascript" },
};

const DSAQuestion = ({
  question,
  code,
  language,
  onCodeChange,
  onLanguageChange,
  onSubmit,
}: CodingQuestionProps) => {
  const [customTestCases, setCustomTestCases] = useState<TestCaseUI[]>([]);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCustomTestCase = (testCase: TestCaseUI) => {
    setCustomTestCases((prev) => [...prev, testCase]);
  };

  const handleRemoveCustomTestCase = (id: number) => {
    setCustomTestCases((prev) => prev.filter((tc) => tc.id !== id));
    setTestResults((prev) => prev.filter((r) => r.id !== id));
  };

  const handleLanguageChange = (newLang: string) => {
    onLanguageChange(newLang);
    onCodeChange((question.boilerplate?.[newLang] as string) || "");
  };

  const simulateRun = useCallback(async () => {
    setIsRunning(true);
    setTestResults([]);

    const allTestCases = [...(question.testCases || []), ...customTestCases];
    const results: TestCaseResult[] = [];

    for (const tc of allTestCases) {
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));
      const passed = Math.random() > 0.3;
      results.push({
        id: tc.id,
        passed,
        actualOutput: passed ? tc.expectedOutput : "Wrong output",
      });
      setTestResults([...results]);
    }

    setIsRunning(false);
  }, [question.testCases, customTestCases]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    onSubmit();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-arena-success bg-arena-success/20 border-arena-success/30";
      case "Medium":
        return "text-arena-warning bg-arena-warning/20 border-arena-warning/30";
      case "Hard":
        return "text-destructive bg-destructive/20 border-destructive/30";
      default:
        return "text-muted-foreground bg-muted border-border";
    }
  };

  const handleAllotmentChange = (sizes: number[]) => {
    console.log(sizes);
  };

  return (
    <div className="h-full min-h-0">
      <Allotment
        defaultSizes={[45, 55]}
        minSize={30}
        proportionalLayout
        className="h-full"
      >
        {/* Left Pane - Problem Description */}
        <Allotment.Pane minSize={200} preferredSize="45%">
          <div className="h-full w-full overflow-auto bg-background">
            <div className="flex flex-col min-h-full">
              <div className="px-6 py-4 border-b border-border bg-card/50 shrink-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {question.difficulty && (
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${getDifficultyColor(
                        question.difficulty
                      )}`}
                    >
                      {question.difficulty}
                    </span>
                  )}
                  <span className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md border border-primary/20">
                    <Zap className="inline-block h-3 w-3 mr-1" />
                    Coding
                  </span>
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
                <h2 className="font-mono text-xl font-bold text-foreground">{question.title}</h2>
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
                  <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-border">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h3 className="font-mono text-sm font-semibold text-primary">Problem Statement</h3>
                  </div>
                  <div className="p-4">
                    <p className="text-foreground/90 leading-relaxed whitespace-pre-line text-sm">
                      {question.description}
                    </p>
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <section className="rounded-xl border border-border bg-card/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-arena-success/10 to-transparent border-b border-border">
                      <FileText className="h-4 w-4 text-arena-success" />
                      <h3 className="font-mono text-sm font-semibold text-arena-success">Input Format</h3>
                    </div>
                    <div className="p-4">
                      <pre className="font-mono text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {question.inputFormat ?? "Read input from standard input."}
                      </pre>
                    </div>
                  </section>

                  <section className="rounded-xl border border-border bg-card/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500/10 to-transparent border-b border-border">
                      <Terminal className="h-4 w-4 text-blue-400" />
                      <h3 className="font-mono text-sm font-semibold text-blue-400">Output Format</h3>
                    </div>
                    <div className="p-4">
                      <pre className="font-mono text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {question.outputFormat ?? "Output your result to standard output."}
                      </pre>
                    </div>
                  </section>
                </div>

                <section className="rounded-xl border border-arena-warning/20 bg-arena-warning/5 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-arena-warning/15 to-transparent border-b border-arena-warning/20">
                    <AlertTriangle className="h-4 w-4 text-arena-warning" />
                    <h3 className="font-mono text-sm font-semibold text-arena-warning">Constraints</h3>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-2">
                      {(question.constraints ?? []).map((constraint: string, index: number) => (
                        <li key={index} className="flex items-start gap-3 text-sm">
                          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-arena-warning/20 text-arena-warning text-xs font-bold shrink-0">
                            {index + 1}
                          </span>
                          <code className="font-mono text-foreground/90 leading-relaxed">{constraint}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-card/30 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500/10 to-transparent border-b border-border">
                    <Zap className="h-4 w-4 text-purple-400" />
                    <h3 className="font-mono text-sm font-semibold text-purple-400">Examples</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {question.testCases?.slice(0, 2).map((tc: TestCaseUI, index: number) => (
                      <div
                        key={tc.id}
                        className="rounded-lg bg-background/50 border border-border overflow-hidden"
                      >
                        <div className="px-3 py-2 bg-muted/30 border-b border-border">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            Example {index + 1}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-border">
                          <div className="p-3">
                            <span className="text-xs font-medium text-arena-success block mb-2">Input</span>
                            <pre className="font-mono text-sm text-foreground bg-muted/30 rounded-md p-2 overflow-x-auto">
                              {tc.input}
                            </pre>
                          </div>
                          <div className="p-3">
                            <span className="text-xs font-medium text-blue-400 block mb-2">Output</span>
                            <pre className="font-mono text-sm text-foreground bg-muted/30 rounded-md p-2 overflow-x-auto">
                              {tc.expectedOutput}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
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
              onChange={handleAllotmentChange}

            >
              {/* Editor Pane */}
              <Allotment.Pane minSize={150} preferredSize="70%">
                <div className="h-full w-full flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-32 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(languageConfig).map(([key, config]) => (
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
                        onClick={simulateRun}
                        disabled={isRunning}
                      >
                        {isRunning ? (
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
                        Submit
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden">
                    <Editor
                      height="100%"
                      language={languageConfig[language]?.monacoLang || "plaintext"}
                      value={code}
                      onChange={(value: string | undefined) => onCodeChange(value ?? "")}
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
                    isRunning={isRunning}
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
