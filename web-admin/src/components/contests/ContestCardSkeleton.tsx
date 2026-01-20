import { motion } from "motion/react";
import { fadeIn, STAGGER_DELAY } from "@/lib/animations";
import { Skeleton } from "@/components/ui/skeleton";

interface ContestCardSkeletonProps {
  index?: number;
}

export const ContestCardSkeleton = ({ index = 0 }: ContestCardSkeletonProps) => {
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      transition={{ delay: index * STAGGER_DELAY }}
    >
      <div className="arena-card">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-6 w-20 rounded" />
          <Skeleton className="h-4 w-12" />
        </div>

        <div className="min-h-[60px] mb-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>

        <div className="border-t border-border pt-4 flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </motion.div>
  );
};
