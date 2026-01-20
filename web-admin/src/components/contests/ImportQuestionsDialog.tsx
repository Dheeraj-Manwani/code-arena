import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Code, FileText } from "lucide-react";
import { useMcqQuestionsQuery, useDsaProblemsQuery } from "@/queries/problem.queries";
import type { McqQuestion, DsaProblem } from "@/schema/problem.schema";
import type { ContestQuestion } from "./ContestQuestionItem";

interface ImportQuestionsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onImportMcq: (question: McqQuestion) => void;
    onImportDsa: (problem: DsaProblem) => void;
    contestQuestions: ContestQuestion[];
    disabled?: boolean;
}

export const ImportQuestionsDialog = ({
    isOpen,
    onOpenChange,
  onImportMcq,
  onImportDsa,
  contestQuestions,
  disabled = false,
}: ImportQuestionsDialogProps) => {
  const [questionType, setQuestionType] = useState<"mcq" | "dsa">("mcq");
  const [mcqSearchQuery, setMcqSearchQuery] = useState("");
  const [dsaSearchQuery, setDsaSearchQuery] = useState("");
  const [debouncedMcqSearch, setDebouncedMcqSearch] = useState("");
  const [debouncedDsaSearch, setDebouncedDsaSearch] = useState("");

  // Debounce search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMcqSearch(mcqSearchQuery);
    }, 700);
    return () => clearTimeout(timer);
  }, [mcqSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDsaSearch(dsaSearchQuery);
    }, 700);
    return () => clearTimeout(timer);
  }, [dsaSearchQuery]);

  // Fetch questions from API - only when there's a search query
  const initialLimit = 10;
  const shouldFetchMcq = !!debouncedMcqSearch && debouncedMcqSearch.trim() !== "";
  const shouldFetchDsa = !!debouncedDsaSearch && debouncedDsaSearch.trim() !== "";

  const { data: mcqData, isLoading: isLoadingMcq, isFetching: isFetchingMcq } = useMcqQuestionsQuery(
    1,
    initialLimit,
    debouncedMcqSearch || undefined,
    shouldFetchMcq
  );
  const { data: dsaData, isLoading: isLoadingDsa, isFetching: isFetchingDsa } = useDsaProblemsQuery(
    1,
    initialLimit,
    debouncedDsaSearch || undefined,
    shouldFetchDsa
  );

    const availableMcqs = (mcqData?.questions || []).filter(
        (q) => !contestQuestions.some((cq) => cq.type === "mcq" && cq.id === q.id)
    );

    const availableDsa = (dsaData?.problems || []).filter(
        (p) => !contestQuestions.some((cp) => cp.type === "dsa" && cp.id === p.id)
    );

    const handleQuestionTypeChange = (value: "mcq" | "dsa") => {
        setQuestionType(value);
        setMcqSearchQuery("");
        setDsaSearchQuery("");
        setDebouncedMcqSearch("");
        setDebouncedDsaSearch("");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" type="button" disabled={disabled}>
                    <Search className="w-4 h-4 mr-2" />
                    Import
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Import Questions</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <div className="mb-4">
                        <Label className="arena-label mb-2">Question Type</Label>
                        <Select value={questionType} onValueChange={handleQuestionTypeChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mcq">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        MCQ Questions
                                    </div>
                                </SelectItem>
                                <SelectItem value="dsa">
                                    <div className="flex items-center gap-2">
                                        <Code className="w-4 h-4" />
                                        DSA Problems
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={
                                questionType === "mcq"
                                    ? "Search MCQ questions..."
                                    : "Search DSA problems..."
                            }
                            value={questionType === "mcq" ? mcqSearchQuery : dsaSearchQuery}
                            onChange={(e) => {
                                if (questionType === "mcq") {
                                    setMcqSearchQuery(e.target.value);
                                } else {
                                    setDsaSearchQuery(e.target.value);
                                }
                            }}
                            className="arena-input pl-10"
                        />
                    </div>
                    {((isFetchingMcq && questionType === "mcq" && debouncedMcqSearch) ||
            (isFetchingDsa && questionType === "dsa" && debouncedDsaSearch)) && (
            <div className="flex items-center justify-center py-2 gap-2 text-sm text-muted-foreground mb-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Searching...
            </div>
          )}
          <div className="overflow-y-auto max-h-[400px] space-y-2">
            {questionType === "mcq" ? (
              !debouncedMcqSearch || debouncedMcqSearch.trim() === "" ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-base font-medium">Search questions to import</p>
                  <p className="text-sm mt-2">Enter a search term to find MCQ questions</p>
                </div>
              ) : isLoadingMcq || (!mcqData && isFetchingMcq) ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                ))
              ) : availableMcqs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No MCQs found matching &quot;{debouncedMcqSearch}&quot;
                </div>
              ) : (
                availableMcqs.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-foreground line-clamp-1">
                        {q.questionText}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {q.options?.length || 0} options • {q.points} pts
                            </p>
                        </div>
                    <Button
                            size="sm"
                      onClick={() => onImportMcq(q)}
                      type="button"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))
                          )
                      ) : !debouncedDsaSearch || debouncedDsaSearch.trim() === "" ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-base font-medium">Search questions to import</p>
                                  <p className="text-sm mt-2">Enter a search term to find DSA problems</p>
                              </div>
                          ) : isLoadingDsa || (!dsaData && isFetchingDsa) ? (
                              Array.from({ length: 3 }).map((_, i) => (
                                  <div
                                      key={i}
                                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                                  >
                                      <div className="flex-1 space-y-2">
                                          <Skeleton className="h-4 w-full" />
                                          <div className="flex gap-2">
                                              <Skeleton className="h-5 w-16" />
                                              <Skeleton className="h-5 w-16" />
                                              <Skeleton className="h-3 w-12" />
                                          </div>
                                      </div>
                                      <Skeleton className="h-9 w-9 rounded-md" />
                                  </div>
                              ))
                          ) : availableDsa.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                  No DSA problems found matching &quot;{debouncedDsaSearch}&quot;
                              </div>
                          ) : (
                              availableDsa.map((p) => (
                                  <div
                                      key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                          <p className="font-mono text-foreground">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {p.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        {p.points} pts
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onImportDsa(p)}
                    type="button"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
