import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ContestCard from "@/components/dashboard/ContestCard";
import ContestCardSkeleton from "@/components/dashboard/ContestCardSkeleton";
import EmptyState from "@/components/common/EmptyState";
import { FeaturedContest } from "@/components/dashboard/FeaturedContest";
import { useDashboardFeedQuery } from "@/queries/dashboard.queries";
import { Trophy, BookOpen, ArrowRight } from "lucide-react";
import { mapApiContestToContest } from "@/mappers/contest.mapper";

const Dashboard = () => {

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
        {heroContest && <FeaturedContest contest={heroContest} />}

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
