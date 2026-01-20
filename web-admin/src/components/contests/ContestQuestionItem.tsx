import { Badge } from "@/components/ui/badge";
import { Code, FileText, GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContestQuestion {
  id: number;
  type: "mcq" | "dsa";
  order: number;
  questionText?: string;
  title?: string;
  points: number;
  options?: any[];
  tags?: string[];
}

interface ContestQuestionItemProps {
  question: ContestQuestion;
  index: number;
  isDragging: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export const ContestQuestionItem = ({
  question,
  index,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  onRemove,
  disabled = false,
}: ContestQuestionItemProps) => {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-transparent transition-all",
        isDragging && "border-primary/50 bg-primary/5"
      )}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
      <span className="text-sm font-mono text-muted-foreground w-6">
        {question.order}
      </span>
      {question.type === "mcq" ? (
        <>
          <FileText className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-foreground line-clamp-1">
              {question.questionText}
            </p>
            <p className="text-xs text-muted-foreground">
              {question.points} pts
            </p>
          </div>
        </>
      ) : (
        <>
          <Code className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-mono text-foreground">{question.title}</p>
            <div className="flex items-center gap-2 mt-1">
              {question.tags?.slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs"
                >
                  {tag}
                </Badge>
              ))}
              <span className="text-xs text-muted-foreground">
                {question.points} pts
              </span>
            </div>
          </div>
        </>
      )}
      <button
        onClick={() => onRemove(index)}
        type="button"
        disabled={disabled}
        className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
