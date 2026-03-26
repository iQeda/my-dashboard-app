import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DashboardItem, TagDef } from "../types";
import { useI18n } from "../i18n";

interface CommandPaletteProps {
  readonly items: readonly DashboardItem[];
  readonly tagDefs: readonly TagDef[];
  readonly onToggleTag: (tagId: string) => void;
  readonly onClose: () => void;
}

const DEFAULT_ICONS: Record<string, string> = {
  app: "\uD83D\uDDA5\uFE0F",
  url: "\uD83C\uDF10",
};

export function CommandPalette({ items, tagDefs, onToggleTag, onClose }: CommandPaletteProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  type Result =
    | { kind: "item"; data: DashboardItem }
    | { kind: "tag"; data: TagDef };

  const results: Result[] = (() => {
    const q = query.toLowerCase();
    const matchedItems: Result[] = items
      .filter((i) => i.name.toLowerCase().includes(q))
      .map((data) => ({ kind: "item", data }));
    const matchedTags: Result[] = tagDefs
      .filter((c) => c.label.toLowerCase().includes(q))
      .map((data) => ({ kind: "tag", data }));
    return [...matchedTags, ...matchedItems];
  })();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const executeResult = useCallback(
    async (result: Result) => {
      if (result.kind === "item") {
        const item = result.data;
        try {
          if (item.type === "app") {
            await invoke("launch_app", { name: item.target });
          } else {
            await invoke("open_url", { url: item.target });
          }
        } catch (e) {
          console.error("Failed to launch:", e);
        }
      } else {
        onToggleTag(result.data.id);
      }
      onClose();
    },
    [onToggleTag, onClose],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      executeResult(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg mx-4 rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("search_items_tags")}
            className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto overscroll-contain">
          {results.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">{t("no_results")}</p>
          )}
          {results.map((result, i) => {
            const isSelected = i === selectedIndex;
            if (result.kind === "tag") {
              const cat = result.data;
              return (
                <button
                  key={`tag-${cat.id}`}
                  onClick={() => executeResult(result)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                    isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="flex-1 text-gray-800 dark:text-gray-200">{cat.label}</span>
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">Tag</span>
                </button>
              );
            }
            const item = result.data;
            return (
              <button
                key={`item-${item.id}`}
                onClick={() => executeResult(result)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                  isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""
                }`}
              >
                <span className="text-lg shrink-0">{item.icon ?? DEFAULT_ICONS[item.type] ?? "\uD83D\uDCE6"}</span>
                <span className="flex-1 text-gray-800 dark:text-gray-200">{item.name}</span>
                <span className={`text-[10px] font-bold uppercase ${
                  item.type === "app"
                    ? "text-blue-400 dark:text-blue-500"
                    : "text-emerald-400 dark:text-emerald-500"
                }`}>
                  {item.type === "app" ? t("app") : t("web")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
