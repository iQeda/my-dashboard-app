import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { DashboardItem } from "../types";
import { useI18n } from "../i18n";

interface ContextMenuProps {
  readonly item: DashboardItem;
  readonly x: number;
  readonly y: number;
  readonly onEdit: () => void;
  readonly onDuplicate: () => void;
  readonly onToggleFavorite: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}

export function ContextMenu({ item, x, y, onEdit, onDuplicate, onToggleFavorite, onDelete, onClose }: ContextMenuProps) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menuRef.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menuRef.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  const btnClass = "flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer";

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: y, left: x }}
      className="z-[100] w-48 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-xl"
    >
      <button
        onClick={() => { onEdit(); onClose(); }}
        className={`${btnClass} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10`}
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        {t("edit")}
      </button>

      <button
        onClick={() => { onDuplicate(); onClose(); }}
        className={`${btnClass} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10`}
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {t("duplicate")}
      </button>

      <button
        onClick={() => { onToggleFavorite(); onClose(); }}
        className={`${btnClass} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10`}
      >
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill={item.favorite ? "currentColor" : "none"} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        {item.favorite ? t("unfavorite") : t("favorite")}
      </button>

      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

      <button
        onClick={() => { onDelete(); onClose(); }}
        className={`${btnClass} text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        {t("delete")}
      </button>
    </div>,
    document.body,
  );
}
