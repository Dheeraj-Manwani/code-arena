import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Info } from "lucide-react";
import { ContestQuestionItem, type ContestQuestion } from "./ContestQuestionItem";
import { ImportQuestionsDialog } from "./ImportQuestionsDialog";
import type { McqQuestion, DsaProblem } from "@/schema/problem.schema";

interface ContestQuestionsListProps {
  questions: ContestQuestion[];
  isLoading: boolean;
  dragIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onRemove: (index: number) => void;
  onImportMcq: (question: McqQuestion) => void;
  onImportDsa: (problem: DsaProblem) => void;
  onCreateQuestion: () => void;
  isImportOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
  disabled?: boolean;
}

export const ContestQuestionsList = ({
  questions,
  isLoading,
  dragIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
  onRemove,
  onImportMcq,
  onImportDsa,
  onCreateQuestion,
  isImportOpen,
  onImportOpenChange,
  disabled = false,
}: ContestQuestionsListProps) => {
  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-foreground">
          Contest Questions
        </h3>
      </div>

      <div className="mb-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
        <Info className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-sm text-blue-400">
          If questions have been modified, changes will be saved when you click "Update Contest".
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Drag to reorder • Questions are displayed in the order shown below
          </p>
          <div className="flex gap-2">
            <ImportQuestionsDialog
              isOpen={isImportOpen}
              onOpenChange={onImportOpenChange}
              onImportMcq={onImportMcq}
              onImportDsa={onImportDsa}
              contestQuestions={questions}
              disabled={disabled}
            />

            <Button
              size="sm"
              type="button"
              disabled={disabled}
              variant="outline"
              onClick={onCreateQuestion}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Question
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                <Skeleton className="w-4 h-4" />
                <Skeleton className="w-6 h-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No questions added yet. Import or create questions to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {questions.map((question, index) => (
              <ContestQuestionItem
                key={`${question.type}-${question.id}`}
                question={question}
                index={index}
                isDragging={dragIndex === index}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                onRemove={onRemove}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
