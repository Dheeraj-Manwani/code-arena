import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Loader } from "@/components/Loader";
import ResultsPage from "@/components/contest/ResultsPage";
import { useAttemptResultsQuery } from "@/queries/attempt.queries";

const ContestResultsPage = () => {
  const { attemptId: attIdParam } = useParams();
  const navigate = useNavigate();
  const attemptId = attIdParam ? Number(attIdParam) : undefined;

  const { data: results, isLoading, isError } = useAttemptResultsQuery(attemptId);

  if (isLoading) {
    return <Loader message="Loading results" />;
  }

  if (isError || !results) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Results Unavailable
                </h1>
                <p className="text-muted-foreground mb-6">
                  We couldn&apos;t load the results for this attempt.
                </p>
                <Button onClick={() => navigate("/my-contests")} className="gap-2">
                  Back to My Contests
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <ResultsPage
      results={results}
      onBackToContests={() => navigate("/my-contests")}
      onViewLeaderboard={() => navigate(`/leaderboard/${results.contestId}`)}
    />
  );
};

export default ContestResultsPage;
