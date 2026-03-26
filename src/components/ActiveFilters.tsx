import type { TagDef, Category } from "../types";
import type { TypeFilter } from "../hooks/useFilter";
import { useI18n } from "../i18n";

interface ActiveFiltersProps {
  readonly selectedTags: ReadonlySet<string>;
  readonly selectedCategory: string | null;
  readonly showFavoritesOnly: boolean;
  readonly typeFilter: TypeFilter;
  readonly combinedFilter: boolean;
  readonly multiTagMode: boolean;
  readonly tagDefs: readonly TagDef[];
  readonly categoryList: readonly Category[];
  readonly onToggleTag: (id: string) => void;
  readonly onToggleCategory: (id: string) => void;
  readonly onToggleFavoritesFilter: () => void;
  readonly onCycleTypeFilter: () => void;
  readonly onToggleCombinedFilter: () => void;
  readonly onToggleMultiTagMode: () => void;
  readonly onClearAll: () => void;
}

export function ActiveFilters({
  selectedTags,
  selectedCategory,
  showFavoritesOnly,
  typeFilter,
  combinedFilter,
  multiTagMode,
  tagDefs,
  categoryList,
  onToggleTag,
  onToggleCategory,
  onToggleFavoritesFilter,
  onCycleTypeFilter,
  onToggleCombinedFilter,
  onToggleMultiTagMode,
  onClearAll,
}: ActiveFiltersProps) {
  const { t } = useI18n();
  const hasFilters = selectedTags.size > 0 || selectedCategory !== null || showFavoritesOnly || typeFilter !== "all";
  if (!hasFilters) return null;

  const selectedTagDefs = tagDefs.filter((td) => selectedTags.has(td.id));
  const selectedCat = categoryList.find((c) => c.id === selectedCategory);

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pt-4">
      <button
        onClick={onClearAll}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      >
        {t("clear_all")}
      </button>

      {/* Filter mode toggles */}
      <button
        onClick={onToggleCombinedFilter}
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
          combinedFilter
            ? "bg-blue-500 text-white border-blue-500"
            : "text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 hover:border-gray-400"
        }`}
        title={combinedFilter ? "Category + Tag combined filter ON" : "Category + Tag combined filter OFF"}
      >
        {t("combined_filter")}
      </button>
      <button
        onClick={onToggleMultiTagMode}
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
          multiTagMode
            ? "bg-blue-500 text-white border-blue-500"
            : "text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 hover:border-gray-400"
        }`}
        title={multiTagMode ? "Multi-select ON (AND)" : "Multi-select OFF"}
      >
        {t("multi")}
      </button>

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

      {/* Active filter chips */}
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
