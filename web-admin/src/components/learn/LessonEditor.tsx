import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { LearnLessonNode } from "@/schema/learn.schema";

interface LessonEditorProps {
  lesson: LearnLessonNode | null;
  open: boolean;
  onClose: () => void;
  onSave: (input: { title: string; body: string | null }) => void;
  isSaving: boolean;
}

/**
 * Lesson title and prose.
 *
 * The body is optional and uncounted (D4) — a lesson is complete when its
 * questions are, whether or not anyone reads a word of it. The copy says so,
 * because a curator who thinks reading is tracked will write differently.
 *
 * No live preview yet: `web-user` has no markdown renderer to share (§5.8
 * — verified, there is none anywhere in the repo), so a preview here would be a
 * second, divergent implementation of the exact pipeline Phase 5 has to build
 * properly with sanitisation. Better one renderer, built once, than a preview
 * that lies about what learners see.
 */
export const LessonEditor = ({
  lesson,
  open,
  onClose,
  onSave,
  isSaving,
}: LessonEditorProps) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (lesson && open) {
      setTitle(lesson.title);
      setBody(lesson.body ?? "");
      setError("");
    }
  }, [lesson, open]);

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required");
      return;
    }

    onSave({
      title: trimmed,
      // Empty means "no prose", not an empty document — the lesson page skips
      // the reader entirely when body is null.
      body: body.trim() === "" ? null : body,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit lesson</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="arena-label">Title</Label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError("");
              }}
              className={cn("arena-input w-full", error && "border-destructive")}
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>

          <div>
            <Label className="arena-label">Lesson text (optional)</Label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              spellCheck={false}
              placeholder={"## How binary search works\n\nMarkdown is supported."}
              className="arena-input w-full font-mono text-sm leading-relaxed resize-y"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Markdown, shown above the lesson's questions. Reading is never required and
              never counts toward progress — only questions do.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleSave();
              if (title.trim()) toast.success("Lesson saved");
            }}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
