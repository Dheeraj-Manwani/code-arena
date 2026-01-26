import {
  type Contest,
  type ContestStatus,
} from "@/schema/contest.schema";
import { Calendar, Clock, Code, FileText, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { cn, getContestDuration } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "motion/react";
import {
  fadeIn,
  cardHoverScale,
  cardHoverY,
  STAGGER_DELAY,
} from "@/lib/animations";

interface ContestCardProps {
  contest: Contest;
  index?: number;
}

export const ContestCard = ({ contest, index = 0 }: ContestCardProps) => {
  const isPractice = contest.type === "practice";
  const displayStatus = contest.status ?? null;
  const duration = getContestDuration(contest);

  const getStatusBadgeClass = (status: ContestStatus | null) => {
    if (status === null) {
      return "bg-muted text-muted-foreground border-border";
    }
    switch (status) {
      case "draft":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "published":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "cancelled":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getBadgeText = () => {
    return displayStatus ? displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1) : "—";
  };

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      transition={{ delay: index * STAGGER_DELAY }}
    >
      <Link to={`/contests/${contest.id}`} className="block">
        <motion.div
          className="arena-card group cursor-pointer"
          whileHover={{ scale: cardHoverScale, y: cardHoverY }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium capitalize border",
                  getStatusBadgeClass(displayStatus)
                )}
              >
                {getBadgeText()}
              </span>
              {/* {isPractice && (
                <BookOpen className="w-4 h-4 text-blue-400" />
              )} */}
            </div>
            {!isPractice && contest.startTime && (
              <span className="text-sm text-muted-foreground font-mono">
                {format(new Date(contest.startTime), "HH:mm")}
              </span>
            )}
          </div>

          <div className="min-h-[60px] mb-4">
            {contest.title && (
              <h3 className="font-mono font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">
                {contest.title}
              </h3>
            )}
            {contest.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {contest.description}
              </p>
            )}
          </div>

          {/* Question counts */}
          {(contest.mcqCount || contest.dsaCount) && (
            <div className="flex items-center gap-4 mb-4 text-sm">
              {contest.mcqCount && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>{contest.mcqCount} MCQs</span>
                </div>
              )}
              {contest.dsaCount && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Code className="w-4 h-4" />
                  <span>{contest.dsaCount} DSA</span>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-border pt-4 flex items-center gap-4 text-sm text-muted-foreground">
            {!isPractice && contest.startTime && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(new Date(contest.startTime), "MMM d, yyyy")}
              </span>
            )}
            {!isPractice && duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {duration}
              </span>
            )}
            {isPractice && (
              <span className="flex items-center gap-1.5 text-blue-400">
                <BookOpen className="w-4 h-4" />
                Practice Contest
              </span>
            )}
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
};
