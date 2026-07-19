import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
}

/** Page numbers to show, windowed to at most 5 around the current page. */
function pageWindow(currentPage: number, totalPages: number): number[] {
  const size = Math.min(5, totalPages);

  let start: number;
  if (totalPages <= 5 || currentPage <= 3) {
    start = 1;
  } else if (currentPage >= totalPages - 2) {
    start = totalPages - 4;
  } else {
    start = currentPage - 2;
  }

  return Array.from({ length: size }, (_, i) => start + i);
}

const Pagination = ({
  currentPage,
  totalPages,
  hasNext,
  hasPrev,
  onPageChange,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-2 pt-6"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={!hasPrev || currentPage === 1}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Previous
      </Button>

      <div className="flex items-center gap-1">
        {pageWindow(currentPage, totalPages).map((pageNum) => (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? "default" : "outline"}
            size="sm"
            aria-current={currentPage === pageNum ? "page" : undefined}
            onClick={() => onPageChange(pageNum)}
            className="min-w-[40px]"
          >
            {pageNum}
          </Button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={!hasNext || currentPage === totalPages}
      >
        Next
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </nav>
  );
};

export default Pagination;
