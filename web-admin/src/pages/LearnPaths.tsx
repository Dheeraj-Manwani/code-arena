import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";
import { BookOpen, Plus, Archive, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { pageVariants } from "@/lib/animations";
import {
  useLearnPathsQuery,
  useCreateLearnPathMutation,
  useArchiveLearnPathMutation,
} from "@/queries/learn.queries";
import {
  CreateLearnPathSchema,
  LEARN_PATH_STATUS_LABELS,
  slugify,
  type LearnPathStatus,
} from "@/schema/learn.schema";

const STATUS_STYLES: Record<LearnPathStatus, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  archived: "bg-muted/50 text-muted-foreground/60 border-transparent",
};

const LearnPaths = () => {
  const { data: paths, isLoading } = useLearnPathsQuery();
  const createPath = useCreateLearnPathMutation();
  const archivePath = useArchiveLearnPathMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", description: "" });
  // The curator edits the title; the slug follows until they touch it, at which
  // point it stops following. A slug is a URL, so silently rewriting one the
  // curator chose would break links they may already have shared.
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setForm({ title: "", slug: "", description: "" });
    setSlugTouched(false);
    setErrors({});
  };

  const handleCreate = () => {
    const input = {
      title: form.title.trim(),
      slug: (slugTouched ? form.slug : slugify(form.title)).trim(),
      description: form.description.trim(),
    };

    const result = CreateLearnPathSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path.join(".")] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    createPath.mutate(result.data, {
      onSuccess: () => {
        toast.success("Path created");
        setIsCreateOpen(false);
        resetForm();
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Failed to create path";
        toast.error(message);
      },
    });
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Learn paths</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Curated curricula. A learner picks a path and works through it question by question.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          New path
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !paths || paths.length === 0 ? (
        <div className="arena-card py-16 text-center">
          <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">No learn paths yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            A path holds modules, each with lessons, each with questions.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create the first one
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((path) => (
            <div key={path.id} className="arena-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/learn/${path.id}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {path.title}
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  {path.isFeatured && (
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  )}
                  <Badge variant="outline" className={cn("text-xs", STATUS_STYLES[path.status])}>
                    {LEARN_PATH_STATUS_LABELS[path.status]}
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">{path.description}</p>

              <div className="text-xs text-muted-foreground font-mono">
                {path.totalModules} modules · {path.totalQuestions} questions
              </div>

              <div className="flex items-center gap-2 mt-auto pt-2">
                <Button asChild variant="secondary" size="sm" className="flex-1">
                  <Link to={`/learn/${path.id}`}>Edit</Link>
                </Button>
                {path.status !== "archived" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Archive"
                    onClick={() =>
                      archivePath.mutate(path.id, {
                        onSuccess: () => toast.success("Path archived"),
                        onError: () => toast.error("Failed to archive"),
                      })
                    }
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New learn path</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="arena-label">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="DSA Foundations"
                className={cn("arena-input w-full", errors.title && "border-destructive")}
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <Label className="arena-label">Slug</Label>
              <Input
                value={slugTouched ? form.slug : slugify(form.title)}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: e.target.value });
                }}
                placeholder="dsa-foundations"
                className={cn("arena-input w-full font-mono text-sm", errors.slug && "border-destructive")}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Appears in the URL: /learn/{slugTouched ? form.slug || "…" : slugify(form.title)}
              </p>
              {errors.slug && <p className="text-sm text-destructive mt-1">{errors.slug}</p>}
            </div>

            <div>
              <Label className="arena-label">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What a learner gets out of this path."
                className={cn("arena-input w-full", errors.description && "border-destructive")}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createPath.isPending}>
              {createPath.isPending ? "Creating…" : "Create path"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default LearnPaths;
