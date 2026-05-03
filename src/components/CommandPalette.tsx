import { useState, useEffect, useRef, useCallback } from "react";
import type { DashboardItem, TagDef, Category, RecentAccessEntry } from "../types";
import { useI18n } from "../i18n";

interface CommandPaletteProps {
  readonly items: readonly DashboardItem[];
  readonly tagDefs: readonly TagDef[];
  readonly categoryList: readonly Category[];
  readonly recentAccess: readonly RecentAccessEntry[];
  readonly onToggleTag: (tagId: string) => void;
  readonly onToggleCategory: (catId: string) => void;
  readonly onLaunch: (item: DashboardItem) => void;
  readonly onOpenAll: (items: readonly DashboardItem[]) => void;
  readonly onEdit: (item: DashboardItem) => void;
  readonly onClose: () => void;
}

type Tab = "all" | "recent";

const DEFAULT_ICONS: Record<string, string> = {
  app: "\uD83D\uDDA5\uFE0F",
  url: "\uD83C\uDF10",
};

export function CommandPalette({ items, tagDefs, categoryList, recentAccess, onToggleTag, onToggleCategory, onLaunch, onOpenAll, onEdit, onClose }: CommandPaletteProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  useEffect(() => {
    setSelectedIndex(0);
  }, [activeTab, query]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const lastCompositionEndAtRef = useRef(0);

  type Result =
    | { kind: "item"; data: DashboardItem }
    | { kind: "tag"; data: TagDef }
    | { kind: "category"; data: Category };

  const results: Result[] = (() => {
    if (activeTab === "recent") {
      const itemMap = new Map(items.map((i) => [i.id, i]));
      return recentAccess
        .map((e) => itemMap.get(e.id))
        .filter((i): i is DashboardItem => i !== undefined)
        .map((data) => ({ kind: "item" as const, data }));
    }
    const q = query.toLowerCase();
    const matchedCategories: Result[] = categoryList
      .filter((c) => c.label.toLowerCase().includes(q))
      .map((data) => ({ kind: "category", data }));
    const matchedTags: Result[] = tagDefs
      .filter((c) => c.label.toLowerCase().includes(q))
      .map((data) => ({ kind: "tag", data }));
    const matchedItems: Result[] = items
      .filter((i) => i.name.toLowerCase().includes(q))
      .map((data) => ({ kind: "item", data }));
    return [...matchedCategories, ...matchedTags, ...matchedItems];
  })();


  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const executeResult = useCallback(
    async (result: Result) => {
      if (result.kind === "item") {
        onLaunch(result.data as DashboardItem);
      } else if (result.kind === "tag") {
        onToggleTag(result.data.id);
      } else {
        onToggleCategory(result.data.id);
      }
      onClose();
    },
    [onToggleTag, onToggleCategory, onLaunch, onClose],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      setActiveTab(activeTab === "all" ? "recent" : "all");
    } else if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      if (
        isComposingRef.current ||
        e.nativeEvent.isComposing ||
        e.keyCode === 229 ||
        Date.now() - lastCompositionEndAtRef.current < 200
      ) return;
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
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
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={() => { isComposingRef.current = false; lastCompositionEndAtRef.current = Date.now(); }}
            placeholder={t("search_items_tags")}
            className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700">
            ESC
          </kbd>
        </div>

        <div className="flex items-center gap-1 px-2 pt-2 border-b border-gray-100 dark:border-gray-700">
          {(["all", "recent"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t cursor-pointer transition-colors ${
                activeTab === tab
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 -mb-px"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {t(tab === "all" ? "all_items" : "recent")}
            </button>
          ))}
          <span className="ml-auto pr-2 text-[10px] text-gray-400 dark:text-gray-500">
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">Tab</kbd>
          </span>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto overscroll-contain">
          {results.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">{t("no_results")}</p>
          )}
          {results.map((result, i) => {
            const isSelected = i === selectedIndex;
            if (result.kind === "category") {
              const cat = result.data;
              const targets = items.filter((it) => it.category === cat.id && !it.excludeFromOpenAll);
              return (
                <div
                  key={`cat-${cat.id}`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                    isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""
                  }`}
                >
                  <button
                    onClick={() => executeResult(result)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <svg className="w-3 h-3 shrink-0 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                    <span className="flex-1 text-gray-800 dark:text-gray-200">{cat.label}</span>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">{t("category")}</span>
                  </button>
                  {targets.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenAll(targets); onClose(); }}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer shrink-0"
                      title={`${t("open_all")} (${targets.length})`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {targets.length}
                    </button>
                  )}
                </div>
              );
            }
            if (result.kind === "tag") {
              const cat = result.data;
              const targets = items.filter((it) => it.tags.includes(cat.id) && !it.excludeFromOpenAll);
              return (
                <div
                  key={`tag-${cat.id}`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                    isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""
                  }`}
                >
                  <button
                    onClick={() => executeResult(result)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 text-gray-800 dark:text-gray-200">{cat.label}</span>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">Workspace</span>
                  </button>
                  {targets.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenAll(targets); onClose(); }}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer shrink-0"
                      title={`${t("open_all")} (${targets.length})`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {targets.length}
                    </button>
                  )}
                </div>
              );
            }
            const item = result.data;
            return (
              <div
                key={`item-${item.id}`}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                  isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""
                }`}
              >
                <button
                  onClick={() => executeResult(result)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                >
                  <span className="text-lg shrink-0">{item.icon ?? DEFAULT_ICONS[item.type] ?? "\uD83D\uDCE6"}</span>
                  <span className="flex-1 text-gray-800 dark:text-gray-200 truncate">{item.name}</span>
                  <span className={`text-[10px] font-bold uppercase shrink-0 ${
                    item.type === "app"
                      ? "text-blue-400 dark:text-blue-500"
                      : "text-emerald-400 dark:text-emerald-500"
                  }`}>
                    {item.type === "app" ? t("app") : t("web")}
                  </span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(item); onClose(); }}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title={t("edit")}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
