import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, TriangleAlert } from "lucide-react";

export interface ResetPathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pathTitle: string;
  /** Completions the user ticked by hand — the only ones reset destroys. */
  selfMarkedCount: number;
  verifiedCount: number;
  isResetting: boolean;
  isError: boolean;
}

/**
 * Confirmation for the Reset control (LEARN_PATHS.md §3.2).
 *
 * The copy is deliberately specific about what survives, because reset does
 * *not* zero the path. Wiping `UserLearnPathProgress` also clears the backfill
 * gate (§5.2 hazard 1), so the next page load re-credits every question backed
 * by a real accepted submission. Promising a clean slate here would leave the
 * user staring at a ring that refilled itself and reading it as a bug — the
 * exact failure §3.8 exists to prevent.
 */
const ResetPathDialog = ({
  open,
  onOpenChange,
  onConfirm,
  pathTitle,
  selfMarkedCount,
  verifiedCount,
  isResetting,
  isError,
}: ResetPathDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-primary" />
          Reset progress
        </DialogTitle>
        <DialogDescription>
          This clears your tracked progress through {pathTitle} and sends you back to the
          first topic.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2 text-sm">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="font-medium text-foreground">What gets cleared</p>
          <ul className="mt-1.5 space-y-1 text-muted-foreground">
            <li>
              {selfMarkedCount > 0
                ? `${selfMarkedCount} self-marked ${selfMarkedCount === 1 ? "question" : "questions"}`
                : "Self-marked questions"}
            </li>
            <li>Multiple-choice answers you've gotten right</li>
            <li>Topics you unlocked early, and milestones you've already seen</li>
          </ul>
        </div>

        {verifiedCount > 0 && (
          <div className="flex gap-2 rounded-lg bg-amber-500/10 p-3 text-amber-300">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {verifiedCount} {verifiedCount === 1 ? "question" : "questions"} you actually
              solved will be credited again from your submission history, so the bar won't
              go all the way to zero.
            </p>
          </div>
        )}

        {isError && (
          <p className="text-destructive">Couldn't reset the path. Please try again.</p>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isResetting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isResetting} className="gap-2">
          {isResetting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset progress"
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default ResetPathDialog;
