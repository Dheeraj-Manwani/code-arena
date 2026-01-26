import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContestAttempt } from '@/schema/submission.schema';
import {
  Trophy, Clock, Calendar, Play, Eye,
  LayoutList
} from 'lucide-react';

const MyContests = () => {
  const navigate = useNavigate();
  const [isLoading] = useState(false);
  const [attempts] = useState<ContestAttempt[]>([]);
  // TODO: replace with useAttemptsQuery or profile.recentAttempts when API is available

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-400';
    if (percentage >= 50) return 'text-amber-400';
    return 'text-destructive';
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <LayoutList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Contests</h1>
              <p className="text-sm text-muted-foreground">Track your contest attempts and progress</p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        {!isLoading && attempts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{attempts.length}</p>
                  <p className="text-sm text-muted-foreground">Total Attempts</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-400">
                    {attempts.filter(a => a.status === 'submitted').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-400">
                    {attempts.filter(a => a.status === 'in_progress').length}
                  </p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {attempts.reduce((best, a) => a.rank && a.rank < best ? a.rank : best, 999) === 999
                      ? '-'
                      : `#${attempts.reduce((best, a) => a.rank && a.rank < best ? a.rank : best, 999)}`
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Best Rank</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attempts List */}
        {isLoading ? (
          renderSkeleton()
        ) : attempts.length === 0 ? (
          <EmptyState type="attempts" />
        ) : (
          <div className="space-y-4">
            {attempts.map(attempt => {
              const scorePercentage = (attempt.totalPoints / attempt.maxPoints) * 100;

              return (
                <Card key={attempt.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-foreground">
                            {attempt.contestTitle}
                          </h3>
                          <StatusBadge status={attempt.status} type="attempt" />
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {attempt.contestType === 'competitive' ? (
                              <Trophy className="w-3 h-3 mr-1" />
                            ) : null}
                            {attempt.contestType}
                          </Badge>

                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(attempt.durationMs)}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{attempt.startedAt ? formatDate(new Date(attempt.startedAt)) : "—"}</span>
                          </div>

                          {attempt.rank && (
                            <div className="flex items-center gap-1 text-primary">
                              <Trophy className="w-4 h-4" />
                              <span>Rank #{attempt.rank}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Score */}
                        <div className="text-right">
                          <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-bold ${getScoreColor(scorePercentage)}`}>
                              {attempt.totalPoints}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              / {attempt.maxPoints}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {scorePercentage.toFixed(0)}% Score
                          </p>
                        </div>

                        {/* Action Button */}
                        {attempt.status === 'in_progress' ? (
                          <Button
                            onClick={() => navigate(`/contest/${attempt.contestId}`)}
                            className="gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Resume
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/results/${attempt.id}`)}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Results
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyContests;
