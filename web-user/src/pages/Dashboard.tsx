import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ContestCard from "@/components/dashboard/ContestCard";
import ContestCardSkeleton from "@/components/dashboard/ContestCardSkeleton";
import EmptyState from "@/components/common/EmptyState";
import CountdownTimer from "@/components/common/CountdownTimer";
import { BorderTrail } from "@/components/common/BorderTrail";
import EnterContestDialog from "@/components/common/EnterContestDialog";
import { useDashboardFeedQuery } from "@/queries/dashboard.queries";
import {
  Trophy,
  BookOpen,
  ArrowRight,
  Play,
  FileQuestion,
  Clock,
  Users,
} from "lucide-react";
import { mapApiContestToContest } from "@/mappers/contest.mapper";

const formatDuration = (ms: number) => {
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: feed, isLoading: isFeedLoading } = useDashboardFeedQuery();

  const heroContest = feed?.featuredCompetitive
    ? mapApiContestToContest(feed.featuredCompetitive)
    : null;
  const competitiveForGrid = (feed?.latestCompetitive ?? []).map(
    mapApiContestToContest,
  );
  const latestPracticeContests = (feed?.latestPractice ?? []).map(
    mapApiContestToContest,
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* HERO SECTION - only running contests are featured */}
        {heroContest && (
          <div
            className="relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8"
          >
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
              {/* Meta: Questions, Duration, optional Participants */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-4">
                <span className="inline-flex items-center gap-1.5">
                  <FileQuestion className="w-3.5 h-3.5" />
                  {heroContest.mcqCount + heroContest.dsaCount} Questions
                </span>
                {heroContest.maxDurationMs != null && (
                  <>
                    <span className="opacity-50">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(heroContest.maxDurationMs)}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {heroContest.title}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl">
                {heroContest.description}
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ends in</span>
                  {heroContest.endTime && (
                    <CountdownTimer
                      targetDate={heroContest.endTime}
                      variant="large"
                      showLabel={false}
                    />
                  )}
                </div>
              </div>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90"
                onClick={() => navigate(`/contest/${heroContest.id}/details`)}
              >
                <Play className="w-5 h-5 mr-2" />
                Enter Contest
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* LIVE & UPCOMING COMPETITIVE CONTESTS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Live & Upcoming
              </h2>
            </div>
            <Link to="/contests">
              <Button variant="ghost" size="sm" className="gap-2">
                View All Contests
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {isFeedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <ContestCardSkeleton key={i} />
              ))}
            </div>
          ) : competitiveForGrid.length === 0 ? (
            <EmptyState type="active" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {competitiveForGrid.map((contest) => (
                <ContestCard key={contest.id} contest={contest} ctaSize="sm" />
              ))}
            </div>
          )}
        </div>

        {/* LATEST PRACTICE CONTESTS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Practice Contests
              </h2>
            </div>
            <Link to="/contests">
              <Button variant="ghost" size="sm" className="gap-2">
                View All Contests
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {isFeedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <ContestCardSkeleton key={i} />
              ))}
            </div>
          ) : latestPracticeContests.length === 0 ? (
            <EmptyState type="active" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestPracticeContests.map((contest) => (
                <ContestCard key={contest.id} contest={contest} ctaSize="sm" />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
