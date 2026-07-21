import { useCallback, useState } from "react";

/**
 * Native HTML5 drag-reorder for a single list.
 *
 * No drag library: `CreateQuestion.tsx` already reorders MCQ options this way,
 * and matching the existing pattern beats adding a dependency for three lists.
 *
 * The commit contract matches the server's (§5.9): report the item and the
 * index it should occupy, and let the server work out the order value. The
 * browser never computes order numbers — two curators dragging at once would
 * compute the same one.
 */
export const useDragReorder = (
  onCommit: (id: number, targetIndex: number) => void,
) => {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const onDragStart = useCallback((e: React.DragEvent, id: number) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    // Firefox refuses to start a drag without data set.
    e.dataTransfer.setData("text/plain", String(id));
    e.stopPropagation();
  }, []);

  const onDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (draggingId === null) return;
      // Nested lists: without this a question drag also bubbles to its lesson
      // and module rows, and every level tries to reorder at once.
      e.preventDefault();
      e.stopPropagation();
      setOverIndex(index);
    },
    [draggingId],
  );

  const onDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      if (draggingId === null) return;
      e.preventDefault();
      e.stopPropagation();
      onCommit(draggingId, index);
      setDraggingId(null);
      setOverIndex(null);
    },
    [draggingId, onCommit],
  );

  const onDragEnd = useCallback(() => {
    setDraggingId(null);
    setOverIndex(null);
  }, []);

  /** Props for a row; spread onto the element that should be draggable. */
  const rowProps = useCallback(
    (id: number, index: number) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => onDragStart(e, id),
      onDragOver: (e: React.DragEvent) => onDragOver(e, index),
      onDrop: (e: React.DragEvent) => onDrop(e, index),
      onDragEnd,
    }),
    [onDragStart, onDragOver, onDrop, onDragEnd],
  );

  return { draggingId, overIndex, rowProps };
};
