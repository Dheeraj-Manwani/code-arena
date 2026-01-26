import { cn } from '@/lib/utils';
import type { ContestStatus } from '@/schema/contest.schema';
import type { AttemptStatus, SubmissionStatus } from '@/schema/submission.schema';
import type { Difficulty } from '@/schema/problem.schema';

/** For contest type: phase-derived display (running/scheduled/ended) or status (draft/cancelled). */
type ContestBadgeStatus = ContestStatus | 'running' | 'scheduled' | 'ended';

interface StatusBadgeProps {
  status: ContestBadgeStatus | AttemptStatus | SubmissionStatus | Difficulty | string;
  type?: 'contest' | 'attempt' | 'submission' | 'difficulty';
  className?: string;
}

const StatusBadge = ({ status, type = 'contest', className }: StatusBadgeProps) => {
  const getStatusStyles = () => {
    // Contest status styles
    if (type === 'contest') {
      switch (status) {
        case 'running':
          return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'scheduled':
          return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'ended':
          return 'bg-muted text-muted-foreground border-border';
        case 'draft':
          return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        case 'cancelled':
          return 'bg-destructive/20 text-destructive border-destructive/30';
        default:
          return 'bg-muted text-muted-foreground border-border';
      }
    }

    // Attempt status styles
    if (type === 'attempt') {
      switch (status) {
        case 'in_progress':
          return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        case 'submitted':
          return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'timed_out':
          return 'bg-destructive/20 text-destructive border-destructive/30';
        case 'abandoned':
          return 'bg-muted text-muted-foreground border-border';
        default:
          return 'bg-muted text-muted-foreground border-border';
      }
    }

    // Submission status styles
    if (type === 'submission') {
      switch (status) {
        case 'accepted':
          return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'wrong_answer':
          return 'bg-destructive/20 text-destructive border-destructive/30';
        case 'tle':
          return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        case 'runtime_error':
          return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        case 'pending':
          return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        default:
          return 'bg-muted text-muted-foreground border-border';
      }
    }

    // Difficulty level styles
    if (type === 'difficulty') {
      switch (status) {
        case 'easy':
          return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'medium':
          return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        case 'hard':
          return 'bg-destructive/20 text-destructive border-destructive/30';
        default:
          return 'bg-muted text-muted-foreground border-border';
      }
    }

    return 'bg-muted text-muted-foreground border-border';
  };

  const getStatusLabel = () => {
    const labels: Record<string, string> = {
      // Contest statuses
      running: 'Live',
      scheduled: 'Upcoming',
      ended: 'Ended',
      draft: 'Draft',
      cancelled: 'Cancelled',
      // Attempt statuses
      in_progress: 'In Progress',
      submitted: 'Submitted',
      timed_out: 'Timed Out',
      abandoned: 'Abandoned',
      // Submission statuses
      accepted: 'Accepted',
      wrong_answer: 'Wrong Answer',
      tle: 'Time Limit Exceeded',
      runtime_error: 'Runtime Error',
      pending: 'Pending',
      // Difficulty levels
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
    };
    return labels[status] || status;
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        getStatusStyles(),
        className
      )}
    >
      {status === 'running' && (
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
      )}
      {getStatusLabel()}
    </span>
  );
};

export default StatusBadge;
