import { cn } from "@/lib/utils";
import type { ContestMcq } from "@/schema/problem.schema";

interface MCQQuestionProps {
  question: ContestMcq;
  selectedAnswer: number | null;
  onSelectAnswer: (answerId: number) => void;
}

const MCQQuestion = ({
  question,
  selectedAnswer,
  onSelectAnswer,
}: MCQQuestionProps) => {
  return (
    <div className="h-full flex flex-col p-8">
      <div className="flex-1 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full mb-4">
            Multiple Choice
          </span>
          <h2 className="font-mono text-2xl font-bold mb-4">{question.questionText}</h2>
          <p className="text-lg text-foreground/90 leading-relaxed">
            {question.questionText}
          </p>
        </div>

        <div className="space-y-3">
          {question.options.map((option: string, index: number) => {
            const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
            const isSelected = selectedAnswer === index;

            return (
              <button
                key={optionLabel}
                onClick={() => onSelectAnswer(index)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 text-left",
                  isSelected
                    ? "border-primary bg-primary/10 arena-glow"
                    : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full font-mono font-bold text-sm transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {optionLabel}
                </span>
                <span className="flex-1 text-foreground">{option}</span>
                {isSelected && (
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MCQQuestion;
