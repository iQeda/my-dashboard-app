import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useDismiss } from "../hooks/useDismiss";
import { useI18n } from "../i18n";

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

// Pin/Unpin メニュー行（SidebarContextMenu / PinContextMenu で共用）
export function PinToggleMenuItem({ isPinned, onToggle, onClose }: {
  readonly isPinned: boolean;
  readonly onToggle: () => void;
  readonly onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      onClick={() => { onToggle(); onClose(); }}
      className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
    >
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isPinned
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V5zm7 10v6m-3 0h6" />}
      </svg>
      {isPinned ? t("unpin") : t("pin")}
    </button>
  );
}
