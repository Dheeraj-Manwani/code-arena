import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { toast } from "react-hot-toast";
import { Eye, ImagePlus, Loader2, Pencil } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { uploadApi } from "@/api/upload";
import { Markdown } from "./Markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Shown under the toolbar; the field's own validation message. */
  error?: string;
}

/**
 * A markdown textarea with image upload.
 *
 * Three ways to add an image, because authors reach for different ones: the
 * toolbar button, a paste (which is how a screenshot actually arrives — straight
 * from the clipboard, with no file on disk), and a drag-drop. All three funnel
 * into `insertUpload`.
 *
 * The markdown is inserted **at the cursor**, not appended. Appending sounds
 * simpler until you are adding a diagram to the middle of a written statement
 * and it lands at the bottom every time.
 */
export const MarkdownEditor = ({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  error,
}: MarkdownEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Splices text in at the caret and restores the caret after it.
   *
   * Reading `selectionStart` off the live element rather than tracking it in
   * state: an upload is async, and state captured before the await can be stale
   * by the time it resolves.
   */
  const insertAtCursor = (snippet: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;

    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);

    // After React has re-rendered with the new value, put the caret past what
    // we inserted so typing continues where the author expects.
    requestAnimationFrame(() => {
      if (!textarea) return;
      const caret = start + snippet.length;
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  };

  const insertUpload = async (file: File) => {
    if (disabled || isUploading) return;

    setIsUploading(true);
    try {
      const { url } = await uploadApi.image(file);
      // The alt text defaults to the filename minus its extension — a usable
      // starting point the author can edit, rather than an empty `![]()` that
      // ships as an unlabelled image.
      const alt = file.name.replace(/\.[^.]+$/, "") || "image";
      insertAtCursor(`\n![${alt}](${url})\n`);
      toast.success("Image uploaded");
    } catch {
      // The axios interceptor already toasts the server's message; this only
      // catches so the editor doesn't reject an unhandled promise.
    } finally {
      setIsUploading(false);
    }
  };

  /** Pulls image files out of a paste or drop, ignoring everything else. */
  const imagesFrom = (items: FileList | null | undefined): File[] =>
    Array.from(items ?? []).filter((file) => file.type.startsWith("image/"));

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const images = imagesFrom(event.clipboardData?.files);
    if (images.length === 0) return;

    // Only intercept when there IS an image — otherwise a normal text paste
    // would be swallowed.
    event.preventDefault();
    void insertUpload(images[0]);
  };

  const handleDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    const images = imagesFrom(event.dataTransfer?.files);
    setIsDragging(false);
    if (images.length === 0) return;

    event.preventDefault();
    void insertUpload(images[0]);
  };

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          {isUploading ? "Uploading..." : "Add image"}
        </button>

        <button
          type="button"
          onClick={() => setIsPreview((prev) => !prev)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {isPreview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {isPreview ? "Write" : "Preview"}
        </button>

        <span className="ml-auto text-xs text-muted-foreground">
          Markdown · paste or drop an image
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset first so choosing the same file twice still fires onChange.
            event.target.value = "";
            if (file) void insertUpload(file);
          }}
        />
      </div>

      {isPreview ? (
        <div
          className={cn(
            "min-h-[200px] w-full rounded-md border border-border bg-background/50 p-4",
            error && "border-destructive",
          )}
        >
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(event) => {
            // Without preventDefault the browser navigates to the dropped file.
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          disabled={disabled}
          className={cn(
            "arena-input w-full min-h-[200px] resize-y",
            isDragging && "border-primary",
            error && "border-destructive",
          )}
        />
      )}

      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
};
