import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Code,
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { pageVariants } from "@/lib/animations";
import { useMcqQuestionsQuery, useDsaProblemsQuery } from "@/queries/problem.queries";
import type { McqQuestion, DsaProblem } from "@/schema/problem.schema";
import { EditMcqModal } from "@/components/questions/EditMcqModal";
import { EditDsaModal } from "@/components/questions/EditDsaModal";

const ITEMS_PER_PAGE = 5;

const QuestionBank = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedMcqSearch, setDebouncedMcqSearch] = useState("");
  const [debouncedDsaSearch, setDebouncedDsaSearch] = useState("");
  const [mcqPage, setMcqPage] = useState(1);
  const [dsaPage, setDsaPage] = useState(1);
  const [editingMcq, setEditingMcq] = useState<McqQuestion | null>(null);
  const [editingDsa, setEditingDsa] = useState<DsaProblem | null>(null);
  const [isEditMcqOpen, setIsEditMcqOpen] = useState(false);
  const [isEditDsaOpen, setIsEditDsaOpen] = useState(false);

  // Debounce search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMcqSearch(searchQuery);
      setDebouncedDsaSearch(searchQuery);
      // Reset to page 1 when search changes
      setMcqPage(1);
      setDsaPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch MCQ questions from API with search
  const {
    data: mcqData,
    isLoading: isLoadingMcqs,
  } = useMcqQuestionsQuery(
    mcqPage,
    ITEMS_PER_PAGE,
    debouncedMcqSearch || undefined
  );

  // Fetch DSA problems from API with search
  const {
    data: dsaData,
    isLoading: isLoadingDsa,
  } = useDsaProblemsQuery(
    dsaPage,
    ITEMS_PER_PAGE,
    debouncedDsaSearch || undefined
  );

  const currentMcqs = mcqData?.questions || [];
  const mcqTotalPages = mcqData?.totalPages || 0;
  const mcqTotal = mcqData?.total || 0;

  const currentDsa = dsaData?.problems || [];
  const dsaTotalPages = dsaData?.totalPages || 0;
  const dsaTotal = dsaData?.total || 0;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage, "...", totalPages);
      }
    }
    return pages;
  };

  const PaginationControls = ({
    currentPage,
    totalPages,
    onPrev,
    onNext,
    onPageClick,
    totalItems,
    startIndex,
    endIndex,
    itemName,
  }: {
    currentPage: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    onPageClick: (page: number) => void;
    totalItems: number;
    startIndex: number;
    endIndex: number;
    itemName: string;
  }) => (
    <div className="flex items-center justify-between mt-6">
      <p className="text-sm text-muted-foreground">
        Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of{" "}
        {totalItems} {itemName}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentPage === 1}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers(currentPage, totalPages).map((page, index) =>
            typeof page === "number" ? (
              <Button
                key={index}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageClick(page)}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            ) : (
              <span key={index} className="px-2 text-muted-foreground">
                {page}
              </span>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentPage === totalPages}
          className="gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <motion.div
        className="p-8"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Question Bank
            </h1>
            <p className="text-muted-foreground">
              Manage MCQ questions and DSA problems.
            </p>
          </div>
          <Button asChild>
            <Link to="/questions/new">
              <Plus className="w-4 h-4 mr-2" />
              New Question
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="arena-input pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs for MCQ and DSA */}
        <Tabs defaultValue="mcq" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="mcq" className="gap-2">
              <FileText className="w-4 h-4" />
              MCQ Questions ({mcqTotal})
            </TabsTrigger>
            <TabsTrigger value="dsa" className="gap-2">
              <Code className="w-4 h-4" />
              DSA Problems ({dsaTotal})
            </TabsTrigger>
          </TabsList>

          {/* MCQ Tab */}
          <TabsContent value="mcq">
            <div className="arena-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Question
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Options
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Points
                    </th>
                    <th className="text-right py-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingMcqs ? (
                    // Skeleton loaders for MCQ
                    Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                      <tr
                        key={index}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-start gap-3">
                            <Skeleton className="w-4 h-4 mt-1" />
                            <Skeleton className="h-5 flex-1 max-w-md" />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="py-4 px-4">
                          <Skeleton className="h-4 w-12" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      {currentMcqs.map((question) => {
                        // Options are already parsed by zod schema transform
                        const options = question.options;

                        return (
                          <tr
                            key={question.id}
                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-start gap-3">
                                <span className="text-muted-foreground mt-1">
                                  <FileText className="w-4 h-4" />
                                </span>
                                <span className="font-medium text-foreground line-clamp-2">
                                  {question.questionText}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm text-muted-foreground">
                              {options.length} options
                            </td>
                            <td className="py-4 px-4 text-sm text-muted-foreground font-mono">
                              {question.points}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingMcq(question);
                                    setIsEditMcqOpen(true);
                                  }}
                                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>

              {currentMcqs.length === 0 && !isLoadingMcqs && (
                <div className="py-12 text-center text-muted-foreground">
                  No MCQ questions found.
                </div>
              )}
            </div>

            {mcqTotalPages > 1 && !isLoadingMcqs && (
              <PaginationControls
                currentPage={mcqPage}
                totalPages={mcqTotalPages}
                onPrev={() => setMcqPage((p) => Math.max(p - 1, 1))}
                onNext={() => setMcqPage((p) => Math.min(p + 1, mcqTotalPages))}
                onPageClick={setMcqPage}
                totalItems={mcqTotal}
                startIndex={(mcqPage - 1) * ITEMS_PER_PAGE}
                endIndex={Math.min(mcqPage * ITEMS_PER_PAGE, mcqTotal)}
                itemName="questions"
              />
            )}
          </TabsContent>

          {/* DSA Tab */}
          <TabsContent value="dsa">
            <div className="arena-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Limits
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Points
                    </th>
                    <th className="text-right py-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingDsa ? (
                    // Skeleton loaders for DSA
                    Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                      <tr
                        key={index}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-start gap-3">
                            <Skeleton className="w-4 h-4 mt-1" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-5 w-48" />
                              <Skeleton className="h-3 w-64" />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Skeleton className="h-4 w-12" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      {currentDsa.map((problem) => (
                        <tr
                          key={problem.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-start gap-3">
                              <span className="text-muted-foreground mt-1">
                                <Code className="w-4 h-4" />
                              </span>
                              <div>
                                <span className="font-medium text-foreground font-mono">
                                  {problem.title}
                                </span>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {problem.description}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {problem.tags.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {problem.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{problem.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {problem.timeLimit}ms
                              </span>
                              <span className="flex items-center gap-1">
                                <Database className="w-3 h-3" />
                                {problem.memoryLimit}MB
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-muted-foreground font-mono">
                            {problem.points}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingDsa(problem);
                                  setIsEditDsaOpen(true);
                                }}
                                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>

              {currentDsa.length === 0 && !isLoadingDsa && (
                <div className="py-12 text-center text-muted-foreground">
                  No DSA problems found.
                </div>
              )}
            </div>

            {dsaTotalPages > 1 && !isLoadingDsa && (
              <PaginationControls
                currentPage={dsaPage}
                totalPages={dsaTotalPages}
                onPrev={() => setDsaPage((p) => Math.max(p - 1, 1))}
                onNext={() => setDsaPage((p) => Math.min(p + 1, dsaTotalPages))}
                onPageClick={setDsaPage}
                totalItems={dsaTotal}
                startIndex={(dsaPage - 1) * ITEMS_PER_PAGE}
                endIndex={Math.min(dsaPage * ITEMS_PER_PAGE, dsaTotal)}
                itemName="problems"
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Modals */}
        <EditMcqModal
          question={editingMcq}
          isOpen={isEditMcqOpen}
          onClose={() => {
            setIsEditMcqOpen(false);
            setEditingMcq(null);
          }}
        />
        <EditDsaModal
          problem={editingDsa}
          isOpen={isEditDsaOpen}
          onClose={() => {
            setIsEditDsaOpen(false);
            setEditingDsa(null);
          }}
        />
      </motion.div>
    </AdminLayout>
  );
};

export default QuestionBank;
