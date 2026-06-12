import { useState } from "react";
import type { DashboardItem, TagDef, Category, RecentAccessEntry } from "../types";
import { ItemCard } from "./ItemCard";
import { useI18n } from "../i18n";
import { getOrderedPinnedEntries } from "../utils/pinned";
import { MenuSurface, PinToggleMenuItem } from "./MenuSurface";
import { CategoryTagCard } from "./CategoryTagCard";
import { resolveRecentItems } from "../utils/recent";
import { FolderIcon } from "./icons";

interface DashboardOverviewProps {
  readonly items: readonly DashboardItem[];
  readonly tagDefs: readonly TagDef[];
  readonly categoryList: readonly Category[];
  readonly recentAccess: readonly RecentAccessEntry[];
  readonly onToggleTag: (tagId: string) => void;
  readonly onToggleCategory: (catId: string) => void;
  readonly onSelectFavorites: () => void;
  readonly onLaunch: (item: DashboardItem) => void;
  readonly onEdit: (item: DashboardItem) => void;
  readonly onToggleFavorite: (id: string) => void;
  readonly onToggleCategoryPin?: (id: string) => void;
  readonly onToggleTagPin?: (id: string) => void;
  readonly pinnedOrder?: readonly string[];
}

type PinMenuState = { readonly kind: "category" | "tag"; readonly id: string; readonly pinned: boolean; readonly x: number; readonly y: number } | null;

function PinContextMenu({ state, onToggle, onClose }: { readonly state: NonNullable<PinMenuState>; readonly onToggle: () => void; readonly onClose: () => void }) {
  return (
    <MenuSurface x={state.x} y={state.y} onClose={onClose} className="w-36">
      <PinToggleMenuItem isPinned={state.pinned} onToggle={onToggle} onClose={onClose} />
    </MenuSurface>
  );
}

export function DashboardOverview({ items, tagDefs, categoryList, recentAccess, onToggleTag, onToggleCategory, onSelectFavorites, onLaunch, onEdit, onToggleFavorite, onToggleCategoryPin, onToggleTagPin, pinnedOrder = [] }: DashboardOverviewProps) {
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

  const recentItems = resolveRecentItems(items, recentAccess);

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
                onLaunch={onLaunch}
                onToggleTag={onToggleTag}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pinned */}
      {(() => {
        const ordered = getOrderedPinnedEntries(categoryList, tagDefs, pinnedOrder);
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
                    <CategoryTagCard key={entry.cat.id} onClick={() => onToggleCategory(entry.cat.id)}
                      onContextMenu={(e) => { e.preventDefault(); setPinMenu({ kind: "category", id: entry.cat.id, pinned: true, x: e.clientX, y: e.clientY }); }}
                      icon={<FolderIcon className="w-4 h-4 text-purple-500 shrink-0" />}
                      label={entry.cat.label} count={count} />
                  );
                }
                const count = items.filter((i) => i.tags.includes(entry.tag.id)).length;
                return (
                  <CategoryTagCard key={entry.tag.id} onClick={() => onToggleTag(entry.tag.id)}
                    onContextMenu={(e) => { e.preventDefault(); setPinMenu({ kind: "tag", id: entry.tag.id, pinned: true, x: e.clientX, y: e.clientY }); }}
                    icon={<span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.tag.color }} />}
                    label={entry.tag.label} count={count} />
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
              <CategoryTagCard
                key={category.id}
                onClick={() => onToggleCategory(category.id)}
                onContextMenu={(e) => { e.preventDefault(); setPinMenu({ kind: "category", id: category.id, pinned: false, x: e.clientX, y: e.clientY }); }}
                icon={<FolderIcon className="w-4 h-4 text-purple-500 shrink-0" />}
                label={category.label}
                count={count}
              />
            ))}

            {uncategorizedCount > 0 && (
              <CategoryTagCard
                onClick={() => onToggleCategory("")}
                icon={
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                  </svg>
                }
                label={t("uncategorized")}
                count={uncategorizedCount}
              />
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
            <CategoryTagCard
              key={tag.id}
              onClick={() => onToggleTag(tag.id)}
              onContextMenu={(e) => { e.preventDefault(); setPinMenu({ kind: "tag", id: tag.id, pinned: false, x: e.clientX, y: e.clientY }); }}
              icon={<span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />}
              label={tag.label}
              count={count}
            />
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
                onLaunch={onLaunch}
                onToggleTag={onToggleTag}
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
