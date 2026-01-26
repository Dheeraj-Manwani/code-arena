import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ContestWithDates } from "@/schema/contest.schema";
import StatusBadge from "@/components/common/StatusBadge";
import CountdownTimer from "@/components/common/CountdownTimer";
import {
  FileQuestion,
  Trophy,
  Clock,
  Code,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContestCardProps {
  contest: ContestWithDates;
  className?: string;
  /** When true, practice CTA shows "Continue" instead of "Start Attempt". Pass when user has an in-progress attempt. */
  hasAttempt?: boolean;
  /** Use "sm" for grid CTAs so hero CTA stays visually primary. */
  ctaSize?: "default" | "sm";
}

const ContestCard = ({ contest, className, hasAttempt = false, ctaSize = "default" }: ContestCardProps) => {
  const navigate = useNavigate();

  const totalQuestions = contest.mcqCount + contest.dsaCount;
  const isLive = contest.phase === "running" && contest.type === "competitive";
  const isUpcoming = contest.phase === "upcoming";
  const isEnded = contest.phase === "ended";
  const isCancelled = contest.status === "cancelled";
  const isPractice = contest.type === "practice";

  const badgeStatus =
    contest.status === "cancelled"
      ? "cancelled"
      : contest.status === "draft"
        ? "draft"
        : contest.phase === "running"
          ? "running"
          : contest.phase === "upcoming"
            ? "scheduled"
            : contest.phase === "ended"
              ? "ended"
              : null;

  const formatDuration = (ms: number) => {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleCardClick = () => {
    navigate(`/contest/${contest.id}/details`);
  };

  const handleViewDetails = () => {
    navigate(`/contest/${contest.id}/details`);
  };

  const handleViewResults = () => {
    navigate(`/leaderboard/${contest.id}`);
  };

  // ---- A. Header: Status (left) | Type (right) ----
  const header = (
    <div className="flex items-center justify-between gap-2">
      {contest.type === "competitive" && badgeStatus && (
        <StatusBadge status={badgeStatus} type="contest" />
      )}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border",
          isPractice
            ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
            : "border-amber-500/30 bg-amber-500/10 text-amber-400"
        )}
      >
        {isPractice ? <Code className="w-3 h-3" /> : <Trophy className="w-3 h-3" />}
        {isPractice ? "Practice" : "Competitive"}
      </span>
    </div>
  );

  // ---- B. Title (1 line) + Description (2 lines) ----
  const titleDesc = (
    <div className="space-y-1.5">
      <h3 className="font-semibold text-foreground line-clamp-1" title={contest.title}>
        {contest.title}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2" title={contest.description}>
        {contest.description}
      </p>
    </div>
  );

  // ---- C. Metadata: Questions | Duration | DSA/MCQ pills ----
  const tags: string[] = [];
  if (contest.dsaCount > 0) tags.push(`${contest.dsaCount} DSA`);
  if (contest.mcqCount > 0) tags.push(`${contest.mcqCount} MCQ`);

  const metadata = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <FileQuestion className="w-3.5 h-3.5 shrink-0" />
        {totalQuestions} {totalQuestions === 1 ? "Question" : "Questions"}
      </span>
      {contest.maxDurationMs != null && (
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {formatDuration(contest.maxDurationMs)}
        </span>
      )}
      {tags.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-muted/80 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </span>
      )}
    </div>
  );

  const btnSize = ctaSize === "sm" ? "sm" : undefined;

  // ---- D. Footer: timer/text + CTA ----
  const getFooter = () => {
    // Practice: only CTA
    if (isPractice) {
      return (
        <div className="flex w-full flex-col gap-3">
          <Button
            variant="outline"
            size={btnSize}
            className="w-full border-border bg-card hover:bg-muted/50"
            onClick={handleViewDetails}
          >
            {hasAttempt ? "Continue" : "Start Attempt"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    }

    // Competitive — Live
    if (isLive) {
      return (
        <div className="flex w-full flex-col gap-3">
          {contest.endTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ends in</span>
              <CountdownTimer targetDate={contest.endTime} variant="compact" showLabel={false} />
            </div>
          )}
          <Button size={btnSize} className="w-full" onClick={handleViewDetails}>
            Enter Contest
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    }

    // Competitive — Upcoming
    if (isUpcoming) {
      return (
        <div className="flex w-full flex-col gap-3">
          {contest.startTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Starts in</span>
              <CountdownTimer targetDate={contest.startTime} variant="compact" showLabel={false} />
            </div>
          )}
          <Button variant="outline" size={btnSize} className="w-full" onClick={handleViewDetails}>
            View Details
          </Button>
        </div>
      );
    }

    // Competitive — Ended
    if (isEnded) {
      return (
        <div className="flex w-full flex-col gap-3">
          {contest.endTime && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              Ended {formatDate(contest.endTime)}
            </div>
          )}
          <Button
            variant="outline"
            size={btnSize}
            className="w-full border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground"
            onClick={handleViewResults}
          >
            View Results
          </Button>
        </div>
      );
    }

    // Competitive — Cancelled or Draft
    return (
      <div className="flex w-full flex-col gap-3">
        {isCancelled && contest.endTime && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {formatDate(contest.endTime)}
          </div>
        )}
        <Button
          variant="outline"
          size={btnSize}
          className="w-full border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground"
          onClick={handleViewDetails}
        >
          View Details
        </Button>
      </div>
    );
  };

  return (
    <Card
      className={cn(
        "group relative flex min-h-[280px] cursor-pointer flex-col overflow-hidden transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg",
        isLive && "border-l-2 border-l-emerald-500/50",
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="space-y-3 pb-2">
        {header}
        {titleDesc}
      </CardHeader>

      <CardContent className="flex-1 space-y-4 pb-4">
        {metadata}
      </CardContent>

      <CardFooter className="border-t border-border pt-4">
        {getFooter()}
      </CardFooter>
    </Card>
  );
};

export default ContestCard;
