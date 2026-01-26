import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Code, FileText } from "lucide-react";
import { McqForm } from "@/components/questions/McqForm";
import { DsaForm } from "@/components/questions/DsaForm";
import type { AddMcqType, AddDsaType } from "@/schema/problem.schema";

interface CreateQuestionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateMcq: (data: AddMcqType) => void;
  onCreateDsa: (data: AddDsaType) => void;
  isCreatingMcq: boolean;
  isCreatingDsa: boolean;
  mcqFormErrors: Record<string, string>;
  dsaFormErrors: Record<string, string>;
  onMcqErrorsChange: (errors: Record<string, string>) => void;
  onDsaErrorsChange: (errors: Record<string, string>) => void;
}

export const CreateQuestionDialog = ({
  isOpen,
  onOpenChange,
  onCreateMcq,
  onCreateDsa,
  isCreatingMcq,
  isCreatingDsa,
  mcqFormErrors,
  dsaFormErrors,
  onMcqErrorsChange,
  onDsaErrorsChange,
}: CreateQuestionDialogProps) => {
  const [questionType, setQuestionType] = useState<"mcq" | "dsa">("mcq");
  const isCreatingQuestion = isCreatingMcq || isCreatingDsa;

  const handleClose = (open: boolean) => {
    if (isCreatingQuestion && !open) {
      return;
    }
    onOpenChange(open);
    if (!open) {
      onMcqErrorsChange({});
      onDsaErrorsChange({});
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Question</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-6">
            <Label className="arena-label mb-2">Question Type</Label>
            <Select
              value={questionType}
              onValueChange={(value) => {
                setQuestionType(value as "mcq" | "dsa");
                onMcqErrorsChange({});
                onDsaErrorsChange({});
              }}
              disabled={isCreatingQuestion}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    MCQ Question
                  </div>
                </SelectItem>
                <SelectItem value="dsa">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    DSA Problem
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {questionType === "mcq" ? (
            <McqForm
              onSubmit={onCreateMcq}
              onCancel={() => handleClose(false)}
              isSubmitting={isCreatingMcq}
              submitLabel={isCreatingMcq ? "Creating..." : "Create & Add"}
              errors={mcqFormErrors}
              onErrorsChange={onMcqErrorsChange}
            />
          ) : (
            <DsaForm
              onSubmit={onCreateDsa}
              onCancel={() => handleClose(false)}
              isSubmitting={isCreatingDsa}
              submitLabel={isCreatingDsa ? "Creating..." : "Create & Add"}
              errors={dsaFormErrors}
              onErrorsChange={onDsaErrorsChange}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
