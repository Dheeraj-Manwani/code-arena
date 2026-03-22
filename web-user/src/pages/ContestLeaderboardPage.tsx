import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight } from "lucide-react";
import { useContestAttemptQuery } from "@/queries/contest.queries";
import ContestLeaderboardPanel from "@/components/contest/ContestLeaderboardPanel";
import { Loader } from "@/components/Loader";

const ContestLeaderboardPage = () => {
  const { contestId: conId, attemptId: attId } = useParams();
  const contestId = conId ? Number(conId) : undefined;
  const attemptId = attId ? Number(attId) : undefined;
  const navigate = useNavigate();

  const { data: contestAttemptData, isLoading, isError } = useContestAttemptQuery(
    contestId,
    attemptId
  );

  if (!contestId || !attemptId) {
    navigate("/contests", { replace: true });
    return null;
  }

  if (isLoading || !contestAttemptData?.contest) {
    return <Loader message="Loading leaderboard" />;
  }

  if (isError) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load leaderboard.</p>
          <Button onClick={() => navigate("/contests")}>Back to Contests</Button>
        </div>
      </div>
    );
  }

  const contest = contestAttemptData.contest;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <header className="bg-card border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h1 className="font-mono text-lg font-semibold">
              {contest.title} - Leaderboard
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/results/${attemptId}`)}
            className="gap-2"
          >
            View Results
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden p-6">
        <div className="h-full max-w-4xl mx-auto">
          <ContestLeaderboardPanel />
        </div>
      </main>
    </div>
  );
};

export default ContestLeaderboardPage;
