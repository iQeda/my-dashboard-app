import { useRef, useCallback } from "react";

// サイドバー幅の Pointer Events ドラッグリサイズ。
// 幅 state は useViewPrefs 側にあり、ドラッグ終了時に persist で保存する
export function useSidebarResize(
  sidebarWidth: number,
  setSidebarWidth: (width: number) => void,
  persist: (width: number) => void,
) {
  const resizing = useRef(false);

  const onResizeStart = useCallback((e: React.PointerEvent) => {
    resizing.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizing.current) return;
    const newWidth = Math.max(160, Math.min(400, e.clientX));
    setSidebarWidth(newWidth);
  }, [setSidebarWidth]);

  const onResizeEnd = useCallback(() => {
    if (!resizing.current) return;
    resizing.current = false;
    persist(sidebarWidth);
  }, [sidebarWidth, persist]);

  return { onResizeStart, onResizeMove, onResizeEnd } as const;
}
