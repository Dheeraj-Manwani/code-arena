import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ContestCard from "@/components/dashboard/ContestCard";
import ContestCardSkeleton from "@/components/dashboard/ContestCardSkeleton";
import EmptyState from "@/components/common/EmptyState";
import Pagination from "@/components/common/Pagination";
import { useContestsQuery } from "@/queries/contest.queries";
import type { ContestStatus, ContestType } from "@/schema/contest.schema";
import { Search, SlidersHorizontal } from "lucide-react";
import { mapApiContestToContest } from "@/mappers/contest.mapper";

const Contests = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContestType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Debounce search query
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 700);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all contests (mixed)
  const { data: contestsData, isLoading } = useContestsQuery(
    currentPage,
    ITEMS_PER_PAGE,
    debouncedSearch || undefined,
    statusFilter === "all" ? undefined : statusFilter as ContestStatus,
    typeFilter === "all" ? undefined : typeFilter,
    sortBy === "newest"
      ? "newest"
      : sortBy === "oldest"
        ? "oldest"
        : undefined,
  );

  const allContests =
    contestsData?.contests.map(mapApiContestToContest) || [];
  const meta = contestsData?.meta;

  // Calculate pagination
  const totalPages = meta ? Math.ceil(meta.totalItems / ITEMS_PER_PAGE) : 0;
  const hasNext = meta?.hasNext || false;
  const hasPrev = meta?.hasPrev || false;

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            All Contests
          </h1>
          <p className="text-muted-foreground">
            Browse and filter through all available contests
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/50 border-border"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value as ContestType | "all");
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50 border-border">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="competitive">Competitive</SelectItem>
              <SelectItem value="practice">Practice</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50 border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50 border-border">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="ending-soon">Ending Soon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        {meta && (
          <div className="text-sm text-muted-foreground">
            Showing {allContests.length} of {meta.totalItems} contests
          </div>
        )}

        {/* Contests Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ContestCardSkeleton key={i} />
            ))}
          </div>
        ) : allContests.length === 0 ? (
          <EmptyState type="active" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allContests.map((contest) => (
                <ContestCard key={contest.id} contest={contest} />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              hasNext={hasNext}
              hasPrev={hasPrev}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Contests;
