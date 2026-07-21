import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ProblemVisibilityEnum,
  VISIBILITY_HINTS,
  VISIBILITY_LABELS,
  type ProblemVisibility,
} from "@/schema/problem.schema";

interface VisibilitySelectProps {
  value: ProblemVisibility;
  onChange: (value: ProblemVisibility) => void;
  /** Rendered above the control; omit inside a compact/inline context. */
  label?: string;
  disabled?: boolean;
}

/**
 * The control that decides whether a question can leave the question bank.
 *
 * Shared rather than inlined per form because there are four call sites (create
 * MCQ, create DSA, edit MCQ, edit DSA) and the *hint text* is the part that
 * matters — "public" is not self-explanatory, and a creator picking it without
 * understanding it is how a draft problem reaches the catalogue.
 */
export const VisibilitySelect = ({
  value,
  onChange,
  label = "Visibility",
  disabled,
}: VisibilitySelectProps) => (
  <div>
    {label && <Label className="arena-label">{label}</Label>}
    <Select
      value={value}
      onValueChange={(v) => onChange(v as ProblemVisibility)}
      disabled={disabled}
    >
      <SelectTrigger className="arena-input w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ProblemVisibilityEnum.options.map((option) => (
          <SelectItem key={option} value={option}>
            {VISIBILITY_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="mt-1.5 text-xs text-muted-foreground">
      {VISIBILITY_HINTS[value]}
    </p>
  </div>
);
