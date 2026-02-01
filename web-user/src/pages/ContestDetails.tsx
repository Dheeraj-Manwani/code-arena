import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppBreadcrumb from '@/components/common/AppBreadcrumb';
import StatusBadge from '@/components/common/StatusBadge';
import CountdownTimer from '@/components/common/CountdownTimer';
import { useContestQuery } from '@/queries/contest.queries';
import {
  Clock, Calendar, Trophy, FileQuestion, Code,
  CheckCircle2, Play, ArrowRight, Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Difficulty } from '@/schema/problem.schema';
import { Loader } from '@/components/Loader';
import EnterContestDialog from '@/components/common/EnterContestDialog';
import type { ContestWithQuestions } from '@/schema/contest.schema';
import { useContestAttempt } from '@/queries/contest.mutations';

const ContestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const contestId = id ? parseInt(id) : undefined;

  if (!contestId) {
    return <Navigate to="/contests" replace />;
  }

  const { data: contestData, isLoading } = useContestQuery(contestId, true);
  const { mutate: createAttempt, isPending: isStarting } = useContestAttempt()

  if (isLoading) {
    return (
      <Loader message="Loading contest" />
    );
  }

  if (!contestData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Contest Not Found</h2>
          <p className="text-muted-foreground mb-4">The contest you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Map API contest data to UI format (API may include optional questions, mcqs, dsaProblems)
  const c = contestData as ContestWithQuestions
  const questions: Array<{ id: string; title: string; type: 'mcq' | 'dsa'; points: number; difficulty?: string | null }> = [];

  // Sort questions by order if available (API returns questions as { id, order, type, mcq?, dsa? })
  if (Array.isArray(c.questions) && c.questions.length > 0) {
    type Q = { id: string; title: string; type: 'mcq' | 'dsa'; points: number; difficulty?: string };
    const orderedQuestions = (c.questions as any[])
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((q: any): Q | null => {
        if (q.mcq) {
          return {
            id: String(q.mcq.id),
            title: q.mcq.questionText || 'MCQ Question',
            type: 'mcq' as const,
            points: q.mcq.points || 0,
          };
        } else if (q.dsa) {
          return {
            id: String(q.dsa.id),
            title: q.dsa.title || 'DSA Problem',
            type: 'dsa' as const,
            points: q.dsa.points || 0,
            difficulty: q.dsa.difficulty,
          };
        }
        return null;
      })
      .filter((q): q is Q => q != null);

    if (orderedQuestions.length > 0) {
      questions.splice(0, questions.length, ...orderedQuestions);
    }
  }

  const apiMcqCount = contestData.mcqCount ?? 0;
  const apiDsaCount = contestData.dsaCount ?? 0;
  const questionsNotRevealed =
    questions.length === 0 && (apiMcqCount > 0 || apiDsaCount > 0);

  const startTime = contestData.startTime ? new Date(contestData.startTime) : new Date()
  const endTime = contestData.endTime ? new Date(contestData.endTime) : new Date();

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const mcqCount = questionsNotRevealed ? apiMcqCount : questions.filter(q => q.type === 'mcq').length;
  const codingCount = questionsNotRevealed ? apiDsaCount : questions.filter(q => q.type === 'dsa').length;
  const totalQuestionCount = questionsNotRevealed ? apiMcqCount + apiDsaCount : questions.length;

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `${minutes} min` : ''}`;
    }
    return `${minutes} minutes`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStartContest = async () => {
    createAttempt(contestId, {
      onSuccess: (data) => {
        if (data.success) {
          navigate(`/contest/${contestId}/attempt/${data.data.attemptId}`)
          toast.success('Contest started! Good luck!')
        }
      }, onError: () => toast.error('Failed to start contest')
    })

  };

  const canStart = contestData.phase === 'running';
  const isUpcoming = contestData.phase === 'upcoming';
  const isEnded = contestData.phase === 'ended' || contestData.status === 'cancelled';
  const isCompetitive = contestData.type === 'competitive';

  const badgeStatus =
    contestData.status === 'cancelled'
      ? 'cancelled'
      : contestData.status === 'draft'
        ? 'draft'
        : contestData.phase === 'running'
          ? 'running'
          : contestData.phase === 'upcoming'
            ? 'scheduled'
            : contestData.phase === 'ended'
              ? 'ended'
              : null;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <AppBreadcrumb
            items={[
              { label: "Contests", href: "/dashboard" },
              { label: contestData.title },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {isCompetitive && badgeStatus && (
                    <StatusBadge status={badgeStatus} type="contest" />
                  )}
                  <Badge
                    variant="outline"
                    className={isCompetitive
                      ? 'border-primary/50 text-primary'
                      : 'border-blue-500/50 text-blue-400'
                    }
                  >
                    {isCompetitive ? 'Competitive' : 'Practice'}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{contestData.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{contestData.description}</p>
              </CardContent>
            </Card>

            {/* Questions List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-primary" />
                  Questions ({totalQuestionCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {questionsNotRevealed ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                    <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium text-foreground mb-1">
                      {apiMcqCount > 0 && apiDsaCount > 0
                        ? `${apiMcqCount} MCQ, ${apiDsaCount} DSA`
                        : apiMcqCount > 0
                          ? `${apiMcqCount} MCQ`
                          : `${apiDsaCount} DSA`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Questions will be revealed when the contest starts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{question.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {question.type === 'mcq' ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    MCQ
                                  </>
                                ) : (
                                  <>
                                    <Code className="w-3 h-3 mr-1" />
                                    DSA
                                  </>
                                )}
                              </Badge>
                              {question.difficulty && (
                                <StatusBadge status={question.difficulty as Difficulty} type="difficulty" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-primary">{question.points}</span>
                          <span className="text-sm text-muted-foreground ml-1">pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <Card className={canStart ? 'border-primary/50 bg-linear-to-br from-primary/5 to-transparent' : ''}>
              <CardContent className="">
                {canStart && isCompetitive && (
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-2">Contest ends in:</p>
                    <CountdownTimer targetDate={endTime} variant="large" showLabel={false} />
                  </div>
                )}

                {isUpcoming && isCompetitive && (
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-2">Contest starts in:</p>
                    <CountdownTimer targetDate={startTime} variant="large" showLabel={false} />
                  </div>
                )}

                {canStart && !isCompetitive && (
                  <div className="mb-6 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Work at your own pace. The timer starts when you begin.
                    </p>
                    {contestData.maxDurationMs != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Time limit:</span>
                        <span className="font-medium text-foreground">
                          {formatDuration(contestData.maxDurationMs)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!canStart || isStarting}
                  onClick={() => setShowConfirmDialog(true)}
                >
                  {isStarting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Starting...
                    </>
                  ) : canStart ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Contest
                    </>
                  ) : isUpcoming ? (
                    'Not Started Yet'
                  ) : (
                    'Contest Ended'
                  )}
                </Button>

                {isEnded && (
                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() => navigate(`/leaderboard/${contestId}`)}
                  >
                    View Leaderboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contest Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Total Points
                  </span>
                  <span className="font-semibold text-primary">
                    {questionsNotRevealed ? '—' : totalPoints}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <FileQuestion className="w-4 h-4" />
                    Questions
                  </span>
                  <span className="font-medium">{totalQuestionCount}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    DSA Problems
                  </span>
                  <span className="font-medium">{codingCount}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    MCQ Questions
                  </span>
                  <span className="font-medium">{mcqCount}</span>
                </div>

                {contestData.maxDurationMs && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Duration
                    </span>
                    <span className="font-medium">{formatDuration(contestData.maxDurationMs)}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-border space-y-3">
                  {startTime && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Start Time</p>
                        <p className="text-sm font-medium">{formatDate(startTime)}</p>
                      </div>
                    </div>
                  )}
                  {endTime && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">End Time</p>
                        <p className="text-sm font-medium">{formatDate(endTime)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <EnterContestDialog
        open={showConfirmDialog}
        onOpenChange={() => setShowConfirmDialog(false)}
        title={contestData.title}
        dsaCount={contestData.dsaCount}
        mcqCount={contestData.mcqCount}
        maxDurationMs={contestData.maxDurationMs}
        isStarting={isStarting}
        onConfirm={handleStartContest}
      />
    </div>
  );
};

export default ContestDetails;
