import { useState, useEffect, useRef, useCallback } from "react";
import type { DashboardItem, TagDef, Category, RecentAccessEntry } from "../types";
import { useI18n } from "../i18n";
import { itemIcon } from "../constants";
import { resolveRecentItems } from "../utils/recent";
import { BoltIcon, FolderIcon, PencilIcon } from "./icons";

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

type Result =
  | { kind: "item"; data: DashboardItem }
  | { kind: "tag"; data: TagDef }
  | { kind: "category"; data: Category };

// \u30AB\u30C6\u30B4\u30EA / \u30BF\u30B0\u884C\u306E Open All \u5BFE\u8C61\uFF08\u2318O \u3068 \u26A1 \u30DC\u30BF\u30F3\u3067\u5171\u7528\uFF09
function getOpenAllTargets(result: Result, items: readonly DashboardItem[]): readonly DashboardItem[] {
  if (result.kind === "category") {
    return items.filter((it) => it.category === result.data.id && !it.excludeFromOpenAll);
  }
  if (result.kind === "tag") {
    return items.filter((it) => it.tags.includes(result.data.id) && !it.excludeFromOpenAll);
  }
  return [];
}

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

  const results: Result[] = (() => {
    const q = query.toLowerCase();
    if (activeTab === "recent") {
      return resolveRecentItems(items, recentAccess)
        .filter((i) => i.name.toLowerCase().includes(q))
        .map((data) => ({ kind: "item" as const, data }));
    }
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
        onClose();
        return;
      }
      if (result.kind === "tag") {
        onToggleTag(result.data.id);
        onClose();
        return;
      }
      onToggleCategory(result.data.id);
      onClose();
    },
    [onToggleTag, onToggleCategory, onLaunch, onClose],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey && e.key === "o") {
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
      const r = results[selectedIndex];
      const targets = r ? getOpenAllTargets(r, items) : [];
      if (targets.length === 0) return;
      onOpenAll(targets);
      onClose();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      setActiveTab(activeTab === "all" ? "recent" : "all");
      return;
    }
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === "Enter" && results[selectedIndex]) {
      if (
        isComposingRef.current ||
        e.nativeEvent.isComposing ||
        e.keyCode === 229 ||
        Date.now() - lastCompositionEndAtRef.current < 200
      ) return;
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
      executeResult(results[selectedIndex]);
      return;
    }
    if (e.key === "Escape") {
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
              const targets = getOpenAllTargets(result, items);
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
                    <FolderIcon className="w-3 h-3 shrink-0 text-purple-500" />
                    <span className="flex-1 text-gray-800 dark:text-gray-200">{cat.label}</span>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">{t("category")}</span>
                  </button>
                  {targets.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenAll(targets); onClose(); }}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer shrink-0"
                      title={`${t("open_all")} (${targets.length})`}
                    >
                      <BoltIcon className="w-3 h-3" />
                      {targets.length}
                    </button>
                  )}
                </div>
              );
            }
            if (result.kind === "tag") {
              const cat = result.data;
              const targets = getOpenAllTargets(result, items);
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
                      <BoltIcon className="w-3 h-3" />
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
                  <span className="text-lg shrink-0">{itemIcon(item)}</span>
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
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 px-3 py-2 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">↑</kbd>
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">↓</kbd>
            {t("navigate")}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">Enter</kbd>
            {t("select")}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">⌘O</kbd>
            {t("open_all")}
          </span>
        </div>
      </div>
    </div>
  );
}
