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
import { ProblemFilterPanel } from "@/components/practice/ProblemFilterPanel";
import {
  useProblemsQuery,
  useProblemTagsQuery,
  useProblemProgressQuery,
} from "@/queries/practice.queries";
import {
  ProblemSortEnum,
  ProblemStatusFilterEnum,
  type ProblemSort,
  type ProblemStatusFilter,
} from "@/schema/practice.schema";
import { DifficultyEnum, type Difficulty } from "@/schema/problem.schema";
import { paths } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { Search, X, Code2, SlidersHorizontal } from "lucide-react";

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
  totalSubmissions === 0 ? "—" : `${(rate * 100).toFixed(2)}%`;

/** 1200 → "1.2K". Keeps the meta line from wrapping on long counts. */
const formatCount = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

/**
 * Reads a repeatable param, dropping anything the enum doesn't recognise.
 *
 * Deliberately more forgiving than the API, which rejects an unknown member
 * outright. The two are solving different problems: the server is answering a
 * question and must not answer a different one silently, whereas this is
 * reading a URL someone may have hand-edited or bookmarked before a filter was
 * retired — and a page that refuses to render is a worse answer than one that
 * ignores a filter it can't display as ticked. Dropping here also means the
 * value never reaches the API, so the strict check there is never tripped by
 * our own navigation.
 */
const readEnumParams = <T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T[] =>
  params.getAll(key).filter((value): value is T => (allowed as readonly string[]).includes(value));

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

  const sortParam = searchParams.get("sortBy");
  const sort = ProblemSortEnum.safeParse(sortParam);

  return {
    page,
    search: searchParams.get("search") ?? "",
    difficulty: readEnumParams(searchParams, "difficulty", DifficultyEnum.options),
    tags: searchParams.getAll("tags"),
    status: readEnumParams(searchParams, "status", ProblemStatusFilterEnum.options),
    sortBy: sort.success ? sort.data : ("newest" as ProblemSort),

    update,
  };
}

const ProblemRowSkeleton = () => (
  <div className="border-b border-border px-4 py-4 last:border-b-0">
    <div className="flex items-center gap-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="ml-auto h-6 w-16 rounded-full" />
    </div>
    <Skeleton className="mt-2 h-3 w-40" />
  </div>
);

