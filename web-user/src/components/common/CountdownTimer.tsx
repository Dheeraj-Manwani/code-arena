import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
  variant?: 'default' | 'compact' | 'large';
  showLabel?: boolean;
  label?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const CountdownTimer = ({ 
  targetDate, 
  onComplete, 
  variant = 'default',
  showLabel = true,
  label = 'Time Remaining'
}: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  if (timeLeft.total <= 0) {
    return (
      <div className="text-muted-foreground text-sm">
        Ended
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 text-sm font-mono">
        {timeLeft.days > 0 && (
          <span className="text-primary">{timeLeft.days}d</span>
        )}
        <span className="text-foreground">
          {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  if (variant === 'large') {
    const block = (value: number, unit: string) => (
      <div className="flex flex-col items-center gap-1 min-w-16">
        <div className="flex items-center justify-center rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 w-full">
          <span className="text-3xl font-mono font-extrabold tabular-nums text-foreground">
            {formatNumber(value)}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{unit}</span>
      </div>
    );
    const sep = () => (
      <span className="self-center text-2xl font-bold tabular-nums text-muted-foreground/50">:</span>
    );
    return (
      <div className="flex flex-col items-center gap-2">
        {showLabel && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        )}
        <div className="flex items-center justify-center gap-2">
          {timeLeft.days > 0 && (
            <>
              {block(timeLeft.days, 'Days')}
              {sep()}
            </>
          )}
          {block(timeLeft.hours, 'Hrs')}
          {sep()}
          {block(timeLeft.minutes, 'Min')}
          {sep()}
          {block(timeLeft.seconds, 'Sec')}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-xs text-muted-foreground">{label}:</span>
      )}
      <div className="flex items-center gap-1 font-mono text-sm">
        {timeLeft.days > 0 && (
          <>
            <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs font-semibold">
              {timeLeft.days}d
            </span>
          </>
        )}
        <span className="bg-secondary px-2 py-0.5 rounded text-foreground">
          {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
};

export default CountdownTimer;
