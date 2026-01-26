import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AppBreadcrumb from '@/components/common/AppBreadcrumb';
import StatusBadge from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfileQuery } from '@/queries/profile.queries';
import { useLogoutMutation } from '@/queries/auth.mutations';
import {
  Trophy, Target, Medal, Calendar, Clock,
  TrendingUp, Code, BarChart3, LogOut
} from 'lucide-react';

const Profile = () => {
  const { data, isLoading, isError } = useProfileQuery();
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();

  const user = data?.user ?? null;
  const recentAttempts = data?.recentAttempts ?? [];

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardContent className="pt-6 text-center">
                <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
                <Skeleton className="h-6 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-48 mx-auto" />
              </CardContent>
            </Card>
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Failed to load profile</h2>
          <p className="text-muted-foreground mb-4">Please try again later.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const completionRate =
    user.stats.totalContestsParticipated > 0
      ? (user.stats.totalContestsCompleted / user.stats.totalContestsParticipated) * 100
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <AppBreadcrumb items={[{ label: "Profile" }]} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary/30">
                  <AvatarImage src={user.imageUrl ?? undefined} />
                  <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                <p className="text-sm text-muted-foreground mb-3">{user.email}</p>
                <Badge
                  variant="outline"
                  className={user.role === 'creator'
                    ? 'border-primary/50 text-primary'
                    : 'border-blue-500/50 text-blue-400'
                  }
                >
                  {user.role === 'creator' ? (
                    <Code className="w-3 h-3 mr-1" />
                  ) : (
                    <Target className="w-3 h-3 mr-1" />
                  )}
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Member since
                  </span>
                  <span className="font-medium">{formatDate(new Date(user.createdAt))}</span>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => logout()}
                    disabled={isLoggingOut}
                  >
                    <LogOut className="w-4 h-4" />
                    {isLoggingOut ? 'Logging out...' : 'Log Out'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{user.stats.totalContestsParticipated}</p>
                      <p className="text-xs text-muted-foreground">Contests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{user.stats.totalContestsCompleted}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{user.stats.averageScore.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Medal className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {user.stats.bestRank > 0 ? `#${user.stats.bestRank}` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Best Rank</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contest Type Breakdown */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">By Contest Type</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-primary" />
                          <span>Competitive</span>
                        </div>
                        <span className="font-semibold">{user.stats.competitiveContests}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span>Practice</span>
                        </div>
                        <span className="font-semibold">{user.stats.practiceContests}</span>
                      </div>
                    </div>
                  </div>

                  {/* Completion Rate */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Completion Rate</h4>
                    <div className="relative pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                          {completionRate.toFixed(0)}% completed
                        </span>
                      </div>
                      <div className="overflow-hidden h-2 rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <Link to="/my-contests">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentAttempts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {recentAttempts.map(attempt => {
                      const scorePercentage = (attempt.totalPoints / attempt.maxPoints) * 100;
                      return (
                        <div
                          key={attempt.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Trophy className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{attempt.contestTitle}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(new Date(attempt.startedAt))}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={attempt.status} type="attempt" />
                            <span className={`font-semibold ${getScoreColor(scorePercentage)}`}>
                              {attempt.totalPoints}/{attempt.maxPoints}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
