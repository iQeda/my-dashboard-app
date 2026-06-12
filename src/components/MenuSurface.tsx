import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useDismiss } from "../hooks/useDismiss";

interface MenuSurfaceProps {
  readonly x: number;
  readonly y: number;
  readonly onClose: () => void;
  // 幅など追加クラス（例: "w-48"）
  readonly className?: string;
  readonly children: React.ReactNode;
}

// 右クリックメニュー共通サーフェス:
// createPortal + position:fixed + 画面端クランプ + outside-mousedown / Escape で閉じる
export function MenuSurface({ x, y, onClose, className, children }: MenuSurfaceProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss([ref], onClose);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      ref.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      ref.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: y, left: x }}
      className={`z-[100] py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-xl ${className ?? ""}`}
    >
      {children}
    </div>,
    document.body,
  );
}
