import type { RefObject } from "react";
import { useI18n } from "../i18n";

interface SearchBarProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly onInputFocus?: () => void;
}

export function SearchBar({ value, onChange, inputRef, onInputFocus }: SearchBarProps) {
  const { t } = useI18n();

  return (
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
        onFocus={(e) => { onInputFocus?.(); const el = e.target; if (el.value) requestAnimationFrame(() => el.select()); }}
        placeholder={t("search_placeholder")}
        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/60 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
      />
    </div>
  );
}
