import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDebounce } from "use-debounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from "@/components/common/Pagination";
import { useProblemsQuery, useProblemTagsQuery } from "@/queries/practice.queries";
import {
  ProblemSortEnum,
  ProblemStatusFilterEnum,
  type ProblemSort,
} from "@/schema/practice.schema";
import { DifficultyEnum, type Difficulty } from "@/schema/problem.schema";
import { paths } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { Search, X, Code2, CheckCircle2, CircleDashed } from "lucide-react";

const ITEMS_PER_PAGE = 20;

const difficultyStyles: Record<Difficulty, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

const SORT_LABELS: Record<ProblemSort, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
  "difficulty-asc": "Easiest First",
  "difficulty-desc": "Hardest First",
  title: "Title (A–Z)",
  "acceptance-desc": "Highest Acceptance",
  "acceptance-asc": "Lowest Acceptance",
  "most-solved": "Most Solved",
};

/** `acceptanceRate` is 0..1; a problem with no verdicts yet shows a dash. */
const formatAcceptance = (rate: number, totalSubmissions: number): string =>
  totalSubmissions === 0 ? "—" : `${Math.round(rate * 100)}%`;

/**
 * Filters live in the URL, not component state: a filtered catalogue is
 * something people share and expect the back button to walk through.
 */
function useProblemFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  /** Patch params. Any change other than paging resets to page 1. */
  const update = useCallback(
    (
      patch: Record<string, string | string[] | undefined>,
      { resetPage = true }: { resetPage?: boolean } = {},
    ) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            next.delete(key);
            if (Array.isArray(value)) {
              for (const item of value) next.append(key, item);
            } else if (value != null && value !== "") {
              next.set(key, value);
            }
          }
          if (resetPage) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const rawPage = Number(searchParams.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const difficultyParam = searchParams.get("difficulty");
  const difficulty = DifficultyEnum.safeParse(difficultyParam);

  const sortParam = searchParams.get("sortBy");
  const sort = ProblemSortEnum.safeParse(sortParam);

  const statusParam = searchParams.get("status");
  const status = ProblemStatusFilterEnum.safeParse(statusParam);

  return {
    page,
    search: searchParams.get("search") ?? "",
    difficulty: difficulty.success ? difficulty.data : undefined,
    tags: searchParams.getAll("tags"),
    status: status.success ? status.data : undefined,
    sortBy: sort.success ? sort.data : ("newest" as ProblemSort),

    update,
  };
}

const ProblemRowSkeleton = () => (
  <div className="flex items-center gap-4 border-b border-border px-4 py-3.5">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="ml-auto h-4 w-16" />
    <Skeleton className="h-4 w-12" />
  </div>
);

