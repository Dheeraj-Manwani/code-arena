import { Search, ArrowUpDown, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "motion/react";

export type SortOption =
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc"
  | "status-asc"
  | "status-desc";

export type FilterStatus = "all" | "draft" | "scheduled" | "running" | "ended" | "cancelled";

interface ContestFiltersProps {
  isFiltersExpanded: boolean;
  setIsFiltersExpanded: (value: boolean) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
  filterStatus: FilterStatus;
  onFilterChange: (value: FilterStatus) => void;
  showButtonOnly?: boolean;
}

export const ContestFilters = ({
  isFiltersExpanded,
  setIsFiltersExpanded,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  filterStatus,
  onFilterChange,
  showButtonOnly = false,
}: ContestFiltersProps) => {
  // If showButtonOnly is true, only render the button
  if (showButtonOnly) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
        className="gap-2 w-fit"
      >
        <Filter className="w-4 h-4" />
        {isFiltersExpanded ? "Hide Filters" : "Show Filters"}
        {isFiltersExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>
    );
  }

  // Otherwise, render the filter controls (used when expanded)
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search contests by title or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <Select
            value={sortOption}
            onValueChange={(value) => onSortChange(value as SortOption)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="title-asc">Title A-Z</SelectItem>
              <SelectItem value="title-desc">Title Z-A</SelectItem>
              <SelectItem value="status-asc">Status: A-Z</SelectItem>
              <SelectItem value="status-desc">Status: Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter */}
        <Select
          value={filterStatus}
          onValueChange={(value) => onFilterChange(value as FilterStatus)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
};
