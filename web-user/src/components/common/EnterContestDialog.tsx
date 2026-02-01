import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BorderTrail } from "@/components/common/BorderTrail";
import {
  FileQuestion,
  Trophy,
  Clock,
  Code,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Ban,
  Loader2,
} from "lucide-react";

export interface EnterContestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  mcqCount: number;
  dsaCount: number;
  isStarting: boolean;
  maxDurationMs: number | null;
}

const formatDuration = (ms: number) => {
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const EnterContestDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  mcqCount,
  dsaCount,
  isStarting,
  maxDurationMs,
}: EnterContestDialogProps) => {
  const [trailPaused, setTrailPaused] = useState(false);
  const totalQuestions = mcqCount + dsaCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setTrailPaused(true)}
        onMouseLeave={() => setTrailPaused(false)}
      >
        <BorderTrail
          className="bg-primary rounded-full blur-[2px]"
          size={140}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          paused={trailPaused}
        />
        <div className="relative z-10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription>
              Read the instructions before starting. The timer cannot be paused.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <FileQuestion className="h-4 w-4" />
                {totalQuestions} Questions
              </span>
              {maxDurationMs != null && (
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatDuration(maxDurationMs)}
                </span>
              )}
              <span className="inline-flex items-center gap-2">
                <Code className="h-4 w-4" />
                {dsaCount} DSA, {mcqCount} MCQ
              </span>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertCircle className="h-4 w-4 text-primary" />
                Instructions
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  Timer cannot be paused. Ensure you have enough time.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  You can switch between questions freely.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  Progress is saved automatically.
                </li>
                <li className="flex items-start gap-2">
                  <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  Do not refresh or leave the page during the contest.
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onConfirm} className="gap-2" disabled={isStarting}>
              {isStarting ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</> : "Start Contest"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnterContestDialog;
