import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  completed: number;
  total: number;
  className?: string;
}

/**
 * The per-container bar (§3.2). Same animate-from-previous rule as
 * `ProgressRing` — see the reasoning there.
 */
export const ProgressBar = ({ completed, total, className }: ProgressBarProps) => {
  const target = total <= 0 ? 0 : completed / total;
  const previous = useRef(target);
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (previous.current === target) return;

    setValue(previous.current);
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setValue(target)),
    );
    previous.current = target;
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <div
      className={cn("h-1.5 w-full rounded-full bg-muted overflow-hidden", className)}
      role="progressbar"
      aria-valuenow={completed}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
};
