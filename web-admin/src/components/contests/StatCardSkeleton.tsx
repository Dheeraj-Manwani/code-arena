import { motion } from "motion/react";
import { fadeIn, STAGGER_DELAY } from "@/lib/animations";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardSkeletonProps {
  index?: number;
}

export const StatCardSkeleton = ({ index = 0 }: StatCardSkeletonProps) => {
  return (
    <motion.div
      className="arena-stat-card"
      variants={fadeIn}
      initial="initial"
      animate="animate"
      transition={{ delay: index * STAGGER_DELAY }}
    >
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <Skeleton className="h-9 w-20 mb-1" />
      <Skeleton className="h-4 w-32" />
    </motion.div>
  );
};
