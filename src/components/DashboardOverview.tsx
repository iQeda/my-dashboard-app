import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { DashboardItem, TagDef, Category, RecentAccessEntry } from "../types";
import { ItemCard } from "./ItemCard";
import { useI18n } from "../i18n";

interface DashboardOverviewProps {
  readonly items: readonly DashboardItem[];
  readonly tagDefs: readonly TagDef[];
  readonly categoryList: readonly Category[];
  readonly recentAccess: readonly RecentAccessEntry[];
  readonly onSelectTag: (tagId: string) => void;
  readonly onSelectCategory: (catId: string) => void;
  readonly onSelectFavorites: () => void;
  readonly onLaunchItem: (item: DashboardItem) => void;
  readonly onEdit: (item: DashboardItem) => void;
  readonly onToggleFavorite: (id: string) => void;
  readonly onToggleCategoryPin?: (id: string) => void;
  readonly onToggleTagPin?: (id: string) => void;
  readonly pinnedOrder?: readonly string[];
}

type PinMenuState = { readonly kind: "category" | "tag"; readonly id: string; readonly pinned: boolean; readonly x: number; readonly y: number } | null;

function PinContextMenu({ state, onToggle, onClose }: { readonly state: NonNullable<PinMenuState>; readonly onToggle: () => void; readonly onClose: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  return createPortal(
    <div ref={ref} style={{ position: "fixed", top: state.y, left: state.x }} className="z-[100] w-36 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-xl">
      <button onClick={() => { onToggle(); onClose(); }} className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {state.pinned
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V5zm7 10v6m-3 0h6" />}
        </svg>
        {state.pinned ? t("unpin") : t("pin")}
      </button>
    </div>,
    document.body,
  );
}

export function DashboardOverview({ items, tagDefs, categoryList, recentAccess, onSelectTag, onSelectCategory, onSelectFavorites, onLaunchItem, onEdit, onToggleFavorite, onToggleCategoryPin, onToggleTagPin, pinnedOrder = [] }: DashboardOverviewProps) {
  const { t } = useI18n();

  const unpinnedCategories = categoryList.filter((c) => !c.pinned);
  const categorizedGroups = unpinnedCategories.map((cat) => ({
    category: cat,
    count: items.filter((i) => i.category === cat.id).length,
  }));
  const uncategorizedCount = items.filter((i) => !i.category).length;

  const unpinnedTags = tagDefs.filter((t) => !t.pinned);
  const tagGroups = unpinnedTags.map((tag) => ({
    tag,
    count: items.filter((i) => i.tags.includes(tag.id)).length,
  }));

  const [pinMenu, setPinMenu] = useState<PinMenuState>(null);

  const favoriteItems = items.filter((i) => i.favorite);

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const recentItems = recentAccess
    .map((e) => itemMap.get(e.id))
    .filter((i): i is DashboardItem => i !== undefined);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        {t("dashboard")}
      </h1>

      {/* Favorites */}
      {favoriteItems.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("favorites")}
            </h2>
            <button
              onClick={onSelectFavorites}
              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] auto-rows-fr gap-3">
            {favoriteItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                tagDefs={tagDefs}
                cardSize="sm"
                onEdit={onEdit}
                onToggleFavorite={onToggleFavorite}
                onLaunch={onLaunchItem}
                onToggleTag={onSelectTag}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pinned */}
      {(() => {
        const catMap = new Map(categoryList.filter((c) => c.pinned).map((c) => [c.id, c]));
        const tagMap = new Map(tagDefs.filter((t) => t.pinned).map((t) => [t.id, t]));
        type PEntry = { kind: "category"; cat: Category } | { kind: "tag"; tag: TagDef };
        const ordered: PEntry[] = [];
        for (const id of pinnedOrder) {
          const cat = catMap.get(id); if (cat) { ordered.push({ kind: "category", cat }); catMap.delete(id); continue; }
          const tag = tagMap.get(id); if (tag) { ordered.push({ kind: "tag", tag }); tagMap.delete(id); }
        }
        for (const cat of catMap.values()) ordered.push({ kind: "category", cat });
        for (const tag of tagMap.values()) ordered.push({ kind: "tag", tag });
        if (ordered.length === 0) return null;
        return (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
              {t("pinned")}
            </h2>
            <div className="flex flex-wrap gap-3">
              {ordered.map((entry) => {
                if (entry.kind === "category") {
                  const count = items.filter((i) => i.category === entry.cat.id).length;
                  return (
                    <button key={entry.cat.id} onClick={() => onSelectCategory(entry.cat.id)}
                      onContextMenu={(e) => { e.preventDefault(); setPinMenu({ kind: "category", id: entry.cat.id, pinned: true, x: e.clientX, y: e.clientY }); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 dark:bg-white/8 border border-gray-200 dark:border-white/10 hover:shadow-md hover:scale-[1.03] hover:border-blue-300 dark:hover:border-blue-500/40 transition-all cursor-pointer">
                      <svg className="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{entry.cat.label}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{count}</span>
                    </button>
                  );
                }
                const count = items.filter((i) => i.tags.includes(entry.tag.id)).length;
                return (
                  <button key={entry.tag.id} onClick={() => onSelectTag(entry.tag.id)}
                    onContextMenu={(e) => { e.preventDefault(); setPinMenu({ kind: "tag", id: entry.tag.id, pinned: true, x: e.clientX, y: e.clientY }); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 dark:bg-white/8 border border-gray-200 dark:border-white/10 hover:shadow-md hover:scale-[1.03] hover:border-blue-300 dark:hover:border-blue-500/40 transition-all cursor-pointer">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.tag.color }} />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{entry.tag.label}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{count}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Categories */}
      {categoryList.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            {t("categories")}
          </h2>
          <div className="flex flex-wrap gap-3">
            {categorizedGroups.map(({ category, count }) => (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                onContextMenu={(e) => { e.preventDefault(); setPinMenu({ kind: "category", id: category.id, pinned: false, x: e.clientX, y: e.clientY }); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 dark:bg-white/8 border border-gray-200 dark:border-white/10 hover:shadow-md hover:scale-[1.03] hover:border-blue-300 dark:hover:border-blue-500/40 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{category.label}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{count}</span>
              </button>
            ))}

            {uncategorizedCount > 0 && (
              <button
                onClick={() => onSelectCategory("")}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 dark:bg-white/8 border border-gray-200 dark:border-white/10 hover:shadow-md hover:scale-[1.03] hover:border-blue-300 dark:hover:border-blue-500/40 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                </svg>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t("uncategorized")}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{uncategorizedCount}</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Tags */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
          {t("tags")}
        </h2>
        <div className="flex flex-wrap gap-3">
          {tagGroups.map(({ tag, count }) => (
            <button
              key={tag.id}
              onClick={() => onSelectTag(tag.id)}
              onContextMenu={(e) => { e.preventDefault(); setPinMenu({ kind: "tag", id: tag.id, pinned: false, x: e.clientX, y: e.clientY }); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 dark:bg-white/8 border border-gray-200 dark:border-white/10 hover:shadow-md hover:scale-[1.03] hover:border-blue-300 dark:hover:border-blue-500/40 transition-all cursor-pointer"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tag.label}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent */}
      {recentItems.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            {t("recent")}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] auto-rows-fr gap-3">
            {recentItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                tagDefs={tagDefs}
                cardSize="sm"
                onEdit={onEdit}
                onToggleFavorite={onToggleFavorite}
                onLaunch={onLaunchItem}
                onToggleTag={onSelectTag}
              />
            ))}
          </div>
        </section>
      )}

      {pinMenu && (
        <PinContextMenu
          state={pinMenu}
          onToggle={() => {
            if (pinMenu.kind === "category") onToggleCategoryPin?.(pinMenu.id);
            else onToggleTagPin?.(pinMenu.id);
          }}
          onClose={() => setPinMenu(null)}
        />
      )}
    </div>
  );
}
