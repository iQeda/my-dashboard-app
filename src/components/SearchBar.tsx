import { useEffect, useRef } from "react";
import type { SortOrder, TypeFilter } from "../hooks/useFilter";
import type { CardSize, ViewMode } from "../types";
import { useI18n } from "../i18n";

interface SearchBarProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly sortOrder: SortOrder;
  readonly onToggleSort: () => void;
  readonly cardSize: CardSize;
  readonly onCycleCardSize: () => void;
  readonly viewMode: ViewMode;
  readonly onToggleViewMode: () => void;
  readonly typeFilter: TypeFilter;
  readonly onCycleTypeFilter: () => void;
  readonly shortcutsDisabled?: boolean;
  readonly onOpenCommandPalette: () => void;
}

const SIZE_LABELS: Record<CardSize, string> = {
  sm: "S",
  md: "M",
  lg: "L",
};

export function SearchBar({ value, onChange, sortOrder, onToggleSort, cardSize, onCycleCardSize, viewMode, onToggleViewMode, typeFilter, onCycleTypeFilter, shortcutsDisabled, onOpenCommandPalette }: SearchBarProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  const SORT_LABELS: Record<SortOrder, string> = {
    asc: t("sort_asc"),
    desc: t("sort_desc"),
  };

  const TYPE_LABELS: Record<TypeFilter, string> = {
    all: t("type_all"),
    app: t("app"),
    url: t("web"),
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shortcutsDisabled) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenCommandPalette();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        onChange("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChange, shortcutsDisabled, onOpenCommandPalette]);

  return (
    <div className="flex gap-2 flex-1">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("search_placeholder")}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/60 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
        />
      </div>
      <button
        onClick={onToggleViewMode}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 bg-white/60 dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
        title={viewMode === "card" ? "Switch to list view" : "Switch to card view"}
      >
        {viewMode === "card" ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        )}
      </button>
      {viewMode === "card" && (
        <button
          onClick={onCycleCardSize}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 bg-white/60 dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
          title={`Card size: ${SIZE_LABELS[cardSize]}`}
        >
          {SIZE_LABELS[cardSize]}
        </button>
      )}
      <button
        onClick={onToggleSort}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 bg-white/60 dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
        title={`Sort: ${SORT_LABELS[sortOrder]}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {sortOrder === "desc" ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4 4m0 0l4-4m-4 4V4" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4-4m0 0l4 4m-4-4v12" />
          )}
        </svg>
        {SORT_LABELS[sortOrder]}
      </button>
      <button
        onClick={onCycleTypeFilter}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 ${
          typeFilter !== "all"
            ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300"
            : "bg-white/60 dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
        }`}
        title={`Type: ${TYPE_LABELS[typeFilter]}`}
      >
        {TYPE_LABELS[typeFilter]}
      </button>
    </div>
  );
}
