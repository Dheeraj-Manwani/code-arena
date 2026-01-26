import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatusInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatusInfoModal = ({ isOpen, onClose }: StatusInfoModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className=" max-w-4xl bg-card border-border max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Contest Status Guide
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4 overflow-y-auto flex-1 pr-2">
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="px-2 py-1 rounded text-xs font-medium border bg-amber-500/20 text-amber-400 border-amber-500/30">
                Draft
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">
              A contest in <strong>Draft</strong> status is not visible to
              contestants. Use this status for work-in-progress contests that
              you're still setting up. You can add questions, configure
              settings, and make changes freely. The contest will only become
              visible to contestants once you change it to{" "}
              <strong>Published</strong>.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="px-2 py-1 rounded text-xs font-medium border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                Published
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">
              A <strong>Published</strong> contest is visible to contestants and
              appears in the contest list. Use this status when you're ready to
              make the contest available.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="px-2 py-1 rounded text-xs font-medium border bg-red-500/20 text-red-400 border-red-500/30">
                Cancelled
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">
              A <strong>Cancelled</strong> contest is no longer available to
              contestants. Use this status if you need to cancel a contest that
              was previously in Draft or Published. Cancelled contests remain
              visible in your dashboard but are not accessible to contestants.
            </p>
          </div>


        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
