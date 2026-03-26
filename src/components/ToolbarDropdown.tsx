import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ToolbarDropdownProps {
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onClose: () => void;
  readonly isActive?: boolean;
  readonly children: React.ReactNode;
}

export function ToolbarDropdown({ label, icon, isOpen, onToggle, onClose, isActive, children }: ToolbarDropdownProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  const rect = btnRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={btnRef}
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 ${
          isActive
            ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300"
            : "bg-white/60 dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
        }`}
      >
        {icon}
        {label}
        <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && rect && createPortal(
        <div
          ref={popRef}
          className="fixed z-50 min-w-[160px] rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-white/10 py-1"
          style={{ top: rect.bottom + 6, left: rect.left }}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}

interface DropdownItemProps {
  readonly label: string;
  readonly isSelected: boolean;
  readonly onClick: () => void;
}

export function DropdownItem({ label, isSelected, onClick }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer ${
        isSelected
          ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
      }`}
    >
      <svg className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {label}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="border-t border-gray-100 dark:border-gray-700 my-1" />;
}

export function DropdownLabel({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="block px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {children}
    </span>
  );
}