const Problems = () => {
  const filters = useProblemFilters();
  const { search: activeSearch, update } = filters;

  // Local mirror so typing stays responsive; the URL updates once it settles.
  const [searchInput, setSearchInput] = useState(activeSearch);
  const [debouncedSearch] = useDebounce(searchInput, 400);
  // Mobile only — the sidebar is always visible from `lg` up.
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (debouncedSearch !== activeSearch) {
      update({ search: debouncedSearch || undefined });
    }
  }, [debouncedSearch, activeSearch, update]);

  const { data, isLoading, isError } = useProblemsQuery({
    page: filters.page,
    limit: ITEMS_PER_PAGE,
    search: filters.search || undefined,
    difficulty: filters.difficulty.length > 0 ? filters.difficulty : undefined,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    status: filters.status.length > 0 ? filters.status : undefined,
    sortBy: filters.sortBy,
  });

  const { data: allTags = [] } = useProblemTagsQuery();
  const { data: progress } = useProblemProgressQuery();

  const problems = data?.problems ?? [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.totalItems / ITEMS_PER_PAGE) : 0;

  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.difficulty.length > 0 ||
    filters.status.length > 0 ||
    filters.tags.length > 0;

  /** Adds or removes one value from a repeatable filter. */
  const toggle = <T extends string>(key: string, current: T[], value: T) => {
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    filters.update({ [key]: next });
  };

  const clearFilters = () => {
    setSearchInput("");
    filters.update({
      search: undefined,
      difficulty: [],
      status: [],
      tags: [],
    });
  };

  const solvedPercent =
    progress && progress.total > 0
      ? Math.round((progress.solved / progress.total) * 100)
      : 0;

  const filterPanel = (
    <ProblemFilterPanel
      tags={allTags}
      selectedTags={filters.tags}
      selectedDifficulties={filters.difficulty}
      selectedStatuses={filters.status}
      onToggleTag={(tag) => toggle("tags", filters.tags, tag)}
      onToggleDifficulty={(difficulty) =>
        toggle<Difficulty>("difficulty", filters.difficulty, difficulty)
      }
      onToggleStatus={(status) =>
        toggle<ProblemStatusFilter>("status", filters.status, status)
      }
      onClearAll={clearFilters}
      hasActiveFilters={hasActiveFilters}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar — inline from `lg`, behind a toggle below it. Rendered
              twice rather than repositioned, so the mobile disclosure can't
              leave a sticky sidebar stranded mid-page. */}
          <div className="hidden lg:block">{filterPanel}</div>

          <main className="min-w-0 flex-1 space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Problems</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Practise at your own pace — no contest, no clock.
              </p>
            </div>

            {/* Catalogue-wide progress. Deliberately not derived from the
                filtered list: it answers "how far through the catalogue am I",
                so ticking a filter must not move it. */}
            {progress && progress.total > 0 && (
              <div>
                <p className="mb-1.5 text-sm text-muted-foreground">
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {String(progress.solved).padStart(2, "0")}
                  </span>{" "}
                  of {progress.total} problems solved
                  <span className="text-muted-foreground/70"> ({solvedPercent}%)</span>
                </p>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={progress.solved}
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  aria-label="Problems solved"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{ width: `${solvedPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Search + sort */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                className="gap-2 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {filters.tags.length +
                      filters.difficulty.length +
                      filters.status.length}
                  </span>
                )}
              </Button>

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
                value={filters.sortBy}
                onValueChange={(value) => filters.update({ sortBy: value })}
              >
                <SelectTrigger className="w-full border-border bg-secondary/50 sm:w-[190px]">
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

            {filtersOpen && (
              <div className="rounded-lg border border-border bg-card px-4 lg:hidden">
                {filterPanel}
              </div>
            )}

            {/* Active filter chips — the fastest way to undo one specific
                choice without scanning the sidebar for what's ticked. */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {filters.tags.map((tag) => (
                  <button
                    key={`tag-${tag}`}
                    type="button"
                    onClick={() => toggle("tags", filters.tags, tag)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/20"
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                {filters.difficulty.map((difficulty) => (
                  <button
                    key={`difficulty-${difficulty}`}
                    type="button"
                    onClick={() =>
                      toggle<Difficulty>("difficulty", filters.difficulty, difficulty)
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs capitalize text-foreground transition-colors hover:bg-secondary"
                  >
                    {difficulty}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                {filters.status.map((status) => (
                  <button
                    key={`status-${status}`}
                    type="button"
                    onClick={() =>
                      toggle<ProblemStatusFilter>("status", filters.status, status)
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs capitalize text-foreground transition-colors hover:bg-secondary"
                  >
                    {status}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 text-xs text-muted-foreground"
                >
                  Clear all
                </Button>
              </div>
            )}

            {meta && !isLoading && (
              <p className="text-sm text-muted-foreground">
                Showing {problems.length} of {meta.totalItems} problems
              </p>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="mt-4"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg border border-border">
                  {problems.map((problem) => (
                    <Link
                      key={problem.id}
                      to={paths.problem(problem.slug)}
                      className="group flex items-start gap-4 border-b border-border px-4 py-3.5 transition-colors last:border-b-0 hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                          {problem.title}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span
                            className={cn(
                              "font-medium capitalize",
                              difficultyStyles[problem.difficulty],
                            )}
                          >
                            {problem.difficulty}
                          </span>
                          <span aria-hidden>•</span>
                          <span>{formatCount(problem.solvedBy)} solved</span>
                          <span aria-hidden>•</span>
                          <span>
                            {formatAcceptance(
                              problem.acceptanceRate,
                              problem.totalSubmissions,
                            )}
                          </span>

                          {problem.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="hidden text-[10px] font-normal sm:inline-flex"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Status doubles as the call to action — an unsolved row
                          reads "Solve", which is what the user came to do.

                          Three states, three colours, so standing is readable
                          down the column without reading a word: green earned,
                          amber in progress, brand red still to do. Unsolved is
                          tinted rather than solid — most of the catalogue is
                          unsolved, and a solid red block on every row would
                          drown the solved ones it exists to contrast with. */}
                      <span
                        className={cn(
                          "shrink-0 rounded border px-3 py-1 text-xs font-semibold",
                          problem.status === "solved"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : problem.status === "attempted"
                              ? "border-amber-500/30 bg-amber-500/15 text-amber-500"
                              : "border-primary/30 bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                        )}
                      >
                        {problem.status === "solved"
                          ? "Solved"
                          : problem.status === "attempted"
                            ? "Retry"
                            : "Solve"}
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
      </div>
    </div>
  );
};

export default Problems;
