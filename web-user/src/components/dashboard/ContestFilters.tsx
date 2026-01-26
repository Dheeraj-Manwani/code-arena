import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal } from 'lucide-react';

interface ContestFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  typeFilter: string;
  onTypeChange: (type: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

const ContestFilters = ({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  sortBy,
  onSortChange,
}: ContestFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search contests..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-secondary/50 border-border"
        />
      </div>

      {/* Type Filter */}
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50 border-border">
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="competitive">Competitive</SelectItem>
          <SelectItem value="practice">Practice</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50 border-border">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="date-desc">Newest First</SelectItem>
          <SelectItem value="date-asc">Oldest First</SelectItem>
          <SelectItem value="questions">Most Questions</SelectItem>
          <SelectItem value="points">Highest Points</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ContestFilters;
