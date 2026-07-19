import type { PracticeSubmission, SubmissionStatus } from "@/schema/practice.schema";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: "Judging…",
  accepted: "Accepted",
  wrong_answer: "Wrong Answer",
  time_limit_exceeded: "Time Limit Exceeded",
  runtime_error: "Runtime Error",
};

const STATUS_STYLE: Record<SubmissionStatus, string> = {
  pending: "text-muted-foreground",
  accepted: "text-emerald-500",
  wrong_answer: "text-rose-500",
  time_limit_exceeded: "text-amber-500",
  runtime_error: "text-rose-500",
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface PracticeSubmissionsPanelProps {
  submissions: PracticeSubmission[];
}

const PracticeSubmissionsPanel = ({ submissions }: PracticeSubmissionsPanelProps) => {
  if (submissions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No submissions yet. Submit a solution to see it here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {submissions.map((submission) => (
        <li
          key={submission.id}
          className="rounded-lg border border-border bg-background/50 px-3 py-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium",
                STATUS_STYLE[submission.status],
              )}
            >
              {submission.status === "pending" && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {STATUS_LABEL[submission.status]}
            </span>
            <span className="font-mono text-xs uppercase text-muted-foreground">
              {submission.language}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {submission.status === "pending"
                ? "—"
                : `${submission.testCasesPassed}/${submission.totalTestCases} tests`}
              {submission.executionTime != null && ` · ${submission.executionTime} ms`}
            </span>
            <span>{formatTime(submission.submittedAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default PracticeSubmissionsPanel;
