import { useNavigate } from "react-router-dom";
import { Clock, FileQuestion, Play, ArrowRight } from "lucide-react";
import { BorderTrail } from "../common/BorderTrail";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import CountdownTimer from "@/components/common/CountdownTimer";
import type { ContestWithDates } from "@/schema/contest.schema";

const formatDuration = (ms: number) => {
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

interface FeaturedContestProps {
  contest: ContestWithDates;
}

export const FeaturedContest = ({ contest }: FeaturedContestProps) => {
  const navigate = useNavigate();
  const questionCount = (contest.mcqCount ?? 0) + (contest.dsaCount ?? 0);

  return (
    <div className="relative overflow-hidden rounded-xl border-2 bg-linear-to-br from-primary/10 via-primary/5 to-background p-8">
      <BorderTrail
        className="bg-primary/50 rounded-full blur-[2px]"
        size={200}
        transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
      />
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
            <div className="w-2 h-2 bg-primary-foreground rounded-full mr-2 animate-pulse" />
            LIVE NOW
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-4">
          <span className="inline-flex items-center gap-1.5">
            <FileQuestion className="w-3.5 h-3.5" />
            {questionCount} Questions
          </span>
          {contest.maxDurationMs != null && (
            <>
              <span className="opacity-50">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(contest.maxDurationMs)}
              </span>
            </>
          )}
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">
          {contest.title}
        </h2>
        {contest.description && (
          <p className="text-muted-foreground mb-6 max-w-2xl">
            {contest.description}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ends in</span>
            {contest.endTime && (
              <CountdownTimer
                targetDate={contest.endTime}
                variant="large"
                showLabel={false}
              />
            )}
          </div>
        </div>
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90"
          onClick={() => navigate(`/contest/${contest.id}/details`)}
        >
          <Play className="w-5 h-5 mr-2" />
          Enter Contest
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};
