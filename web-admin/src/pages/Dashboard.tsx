import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Trophy,
  FileText,
  Code,
  Users,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ContestCard } from "@/components/contests/ContestCard";
import { StatCard } from "@/components/contests/StatCard";
import { StatCardSkeleton } from "@/components/contests/StatCardSkeleton";
import { ContestCardSkeleton } from "@/components/contests/ContestCardSkeleton";
import { ContestFilters } from "@/components/contests/ContestFilters";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { pageVariants } from "@/lib/animations";
import { useContestsQuery } from "@/queries/contest.queries";
import { useStatsQuery } from "@/queries/stats.queries";
import {
  type Contest,
} from "@/schema/contest.schema";

import {
  type SortOption,
  type FilterStatus,
} from "@/components/contests/ContestFilters";

const ITEMS_PER_PAGE = 6;

// Helper function to map API contest to Contest interface
// const mapApiContestToContest = (apiContest: any): Contest => {
//   return {
//     id: apiContest.id,
//     title: apiContest.title,
//     description: apiContest.description,
//     startTime: apiContest.startTime || null,
//     endTime: apiContest.endTime || null,
//     maxDurationMs: apiContest.maxDurationMs || null,
//     type: apiContest.type || "competitive",
//     status: apiContest.status || "draft",
//     createdAt: apiContest.createdAt,
//     updatedAt: apiContest.updatedAt,
//     creatorId: apiContest.creatorId,
//     // mcqs and dsaProblems not available in list endpoint
//   };
// };

const Dashboard = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Debounce search query
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 700);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch contests for current page with filters
  const { data: contestResponse, isLoading: isLoadingContests } = useContestsQuery(
    currentPage,
    ITEMS_PER_PAGE,
    debouncedSearch || undefined,
    filterStatus !== "all" ? filterStatus : undefined,
    sortOption
  );
  const allContests = contestResponse?.contests;
  const contestsMeta = contestResponse?.meta;
  const totalItems = contestsMeta?.totalItems ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);


  // Fetch stats from API
  const { data: stats, isLoading: isLoadingStats } = useStatsQuery();

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortOption) => {
    setSortOption(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: FilterStatus) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
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
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Overview
            </h1>
            <p className="text-muted-foreground">
              Manage contests and questions.
            </p>
          </div>
          <Button asChild>
            <Link to="/contests/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Contest
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {isLoadingStats ? (
            <>
              {Array.from({ length: 4 }).map((_, index) => (
                <StatCardSkeleton key={index} index={index} />
              ))}
            </>
          ) : stats && (
            <>
              <StatCard
                title="Total Contests"
                value={stats.totalContests}
                subtitle="All contests created"
                icon={Trophy}
                index={0}
              />
              <StatCard
                title="MCQ Questions"
                value={stats.totalMcqs}
                subtitle="In question bank"
                icon={FileText}
                index={1}
              />
              <StatCard
                title="DSA Problems"
                value={stats.totalDsaProblems}
                subtitle="Coding challenges"
                icon={Code}
                index={2}
              />
              <StatCard
                title="Participants"
                value={stats.totalParticipants}
                subtitle="Registered users"
                icon={Users}
                index={3}
              />
            </>
          )}
        </div>

        {/* Active & Upcoming */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="arena-section-title">Contests</h2>
            <ContestFilters
              isFiltersExpanded={isFiltersExpanded}
              setIsFiltersExpanded={setIsFiltersExpanded}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              sortOption={sortOption}
              onSortChange={handleSortChange}
              filterStatus={filterStatus}
              onFilterChange={handleFilterChange}
              showButtonOnly={true}
            />
          </div>
          {/* Filter controls appear below when expanded */}
          {isFiltersExpanded && (
            <ContestFilters
              isFiltersExpanded={isFiltersExpanded}
              setIsFiltersExpanded={setIsFiltersExpanded}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              sortOption={sortOption}
              onSortChange={handleSortChange}
              filterStatus={filterStatus}
              onFilterChange={handleFilterChange}
              showButtonOnly={false}
            />
          )}
        </div>

        {isLoadingContests ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
              <ContestCardSkeleton key={index} index={index} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allContests?.map((contest: Contest, index: number) => (
              <ContestCard key={contest?.id} contest={contest} index={index} />
            ))}
          </div>
        )}

        {/* No results message */}
        {allContests?.length === 0 && !isLoadingContests && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No contests found</p>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageClick}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
        />
      </motion.div>
    </AdminLayout>
  );
};

export default Dashboard;
