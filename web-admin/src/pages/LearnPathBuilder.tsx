import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  FileText,
  Code,
  HelpCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { pageVariants } from "@/lib/animations";
import { useDragReorder } from "@/hooks/useDragReorder";
import { QuestionPicker } from "@/components/learn/QuestionPicker";
import { LessonEditor } from "@/components/learn/LessonEditor";
import { PublishPanel } from "@/components/learn/PublishPanel";
import {
  useLearnPathQuery,
  useLearnPathValidationQuery,
  useLearnPathImpactQuery,
  useUpdateLearnPathMutation,
  useLearnStructureMutations,
} from "@/queries/learn.queries";
import { slugify, type LearnLessonNode, type LearnModuleNode } from "@/schema/learn.schema";

/**
 * Errors are NOT handled per-mutation here.
 *
 * `lib/axios.ts` already intercepts every failed response, maps its error code
 * through `error-messages.ts`, and toasts it. Adding `onError: toast.error(...)`
 * to these mutations shows the user two toasts for one failure — and the naive
 * version shows the raw code (`LEARN_PROBLEM_IN_LIVE_CONTEST`) next to the
 * friendly sentence, because the envelope carries a code, not a message.
 */

const LearnPathBuilder = () => {
  const params = useParams();
  const pathId = parseInt(String(params.pathId), 10);

  const { data: path, isLoading } = useLearnPathQuery(pathId);
  const { data: validation } = useLearnPathValidationQuery(pathId);
  const { data: impact } = useLearnPathImpactQuery(pathId);
  const updatePath = useUpdateLearnPathMutation(pathId);
  const m = useLearnStructureMutations(pathId);

  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<number>>(new Set());
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState<Record<number, string>>({});
  const [pickerLessonId, setPickerLessonId] = useState<number | null>(null);
  const [editingLesson, setEditingLesson] = useState<LearnLessonNode | null>(null);

  const toggle = (set: Set<number>, id: number, update: (next: Set<number>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update(next);
  };

  const moduleDrag = useDragReorder((moduleId, targetIndex) =>
    m.reorderModule.mutate({ moduleId, targetIndex }),
  );


  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!path) {
    return (
      <div className="arena-card py-16 text-center">
        <p className="font-medium text-foreground">Path not found</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link to="/learn">Back to paths</Link>
        </Button>
      </div>
    );
  }

  const pickerLesson = path.modules
    .flatMap((mod) => mod.lessons)
    .find((lesson) => lesson.id === pickerLessonId);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
      <div>
        <Link
          to="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Learn paths
        </Link>

        <h1 className="text-2xl font-semibold text-foreground">{path.title}</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          /learn/{path.slug} · {path.totalModules} modules · {path.totalQuestions} questions
        </p>
      </div>

      <PublishPanel
        status={path.status}
        validation={validation}
        learners={impact?.learners}
        isPending={updatePath.isPending}
        onPublish={() =>
          updatePath.mutate(
            { status: "published" },
            {
              onSuccess: () => toast.success("Path published"),
            },
          )
        }
        onUnpublish={() =>
          updatePath.mutate(
            { status: "draft" },
            {
              onSuccess: () => toast.success("Path unpublished"),
            },
          )
        }
      />

      <div className="space-y-3">
        {path.modules.map((mod, moduleIndex) => (
          <ModuleRow
            key={mod.id}
            module={mod}
            index={moduleIndex}
            dragProps={moduleDrag.rowProps(mod.id, moduleIndex)}
            isDragging={moduleDrag.draggingId === mod.id}
            isExpanded={expandedModules.has(mod.id)}
            onToggle={() => toggle(expandedModules, mod.id, setExpandedModules)}
            onDelete={() =>
              m.deleteModule.mutate(mod.id, {
                onSuccess: () => toast.success("Module removed"),
              })
            }
            expandedLessons={expandedLessons}
            onToggleLesson={(lessonId) => toggle(expandedLessons, lessonId, setExpandedLessons)}
            newLessonTitle={newLessonTitle[mod.id] ?? ""}
            onNewLessonTitleChange={(value) =>
              setNewLessonTitle({ ...newLessonTitle, [mod.id]: value })
            }
            onAddLesson={() => {
              const title = (newLessonTitle[mod.id] ?? "").trim();
              if (!title) return;
              m.createLesson.mutate(
                { moduleId: mod.id, slug: slugify(title), title },
                {
                  onSuccess: () => {
                    setNewLessonTitle({ ...newLessonTitle, [mod.id]: "" });
                    toast.success("Lesson added");
                  },
                },
              );
            }}
            onDeleteLesson={(lessonId) =>
              m.deleteLesson.mutate(lessonId, {
                onSuccess: () => toast.success("Lesson removed"),
              })
            }
            onEditLesson={setEditingLesson}
            onAddQuestion={setPickerLessonId}
            onDetachQuestion={(questionId) =>
              m.detachQuestion.mutate(questionId, {
                onSuccess: () => toast.success("Question removed"),
              })
            }
            onReorderLesson={(lessonId, targetIndex) =>
              m.reorderLesson.mutate({ lessonId, targetIndex })
            }
            onReorderQuestion={(questionId, targetIndex) =>
              m.reorderQuestion.mutate({ questionId, targetIndex })
            }
          />
        ))}

        <div className="arena-card p-4 flex items-center gap-3">
          <Input
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addModule()}
            placeholder="New module title…"
            className="arena-input flex-1"
          />
          <Button onClick={addModule} disabled={!newModuleTitle.trim()} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            Add module
          </Button>
        </div>
      </div>

      <QuestionPicker
        open={pickerLessonId !== null}
        onClose={() => setPickerLessonId(null)}
        usedProblemIds={
          pickerLesson?.questions.map((q) => q.problemId).filter((id): id is number => id !== null) ?? []
        }
        usedMcqIds={
          pickerLesson?.questions.map((q) => q.mcqId).filter((id): id is number => id !== null) ?? []
        }
        onPickProblem={(problemId) =>
          pickerLessonId !== null &&
          m.attachQuestion.mutate(
            { lessonId: pickerLessonId, kind: "problem", problemId },
            { onSuccess: () => toast.success("Question added") },
          )
        }
        onPickMcq={(mcqId) =>
          pickerLessonId !== null &&
          m.attachQuestion.mutate(
            { lessonId: pickerLessonId, kind: "mcq", mcqId },
            { onSuccess: () => toast.success("Question added") },
          )
        }
      />

      <LessonEditor
        lesson={editingLesson}
        open={editingLesson !== null}
        onClose={() => setEditingLesson(null)}
        isSaving={m.updateLesson.isPending}
        onSave={(input) =>
          editingLesson &&
          m.updateLesson.mutate(
            { lessonId: editingLesson.id, ...input },
            { onSuccess: () => setEditingLesson(null) },
          )
        }
      />
    </motion.div>
  );

  function addModule() {
    const title = newModuleTitle.trim();
    if (!title) return;

    m.createModule.mutate(
      { slug: slugify(title), title },
      {
        onSuccess: () => {
          setNewModuleTitle("");
          toast.success("Module added");
        },
      },
    );
  }
};

