import { useState, useRef, useCallback } from "react";

interface UsePointerReorderOptions<T> {
  readonly items: readonly T[];
  readonly onReorder: (items: readonly T[]) => void;
}

// Pointer Events によるリスト並べ替え（SKILL.md #4: HTML5 DnD は WKWebView で
// 動作しないため Pointer Events を使う。この方式はフック内部にそのまま保存）。
// 5px 閾値 + setPointerCapture + 中点スキャン + didMove によるクリック抑止。
export function usePointerReorder<T>({ items, onReorder }: UsePointerReorderOptions<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const didMove = useRef(false);
  const refs = useRef<(HTMLElement | null)[]>([]);

  const handlePointerDown = useCallback((e: React.PointerEvent, i: number) => {
    isDragging.current = false;
    didMove.current = false;
    startY.current = e.clientY;
    setDragIndex(i);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIndex === null) return;
    if (!isDragging.current) {
      if (Math.abs(e.clientY - startY.current) < 5) return;
      isDragging.current = true;
      didMove.current = true;
    }
    let closest = dragIndex, closestDist = Infinity;
    refs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const d = Math.abs(e.clientY - (rect.top + rect.height / 2));
      if (d < closestDist) { closestDist = d; closest = i; }
    });
    setOverIndex(closest);
  }, [dragIndex]);

  const handlePointerUp = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex && didMove.current) {
      const reordered = [...items];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(overIndex, 0, moved);
      onReorder(reordered);
    }
    isDragging.current = false;
    didMove.current = false;
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, items, onReorder]);

  // ドラッグ直後の click を抑止するガード（didMove はドラッグ確定時のみ true）
  const clickGuard = useCallback((fn: () => void) => {
    if (!didMove.current) fn();
  }, []);

  const setItemRef = useCallback((i: number) => (el: HTMLElement | null) => {
    refs.current[i] = el;
  }, []);

  const isDragSource = (i: number) => isDragging.current && dragIndex === i;
  const isDropTarget = (i: number) => isDragging.current && overIndex === i && dragIndex !== i;

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clickGuard,
    setItemRef,
    isDragSource,
    isDropTarget,
  } as const;
}
