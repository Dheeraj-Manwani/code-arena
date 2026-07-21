import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProblemTagCount } from "@/schema/practice.schema";
import type { Difficulty } from "@/schema/problem.schema";
import type { ProblemStatusFilter } from "@/schema/practice.schema";

/**
 * The catalogue filter sidebar.
 *
 * Every control here is multi-select, which is why they are checkboxes and not
 * a row of `Select`s: ticking Easy *and* Medium is the common case, and a
 * single-value control renders that impossible. The URL carries repeated params
 * (`?difficulty=easy&difficulty=medium`) so a filtered catalogue stays
 * shareable — the reason `useProblemFilters` keeps state in the URL at all.
 */

interface FilterSectionProps {
  title: string;
  children: ReactNode;
  /** Collapsed sections still render their inputs, so tick state is never lost. */
  defaultOpen?: boolean;
  /** Shown next to the title when the section is collapsed but active. */
  activeCount?: number;
}

const FilterSection = ({
  title,
  children,
  defaultOpen = true,
  activeCount = 0,
}: FilterSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          {title}
          {/* Only meaningful while collapsed — open, the ticks speak for
              themselves and a duplicate count is noise. */}
          {!open && activeCount > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium normal-case text-primary">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>

      {open && <div className="mt-3 space-y-0.5">{children}</div>}
    </div>
  );
};

interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
  /** Tints the label — used to carry difficulty's colour vocabulary. */
  labelClassName?: string;
}

/**
 * A native checkbox, restyled.
 *
 * `appearance-none` on a real `<input type="checkbox">` rather than a div with
 * `role="checkbox"`: it keeps keyboard behaviour, form semantics, and the label
 * association for free, which a hand-rolled one has to reimplement and usually
 * gets subtly wrong.
 *
 * The checked state is expressed with the static `checked:` variant and a
 * `peer-checked:` sibling icon, NOT with a conditional class string. An earlier
 * version drew the tick with an inline `bg-[url("data:image/svg+xml,…")]`, and
 * Tailwind's scanner silently failed to extract it — the quotes and spaces in
 * the data URI break class detection, so neither the tick nor the fill was ever
 * generated and every ticked box rendered as an empty outline. Keeping these
 * utilities static and literal is what makes them survive the build.
 */
const FilterCheckbox = ({
  label,
  checked,
  onChange,
  count,
  labelClassName,
}: FilterCheckboxProps) => (
  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-accent/60">
    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer h-4 w-4 appearance-none rounded border border-border bg-transparent transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      />
      <Check
        className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100"
        strokeWidth={3}
        aria-hidden
      />
    </span>
    <span className={cn("min-w-0 flex-1 truncate text-sm text-foreground", labelClassName)}>
      {label}
    </span>
    {count !== undefined && (
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {count}
      </span>
    )}
  </label>
);

/** How many tags to show before the list needs expanding. */
const TAG_PREVIEW_COUNT = 8;

const DIFFICULTIES: { value: Difficulty; label: string; className: string }[] = [
  { value: "easy", label: "Easy", className: "text-emerald-500" },
  { value: "medium", label: "Medium", className: "text-amber-500" },
  { value: "hard", label: "Hard", className: "text-rose-500" },
];

const STATUSES: { value: ProblemStatusFilter; label: string }[] = [
  { value: "solved", label: "Solved" },
  { value: "attempted", label: "Attempted" },
  { value: "todo", label: "Todo" },
];

export interface ProblemFilterPanelProps {
  tags: ProblemTagCount[];
  selectedTags: string[];
  selectedDifficulties: Difficulty[];
  selectedStatuses: ProblemStatusFilter[];
  onToggleTag: (tag: string) => void;
  onToggleDifficulty: (difficulty: Difficulty) => void;
  onToggleStatus: (status: ProblemStatusFilter) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export const ProblemFilterPanel = ({
  tags,
  selectedTags,
  selectedDifficulties,
  selectedStatuses,
  onToggleTag,
  onToggleDifficulty,
  onToggleStatus,
  onClearAll,
  hasActiveFilters,
}: ProblemFilterPanelProps) => {
  const [showAllTags, setShowAllTags] = useState(false);

  // A tag that is ticked must stay visible even if it sits past the preview
  // cut — otherwise clearing it means hunting for it behind "View all".
  const visibleTags = showAllTags
    ? tags
    : tags.filter(
        (entry, index) => index < TAG_PREVIEW_COUNT || selectedTags.includes(entry.tag),
      );

  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="lg:sticky lg:top-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Filters</h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-full border border-destructive/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-destructive transition-colors hover:bg-destructive/10"
            >
              Clear all
            </button>
          )}
        </div>

        <FilterSection title="Topics" activeCount={selectedTags.length}>
          {tags.length === 0 ? (
            <p className="px-1.5 py-1 text-sm text-muted-foreground">No topics yet.</p>
          ) : (
            <>
              {visibleTags.map((entry) => (
                <FilterCheckbox
                  key={entry.tag}
                  label={entry.tag}
                  count={entry.count}
                  checked={selectedTags.includes(entry.tag)}
                  onChange={() => onToggleTag(entry.tag)}
                />
              ))}
              {tags.length > TAG_PREVIEW_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAllTags((value) => !value)}
                  className="px-1.5 pt-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  {showAllTags ? "Show fewer" : `View all ${tags.length}`}
                </button>
              )}
            </>
          )}
        </FilterSection>

        <FilterSection title="Difficulty" activeCount={selectedDifficulties.length}>
          {DIFFICULTIES.map((entry) => (
            <FilterCheckbox
              key={entry.value}
              label={entry.label}
              labelClassName={entry.className}
              checked={selectedDifficulties.includes(entry.value)}
              onChange={() => onToggleDifficulty(entry.value)}
            />
          ))}
        </FilterSection>

        <FilterSection title="Status" activeCount={selectedStatuses.length}>
          {STATUSES.map((entry) => (
            <FilterCheckbox
              key={entry.value}
              label={entry.label}
              checked={selectedStatuses.includes(entry.value)}
              onChange={() => onToggleStatus(entry.value)}
            />
          ))}
        </FilterSection>
      </div>
    </aside>
  );
};