const Problems = () => {
  const filters = useProblemFilters();
  const { search: activeSearch, update } = filters;

  // Local mirror so typing stays responsive; the URL updates once it settles.
  const [searchInput, setSearchInput] = useState(activeSearch);
  const [debouncedSearch] = useDebounce(searchInput, 400);

  useEffect(() => {
    if (debouncedSearch !== activeSearch) {
      update({ search: debouncedSearch || undefined });
    }
  }, [debouncedSearch, activeSearch, update]);

  const { data, isLoading, isError } = useProblemsQuery({
    page: filters.page,
    limit: ITEMS_PER_PAGE,
    search: filters.search || undefined,
    difficulty: filters.difficulty,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    status: filters.status,
    sortBy: filters.sortBy,
  });

  const { data: allTags = [] } = useProblemTagsQuery();

  const problems = data?.problems ?? [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.totalItems / ITEMS_PER_PAGE) : 0;

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.difficulty) ||
    Boolean(filters.status) ||
    filters.tags.length > 0;

  const toggleTag = (tag: string) => {
    const next = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    filters.update({ tags: next });
  };

  const clearFilters = () => {
    setSearchInput("");
    filters.update({
      search: undefined,
      difficulty: undefined,
      status: undefined,
      tags: [],
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto space-y-6 px-4 py-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Problems</h1>
          <p className="text-muted-foreground">
            Practise at your own pace — no contest, no clock.
          </p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search problems..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="border-border bg-secondary/50 pl-9"
            />
          </div>

          <Select
            value={filters.status ?? "all"}
            onValueChange={(value) =>
              filters.update({ status: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger className="w-full border-border bg-secondary/50 sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Status</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="attempted">Attempted</SelectItem>
              <SelectItem value="solved">Solved</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.difficulty ?? "all"}
            onValueChange={(value) =>
              filters.update({ difficulty: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger className="w-full border-border bg-secondary/50 sm:w-[150px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sortBy}
            onValueChange={(value) => filters.update({ sortBy: value })}
          >
            <SelectTrigger className="w-full border-border bg-secondary/50 sm:w-[170px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {ProblemSortEnum.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {SORT_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {allTags.map((tag) => {
              const isSelected = filters.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    isSelected
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tag}
                </button>
              );
            })}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 gap-1 text-xs text-muted-foreground"
              >
                <X className="h-3 w-3" />
                Clear filters
              </Button>
            )}
          </div>
        )}

        {meta && (
          <div className="text-sm text-muted-foreground">
            Showing {problems.length} of {meta.totalItems} problems
          </div>
        )}

        {/* List */}
        {isError ? (
          <div className="rounded-lg border border-border py-16 text-center">
            <p className="text-destructive">Couldn&apos;t load problems.</p>
          </div>
        ) : isLoading ? (
          <div className="overflow-hidden rounded-lg border border-border">
            {Array.from({ length: 8 }, (_, i) => (
              <ProblemRowSkeleton key={i} />
            ))}
          </div>
        ) : problems.length === 0 ? (
          <div className="rounded-lg border border-border py-16 text-center">
            <Code2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="mb-1 text-lg font-semibold text-foreground">
              No problems found
            </h2>
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? "Try loosening your filters."
                : "No problems have been published for practice yet."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border">
              {/* Column headers so the numeric columns aren't unlabelled. */}
              <div className="hidden items-center gap-4 border-b border-border bg-secondary/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:flex">
                <span className="w-5 shrink-0" />
                <span className="min-w-0 flex-1">Title</span>
                <span className="w-40 shrink-0" />
                <span className="w-20 shrink-0 text-right">Acceptance</span>
                <span className="w-16 shrink-0 text-right">Solved</span>
                <span className="w-16 shrink-0 text-right">Difficulty</span>
              </div>

              {problems.map((problem) => (
                <Link
                  key={problem.id}
                  to={paths.problem(problem.slug)}
                  className="flex items-center gap-4 border-b border-border px-4 py-3.5 transition-colors last:border-b-0 hover:bg-accent/50"
                >
                  <span className="w-5 shrink-0">
                    {problem.status === "solved" ? (
                      <CheckCircle2
                        className="h-4 w-4 text-emerald-500"
                        aria-label="Solved"
                      />
                    ) : problem.status === "attempted" ? (
                      <CircleDashed
                        className="h-4 w-4 text-amber-500"
                        aria-label="Attempted"
                      />
                    ) : null}
                  </span>

                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {problem.title}
                  </span>

                  <div className="hidden w-40 shrink-0 justify-end gap-1.5 md:flex">
                    {problem.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <span className="hidden w-20 shrink-0 text-right text-sm text-muted-foreground md:inline">
                    {formatAcceptance(problem.acceptanceRate, problem.totalSubmissions)}
                  </span>

                  <span className="hidden w-16 shrink-0 text-right text-sm text-muted-foreground md:inline">
                    {problem.solvedBy}
                  </span>

                  <span
                    className={cn(
                      "w-16 shrink-0 text-right text-sm font-medium capitalize",
                      difficultyStyles[problem.difficulty],
                    )}
                  >
                    {problem.difficulty}
                  </span>
                </Link>
              ))}
            </div>

            <Pagination
              currentPage={filters.page}
              totalPages={totalPages}
              hasNext={meta?.hasNext ?? false}
              hasPrev={meta?.hasPrev ?? false}
              onPageChange={(page) =>
                filters.update({ page: String(page) }, { resetPage: false })
              }
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Problems;
