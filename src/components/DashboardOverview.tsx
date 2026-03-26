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
  readonly onDuplicate: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

export function DashboardOverview({ items, tagDefs, categoryList, recentAccess, onSelectTag, onSelectCategory, onSelectFavorites, onLaunchItem, onEdit, onToggleFavorite, onDuplicate, onDelete }: DashboardOverviewProps) {
  const { t } = useI18n();

  const categorizedGroups = categoryList.map((cat) => ({
    category: cat,
    count: items.filter((i) => i.category === cat.id).length,
  }));
  const uncategorizedCount = items.filter((i) => !i.category).length;

  const tagGroups = tagDefs.map((tag) => ({
    tag,
    count: items.filter((i) => i.tags.includes(tag.id)).length,
  }));

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
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onLaunch={onLaunchItem}
                onToggleTag={onSelectTag}
              />
            ))}
          </div>
        </section>
      )}

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
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 dark:bg-white/8 border border-gray-200 dark:border-white/10 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-500/40 transition-all cursor-pointer"
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 dark:bg-white/8 border border-gray-200 dark:border-white/10 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500/40 transition-all cursor-pointer"
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
        <div className="flex flex-wrap gap-2">
          {tagGroups.map(({ tag, count }) => (
            <button
              key={tag.id}
              onClick={() => onSelectTag(tag.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 dark:bg-white/8 border border-gray-200 dark:border-white/10 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/40 transition-all cursor-pointer"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tag.label}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{count}</span>
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
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onLaunch={onLaunchItem}
                onToggleTag={onSelectTag}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