// ---------------------------------------------------------------------------

interface ModuleRowProps {
  module: LearnModuleNode;
  index: number;
  dragProps: ReturnType<ReturnType<typeof useDragReorder>["rowProps"]>;
  isDragging: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  expandedLessons: Set<number>;
  onToggleLesson: (lessonId: number) => void;
  newLessonTitle: string;
  onNewLessonTitleChange: (value: string) => void;
  onAddLesson: () => void;
  onDeleteLesson: (lessonId: number) => void;
  onEditLesson: (lesson: LearnLessonNode) => void;
  onAddQuestion: (lessonId: number) => void;
  onDetachQuestion: (questionId: number) => void;
  onReorderLesson: (lessonId: number, targetIndex: number) => void;
  onReorderQuestion: (questionId: number, targetIndex: number) => void;
}

const ModuleRow = ({
  module: mod,
  dragProps,
  isDragging,
  isExpanded,
  onToggle,
  onDelete,
  expandedLessons,
  onToggleLesson,
  newLessonTitle,
  onNewLessonTitleChange,
  onAddLesson,
  onDeleteLesson,
  onEditLesson,
  onAddQuestion,
  onDetachQuestion,
  onReorderLesson,
  onReorderQuestion }: ModuleRowProps) => {
  const lessonDrag = useDragReorder(onReorderLesson);

  return (
    <div
      {...dragProps}
      className={cn(
        "arena-card overflow-hidden transition-opacity",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-center gap-2 p-4">
        <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab shrink-0" />

        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-medium text-foreground truncate">{mod.title}</span>
        </button>

        <Badge variant="secondary" className="text-xs shrink-0 font-mono">
          {mod.totalQuestions} questions
        </Badge>

        <button
          onClick={onDelete}
          title="Remove module"
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/20">
          {mod.lessons.map((lesson, lessonIndex) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              dragProps={lessonDrag.rowProps(lesson.id, lessonIndex)}
              isDragging={lessonDrag.draggingId === lesson.id}
              isExpanded={expandedLessons.has(lesson.id)}
              onToggle={() => onToggleLesson(lesson.id)}
              onEdit={() => onEditLesson(lesson)}
              onDelete={() => onDeleteLesson(lesson.id)}
              onAddQuestion={() => onAddQuestion(lesson.id)}
              onDetachQuestion={onDetachQuestion}
              onReorderQuestion={onReorderQuestion}
            />
          ))}

          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newLessonTitle}
              onChange={(e) => onNewLessonTitleChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAddLesson()}
              placeholder="New lesson title…"
              className="arena-input flex-1 h-9 text-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={onAddLesson}
              disabled={!newLessonTitle.trim()}
              className="gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Lesson
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

interface LessonRowProps {
  lesson: LearnLessonNode;
  dragProps: ReturnType<ReturnType<typeof useDragReorder>["rowProps"]>;
  isDragging: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddQuestion: () => void;
  onDetachQuestion: (questionId: number) => void;
  onReorderQuestion: (questionId: number, targetIndex: number) => void;
}

const LessonRow = ({
  lesson,
  dragProps,
  isDragging,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddQuestion,
  onDetachQuestion,
  onReorderQuestion }: LessonRowProps) => {
  const questionDrag = useDragReorder(onReorderQuestion);

  return (
    <div
      {...dragProps}
      className={cn(
        "rounded-lg border border-border bg-background transition-opacity",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 cursor-grab shrink-0" />

        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm text-foreground truncate">{lesson.title}</span>
          {lesson.body && (
            <FileText
              className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0"
              aria-label="Has lesson text"
            />
          )}
        </button>

        <span className="text-xs text-muted-foreground font-mono shrink-0">
          {lesson.totalQuestions}
        </span>

        <button
          onClick={onEdit}
          title="Edit lesson"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          title="Remove lesson"
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-border px-3 py-2 space-y-1">
          {lesson.questions.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              No questions yet. A lesson with no questions blocks publishing.
            </p>
          )}

          {lesson.questions.map((question, questionIndex) => {
            const isProblem = question.kind === "problem";
            const label = isProblem
              ? question.problem?.title ?? "(missing problem)"
              : question.mcq?.questionText ?? "(missing question)";
            const visibility = isProblem
              ? question.problem?.visibility
              : question.mcq?.visibility;

            return (
              <div
                key={question.id}
                {...questionDrag.rowProps(question.id, questionIndex)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 group transition-opacity",
                  questionDrag.draggingId === question.id && "opacity-40",
                )}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground/30 cursor-grab shrink-0" />

                {isProblem ? (
                  <Code className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}

                <span className="text-sm text-foreground/90 truncate flex-1">{label}</span>

                {isProblem && question.problem && (
                  <Badge variant="secondary" className="text-xs capitalize shrink-0">
                    {question.problem.difficulty}
                  </Badge>
                )}

                {/* Publishing requires public; flagging it here saves a
                    round-trip through the publish panel to find out. */}
                {visibility && visibility !== "public" && (
                  <Badge
                    variant="outline"
                    className="text-xs shrink-0 border-amber-500/30 text-amber-400"
                  >
                    {visibility === "draft" ? "Draft" : "Contest only"}
                  </Badge>
                )}

                <button
                  onClick={() => onDetachQuestion(question.id)}
                  title="Remove question"
                  className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          <Button
            size="sm"
            variant="ghost"
            onClick={onAddQuestion}
            className="gap-1.5 w-full justify-start text-muted-foreground hover:text-foreground mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add question
          </Button>
        </div>
      )}
    </div>
  );
};

export default LearnPathBuilder;
