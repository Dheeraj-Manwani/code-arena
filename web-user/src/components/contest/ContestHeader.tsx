import { Clock, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

interface ContestHeaderProps {
  title: string;
  currentQuestion: number;
  totalQuestions: number;
  duration: number; // in minutes
  startTime: number;
}

const ContestHeader = ({
  title,
  currentQuestion,
  totalQuestions,
  duration,
  startTime,
}: ContestHeaderProps) => {
  const [timeRemaining, setTimeRemaining] = useState(duration * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, duration * 60 - elapsed);
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, startTime]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = ((currentQuestion) / totalQuestions) * 100;
  const isLowTime = timeRemaining < 300; // Less than 5 minutes

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h1 className="font-mono text-lg font-semibold">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Progress indicator */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Progress</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-mono text-sm">
                {currentQuestion}/{totalQuestions}
              </span>
            </div>
          </div>

          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isLowTime ? "bg-destructive/20 text-destructive" : "bg-secondary"
            }`}
          >
            <Clock className={`h-4 w-4 ${isLowTime ? "animate-pulse" : ""}`} />
            <span className="font-mono text-sm font-medium">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ContestHeader;
