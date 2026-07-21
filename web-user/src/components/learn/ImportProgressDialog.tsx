import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImportSummary } from "@/api/learn";
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";

export interface ImportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => void;
  pathTitle: string;
  isImporting: boolean;
  isError: boolean;
  /** Set once the upload lands; the dialog then shows the report instead. */
  summary: ImportSummary | null;
  onDone: () => void;
}

/** Only the extension is checked here — the server is the real validator. */
const looksLikeSpreadsheet = (file: File): boolean =>
  file.name.toLowerCase().endsWith(".xlsx");

interface OutcomeLineProps {
  count: number;
  label: string;
  tone: "good" | "neutral" | "warn";
}

/** A count only appears if it happened — a wall of zeroes reports nothing. */
const OutcomeLine = ({ count, label, tone }: OutcomeLineProps) => {
  if (count === 0) return null;

  return (
    <li
      className={cn(
        "flex items-baseline gap-2",
        tone === "good" && "text-emerald-400",
        tone === "warn" && "text-amber-300",
        tone === "neutral" && "text-muted-foreground",
      )}
    >
      <span className="font-mono font-semibold tabular-nums">{count}</span>
      <span>{label}</span>
    </li>
  );
};

/**
 * Upload flow for the progress spreadsheet (LEARN_PATHS.md §3.9).
 *
 * Two states in one dialog: pick a file, then read what happened to it. The
 * report is the point — the server refuses several categories of row on
 * purpose (verified completions can't be un-ticked, MCQs can't be hand-ticked),
 * and someone who edited 40 rows and saw 12 apply needs to know which rule ate
 * the rest. Silently succeeding with a smaller number is how a user concludes
 * the feature is broken.
 */
const ImportProgressDialog = ({
  open,
  onOpenChange,
  onConfirm,
  pathTitle,
  isImporting,
  isError,
  summary,
  onDone,
}: ImportProgressDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (candidate: File | undefined) => {
    if (!candidate) return;
    if (!looksLikeSpreadsheet(candidate)) {
      setRejected(true);
      setFile(null);
      return;
    }
    setRejected(false);
    setFile(candidate);
  };

  /** Clears local state so reopening never shows the previous run's file. */
  const reset = () => {
    setFile(null);
    setRejected(false);
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    reset();
    onDone();
    onOpenChange(false);
  };

  const changed = summary ? summary.completed + summary.cleared : 0;
  const refused = summary
    ? summary.skippedVerified +
      summary.skippedMcq +
      summary.unknownRows +
      summary.malformedRows
    : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isImporting) return;
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {summary ? "Import complete" : "Import progress"}
          </DialogTitle>
          <DialogDescription>
            {summary
              ? `Your sheet has been applied to ${pathTitle}.`
              : `Upload a sheet you exported from ${pathTitle}. Rows marked YES are ticked; rows marked NO are cleared.`}
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div className="space-y-3 py-2 text-sm">
            <ul className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
              <OutcomeLine count={summary.completed} label="marked complete" tone="good" />
              <OutcomeLine count={summary.cleared} label="cleared" tone="good" />
              <OutcomeLine
                count={summary.unchanged}
                label="already as the sheet asked"
                tone="neutral"
              />
              {changed === 0 && summary.unchanged === 0 && (
                <li className="text-muted-foreground">Nothing in the sheet changed.</li>
              )}
            </ul>

            {refused > 0 && (
              <div className="space-y-1.5 rounded-lg bg-amber-500/10 p-3 text-amber-300">
                <p className="flex items-center gap-2 font-medium">
                  <TriangleAlert className="h-4 w-4 shrink-0" />
                  Some rows were left alone
                </p>
                <ul className="space-y-1 pl-6">
                  <OutcomeLine
                    count={summary.skippedVerified}
                    label="solved for real — those can't be un-ticked"
                    tone="warn"
                  />
                  <OutcomeLine
                    count={summary.skippedMcq}
                    label="multiple-choice — answer them to complete them"
                    tone="warn"
                  />
                  <OutcomeLine
                    count={summary.unknownRows}
                    label="not part of this path"
                    tone="warn"
                  />
                  <OutcomeLine
                    count={summary.malformedRows}
                    label="had something other than YES or NO"
                    tone="warn"
                  />
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-2 text-sm">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                accept(event.dataTransfer.files[0]);
              }}
              className={cn(
                "rounded-lg border border-dashed p-6 text-center transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20",
              )}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={reset}
                    aria-label="Remove file"
                    className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Drop your .xlsx here, or{" "}
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      browse
                    </button>
                  </p>
                </>
              )}

              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(event) => accept(event.target.files?.[0])}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Questions you actually solved stay ticked — a sheet can't undo those.
            </p>

            {rejected && (
              <p className="text-destructive">That's not an .xlsx file.</p>
            )}
            {isError && (
              <p className="text-destructive">
                Couldn't read that sheet. Export a fresh copy and edit that one.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {summary ? (
            <Button onClick={close} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={close} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={() => file && onConfirm(file)}
                disabled={!file || isImporting}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportProgressDialog;
