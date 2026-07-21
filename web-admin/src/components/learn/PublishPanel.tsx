import { AlertTriangle, CheckCircle2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LEARN_PATH_STATUS_LABELS,
  type LearnPathStatus,
  type LearnPathValidation,
} from "@/schema/learn.schema";

interface PublishPanelProps {
  status: LearnPathStatus;
  validation: LearnPathValidation | undefined;
  learners: number | undefined;
  onPublish: () => void;
  onUnpublish: () => void;
  isPending: boolean;
}

const STATUS_STYLES: Record<LearnPathStatus, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  archived: "bg-muted/50 text-muted-foreground/60 border-transparent",
};

/**
 * Publish state, readiness, and the §5.1 blast radius in one place.
 *
 * Every reason a path can't publish is listed at once. A curator fixing them
 * one server round-trip at a time gives up, and the server returns them all for
 * exactly this reason.
 */
export const PublishPanel = ({
  status,
  validation,
  learners,
  onPublish,
  onUnpublish,
  isPending,
}: PublishPanelProps) => {
  const publishable = validation?.publishable ?? false;
  const problems = validation?.problems ?? [];

  return (
    <div className="arena-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Status</span>
          <Badge variant="outline" className={cn("text-xs", STATUS_STYLES[status])}>
            {LEARN_PATH_STATUS_LABELS[status]}
          </Badge>
        </div>

        {status === "published" ? (
          <Button variant="secondary" size="sm" onClick={onUnpublish} disabled={isPending}>
            Unpublish
          </Button>
        ) : (
          <Button size="sm" onClick={onPublish} disabled={isPending || !publishable}>
            {isPending ? "Publishing…" : "Publish"}
          </Button>
        )}
      </div>

      {/* Live learners are the reason edits to a published path aren't free. */}
      {status === "published" && learners !== undefined && learners > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <Users className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            <strong>{learners}</strong> {learners === 1 ? "learner is" : "learners are"} on this
            path. Adding questions shows them a “new” marker; it never un-completes anything
            they've finished.
          </p>
        </div>
      )}

      {status !== "published" &&
        (publishable ? (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Ready to publish.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              {problems.length} {problems.length === 1 ? "issue" : "issues"} to fix first:
            </div>
            <ul className="space-y-1.5 pl-6">
              {problems.map((problem, index) => (
                <li
                  key={index}
                  className="text-xs text-muted-foreground list-disc leading-relaxed"
                >
                  {problem}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
};
