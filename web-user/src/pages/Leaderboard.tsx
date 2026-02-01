import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppBreadcrumb from '@/components/common/AppBreadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeaderboardQuery } from '@/queries/leaderboard.queries';
import { useContestQuery } from '@/queries/contest.queries';
import { useAuthStore } from '@/stores/auth.store';
import type { LeaderboardEntry, LeaderboardEntryApi } from '@/schema/leaderboard.schema';
import {
  Trophy, Medal, Clock, Search, ChevronLeft, ChevronRight,
  Crown, Award, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Leaderboard = () => {
  const { contestId } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;
  const currentUser = useAuthStore((s) => s.user);

  const contestIdNum = contestId ? parseInt(contestId) : undefined;
  const { data: leaderboardData, isLoading } = useLeaderboardQuery(contestIdNum);
  const { data: contestData } = useContestQuery(contestIdNum, false);

  const entries: LeaderboardEntry[] = useMemo(() => {
    if (!leaderboardData) return [];
    return leaderboardData.map((entry: LeaderboardEntryApi) => ({
      rank: entry.rank,
      userId: String(entry.userId),
      userName: entry.name || `User ${entry.userId}`,
      totalPoints: entry.totalPoints ?? 0,
      timeTakenMs: 0,
      questionsAttempted: 0,
      isCurrentUser: currentUser?.id === entry.userId,
    }));
  }, [leaderboardData, currentUser]);

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const filteredEntries = entries.filter(entry =>
    entry.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  const currentUserEntry = entries.find(e => e.isCurrentUser);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Award className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-linear-to-r from-yellow-500/20 to-transparent border-yellow-500/30';
      case 2:
        return 'bg-linear-to-r from-gray-400/20 to-transparent border-gray-400/30';
      case 3:
        return 'bg-linear-to-r from-amber-600/20 to-transparent border-amber-600/30';
      default:
        return '';
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-6 flex-1" />
          <Skeleton className="w-20 h-6" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <AppBreadcrumb
            items={[
              { label: "Contests", href: "/dashboard" },
              ...(contestData ? [{ label: contestData.title, href: `/contest/${contestId}/details` }] : []),
              { label: "Leaderboard" },
            ]}
          />
        </div>
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
              <p className="text-sm text-muted-foreground">
                {contestData ? contestData.title : 'All Contests'}
              </p>
            </div>
          </div>
        </div>

        {/* Current User Rank Card */}
        {currentUserEntry && !isLoading && entries.length > 0 && (
          <Card className="mb-6 border-primary/50 bg-linear-to-br from-primary/10 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Rank</p>
                    <p className="text-3xl font-bold text-primary">#{currentUserEntry.rank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold text-foreground">{currentUserEntry.totalPoints} pts</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="text-lg font-mono text-muted-foreground">
                    {formatDuration(currentUserEntry.timeTakenMs)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/50 border-border"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-full sm:w-[180px] bg-secondary/50 border-border">
              <SelectValue placeholder="Filter by contest" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">All Contests</SelectItem>
              {/* Contest filter can be added later if needed */}
            </SelectContent>
          </Select>
        </div>

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              renderSkeleton()
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No leaderboard data available yet
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-muted-foreground font-medium">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-5">Participant</div>
                  <div className="col-span-2 text-right">Score</div>
                  <div className="col-span-2 text-right">Time</div>
                  <div className="col-span-2 text-right">Questions</div>
                </div>

                {/* Entries */}
                {paginatedEntries.map((entry) => (
                  <div
                    key={entry.userId}
                    className={cn(
                      'grid grid-cols-12 gap-4 px-4 py-3 rounded-lg border transition-colors',
                      entry.isCurrentUser
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-secondary/30 border-border hover:border-primary/30',
                      getRankStyles(entry.rank)
                    )}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center gap-2">
                      {getRankIcon(entry.rank) || (
                        <span className="text-lg font-bold text-muted-foreground">
                          {entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Participant */}
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                        {entry.userName.charAt(0)}
                      </div>
                      <span className={cn(
                        'font-medium',
                        entry.isCurrentUser ? 'text-primary' : 'text-foreground'
                      )}>
                        {entry.userName}
                        {entry.isCurrentUser && (
                          <span className="ml-2 text-xs text-primary">(You)</span>
                        )}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="font-semibold text-foreground">
                        {entry.totalPoints}
                        <span className="text-sm text-muted-foreground ml-1">pts</span>
                      </span>
                    </div>

                    {/* Time */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="font-mono text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(entry.timeTakenMs)}
                      </span>
                    </div>

                    {/* Questions */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-sm text-muted-foreground">
                        {entry.questionsAttempted} solved
                      </span>
                    </div>
                  </div>
                ))}

                {filteredEntries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No participants found
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * entriesPerPage + 1} - {Math.min(currentPage * entriesPerPage, filteredEntries.length)} of {filteredEntries.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm px-3">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Leaderboard;
