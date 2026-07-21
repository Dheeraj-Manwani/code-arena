import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  /** Shown in the middle. Defaults to the percentage. */
  label?: string;
  className?: string;
}

/**
 * The percentage ring (LEARN_PATHS.md §3.1, §3.6).
 *
 * Animates **from the previously rendered value**, not from zero — §3.7 calls
 * this out as the single most common way a progress indicator feels fake. A ring
 * that sweeps 0→47% on every page load is telling the user they just earned 47%,
 * every time; one that sits at 47% and only moves when it changes is telling the
 * truth. The previous value is held in a ref so a remount within the session
 * starts where it left off.
 */
export const ProgressRing = ({
  completed,
  total,
  size = 56,
  strokeWidth = 5,
  label,
  className,
}: ProgressRingProps) => {
  const target = total <= 0 ? 0 : completed / total;

  // Seeded with the target so the very first paint of a session is static —
  // there is no "previous" to animate from, and sweeping from zero would be the
  // exact lie described above.
  const previous = useRef(target);
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (previous.current === target) return;

    // Two frames: one to commit the old value, one to transition to the new.
    // A single frame lands in the same paint and the CSS transition is skipped.
    const from = previous.current;
    setValue(from);

    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setValue(target)),
    );

    previous.current = target;
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - value);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(target * 100)}% complete, ${completed} of ${total}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>

      <span className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums">
        {label ?? `${Math.round(target * 100)}%`}
      </span>
    </div>
  );
};
