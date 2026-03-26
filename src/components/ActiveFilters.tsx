import type { TagDef, Category } from "../types";
import type { TypeFilter } from "../hooks/useFilter";
import { useI18n } from "../i18n";

interface ActiveFiltersProps {
  readonly selectedTags: ReadonlySet<string>;
  readonly selectedCategory: string | null;
  readonly showFavoritesOnly: boolean;
  readonly typeFilter: TypeFilter;
  readonly tagDefs: readonly TagDef[];
  readonly categoryList: readonly Category[];
  readonly onToggleTag: (id: string) => void;
  readonly onToggleCategory: (id: string) => void;
  readonly onToggleFavoritesFilter: () => void;
  readonly onCycleTypeFilter: () => void;
  readonly onClearAll: () => void;
}

export function ActiveFilters({
  selectedTags,
  selectedCategory,
  showFavoritesOnly,
  typeFilter,
  tagDefs,
  categoryList,
  onToggleTag,
  onToggleCategory,
  onToggleFavoritesFilter,
  onCycleTypeFilter,
  onClearAll,
}: ActiveFiltersProps) {
  const { t } = useI18n();
  const hasFilters = selectedTags.size > 0 || selectedCategory !== null || showFavoritesOnly || typeFilter !== "all";
  if (!hasFilters) return null;

  const selectedTagDefs = tagDefs.filter((t) => selectedTags.has(t.id));
  const selectedCat = categoryList.find((c) => c.id === selectedCategory);

  return (
    <div className="flex flex-wrap gap-1.5 px-4 pt-2">
      <button
        onClick={onClearAll}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      >
        {t("clear_all")}
      </button>
      {showFavoritesOnly && (
        <button
          onClick={onToggleFavoritesFilter}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {t("favorites")}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {selectedCat && (
        <button
          onClick={() => onToggleCategory(selectedCat.id)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {selectedCat.label}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {selectedTagDefs.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onToggleTag(tag.id)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: tag.color }}
        >
          {tag.label}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}
      {typeFilter !== "all" && (
        <button
          onClick={onCycleTypeFilter}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {typeFilter === "app" ? t("app") : t("web")}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
