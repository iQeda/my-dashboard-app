import { useMemo } from "react";
import type { DashboardItem, TagDef, Category, CardSize, ViewMode } from "../types";
import { ItemCard } from "./ItemCard";
import { ItemRow } from "./ItemRow";
import { useI18n } from "../i18n";

interface DashboardProps {
  readonly items: readonly DashboardItem[];
  readonly tagDefs: readonly TagDef[];
  readonly categoryList: readonly Category[];
  readonly cardSize: CardSize;
  readonly viewMode: ViewMode;
  readonly onEdit: (item: DashboardItem) => void;
  readonly onToggleFavorite: (id: string) => void;
  readonly onDuplicate: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onLaunch: (item: DashboardItem) => void;
  readonly onSelect?: (item: DashboardItem) => void;
  readonly onToggleTag?: (tagId: string) => void;
  readonly onSelectCategory?: (categoryId: string) => void;
  readonly focusedItemId?: string;
  readonly onAdd: () => void;
}

const GRID_CLASS: Record<CardSize, string> = {
  sm: "grid-cols-[repeat(auto-fill,minmax(160px,1fr))] auto-rows-fr gap-3",
  md: "grid-cols-[repeat(auto-fill,minmax(240px,1fr))] auto-rows-fr gap-5",
  lg: "grid-cols-[repeat(auto-fill,minmax(320px,1fr))] auto-rows-fr gap-6",
};

const ADD_MIN_H: Record<CardSize, string> = {
  sm: "min-h-[100px]",
  md: "min-h-[160px]",
  lg: "min-h-[220px]",
};

interface GroupedItems {
  readonly categoryId: string;
  readonly label: string;
  readonly items: readonly DashboardItem[];
}

function useGroupedItems(items: readonly DashboardItem[], categoryList: readonly Category[], uncategorizedLabel: string): readonly GroupedItems[] {
  return useMemo(() => {
    const hasAnyCategory = items.some((i) => i.category);
    if (!hasAnyCategory) return [{ categoryId: "", label: "", items }];

    const catMap = new Map(categoryList.map((c) => [c.id, c.label]));
    const groups = new Map<string, DashboardItem[]>();

    for (const item of items) {
      const catId = item.category ?? "";
      if (!groups.has(catId)) groups.set(catId, []);
      groups.get(catId)!.push(item);
    }

    const result: GroupedItems[] = [];
    for (const cat of categoryList) {
      const groupItems = groups.get(cat.id);
      if (groupItems && groupItems.length > 0) {
        result.push({ categoryId: cat.id, label: cat.label, items: groupItems });
        groups.delete(cat.id);
      }
    }
    const uncategorized = groups.get("");
    if (uncategorized && uncategorized.length > 0) {
      result.push({ categoryId: "", label: uncategorizedLabel, items: uncategorized });
    }
    // Any remaining unknown category ids
    for (const [catId, groupItems] of groups) {
      if (catId === "") continue;
      result.push({ categoryId: catId, label: catMap.get(catId) ?? catId, items: groupItems });
    }

    return result;
  }, [items, categoryList, uncategorizedLabel]);
}

export function Dashboard({ items, tagDefs, categoryList, cardSize, viewMode, onEdit, onToggleFavorite, onDuplicate, onDelete, onLaunch, onSelect, onToggleTag, onSelectCategory, focusedItemId, onAdd }: DashboardProps) {
  const { t } = useI18n();
  const groups = useGroupedItems(items, categoryList, t("uncategorized"));
  const showHeaders = groups.length > 1 || (groups.length === 1 && groups[0].label !== "");

  if (viewMode === "list") {
    return (
      <div className="flex flex-col p-4 gap-0.5">
        {groups.map((group) => (
          <div key={group.categoryId || "_uncategorized"}>
            {showHeaders && (
              <div className="flex items-center gap-2 px-4 py-2 mt-2 first:mt-0">
                {group.categoryId && onSelectCategory ? (
                  <button
                    type="button"
                    onClick={() => onSelectCategory(group.categoryId)}
                    className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    {group.label}
                  </button>
                ) : (
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {group.label}
                  </span>
                )}
                <div className="flex-1 border-t border-gray-200 dark:border-white/10" />
              </div>
            )}
            {group.items.map((item) => (
              <ItemRow key={item.id} item={item} tagDefs={tagDefs} onEdit={onEdit} onToggleFavorite={onToggleFavorite} onDuplicate={onDuplicate} onDelete={onDelete} onLaunch={onLaunch} onSelect={onSelect} onToggleTag={onToggleTag} isFocused={item.id === focusedItemId} />
            ))}
          </div>
        ))}
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-gray-400 dark:text-gray-500 hover:bg-white/70 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          {t("add_item")}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.categoryId || "_uncategorized"}>
          {showHeaders && (
            <div className="flex items-center gap-2 mb-4">
              {group.categoryId && onSelectCategory ? (
                <button
                  type="button"
                  onClick={() => onSelectCategory(group.categoryId)}
                  className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {group.label}
                </button>
              ) : (
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {group.label}
                </span>
              )}
              <div className="flex-1 border-t border-gray-200 dark:border-white/10" />
            </div>
          )}
          <div className={`grid ${GRID_CLASS[cardSize]}`}>
            {group.items.map((item) => (
              <ItemCard key={item.id} item={item} tagDefs={tagDefs} cardSize={cardSize} onEdit={onEdit} onToggleFavorite={onToggleFavorite} onDuplicate={onDuplicate} onDelete={onDelete} onLaunch={onLaunch} onSelect={onSelect} onToggleTag={onToggleTag} isFocused={item.id === focusedItemId} />
            ))}
          </div>
        </div>
      ))}

      <div className={`grid ${GRID_CLASS[cardSize]}`}>
        <button
          onClick={onAdd}
          className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/15 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200 cursor-pointer ${ADD_MIN_H[cardSize]}`}
        >
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Add Item</span>
        </button>
      </div>
    </div>
  );
}
