import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  VISIBILITY_LABELS,
  type ProblemVisibility,
} from "@/schema/problem.schema";

/**
 * `public` is the state that carries consequences — it is the only one that
 * puts a question in front of a learner — so it is the only one styled to draw
 * the eye. Draft and contest-only are quiet by design; a bank where every row
 * shouts tells a curator nothing.
 */
const STYLES: Record<ProblemVisibility, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  public: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  contest_only: "bg-amber-500/10 text-amber-400/90 border-amber-500/20",
};

export const VisibilityBadge = ({
  visibility,
}: {
  visibility: ProblemVisibility;
}) => {
  // Responses are typed but never runtime-parsed in this app, so a server that
  // omits the field yields `undefined` here despite the type. Falling back
  // renders a correct-looking "Draft" instead of an empty badge.
  const value: ProblemVisibility = visibility ?? "draft";

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", STYLES[value])}
    >
      {VISIBILITY_LABELS[value]}
    </Badge>
  );
};
