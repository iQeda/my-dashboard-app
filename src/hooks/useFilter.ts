import { useState, useMemo, useCallback } from "react";
import type { DashboardItem, ItemType, Category, TagDef } from "../types";

export type SortOrder = "asc" | "desc";
export type TypeFilter = "all" | ItemType;

export function useFilter(items: readonly DashboardItem[], initialPrefs?: { combinedFilter?: boolean; multiTagMode?: boolean }, lookups?: { categoryList?: readonly Category[]; tagDefs?: readonly TagDef[] }) {
  const [selectedTags, setSelectedTags] = useState<ReadonlySet<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [multiTagMode, setMultiTagMode] = useState(initialPrefs?.multiTagMode ?? false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [combinedFilter, setCombinedFilter] = useState(initialPrefs?.combinedFilter ?? false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesTag =
        selectedTags.size === 0 ||
        (multiTagMode
          ? [...selectedTags].every((t) => item.tags.includes(t))
          : item.tags.some((t) => selectedTags.has(t)));
      const matchesCat =
        selectedCategory === null ||
        (selectedCategory === "" ? !item.category : item.category === selectedCategory);
      const q = searchQuery.toLowerCase();
      const catLabel = lookups?.categoryList?.find((c) => c.id === item.category)?.label ?? "";
      const tagLabels = item.tags.map((t) => lookups?.tagDefs?.find((td) => td.id === t)?.label ?? "").join(" ");
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(q) ||
        catLabel.toLowerCase().includes(q) ||
        tagLabels.toLowerCase().includes(q);
      const matchesFav = !showFavoritesOnly || item.favorite;
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      return matchesTag && matchesCat && matchesSearch && matchesFav && matchesType;
    });

    return [...filtered].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [items, selectedTags, selectedCategory, searchQuery, sortOrder, showFavoritesOnly, typeFilter, multiTagMode]);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTags((prev) => {
      if (multiTagMode) {
        const next = new Set(prev);
        if (next.has(tagId)) {
          next.delete(tagId);
        } else {
          next.add(tagId);
        }
        return next;
      }
      return prev.has(tagId) ? new Set() : new Set([tagId]);
    });
    if (!combinedFilter) setSelectedCategory(null);
    setShowFavoritesOnly(false);
  }, [multiTagMode, combinedFilter]);

  const toggleCategory = useCallback((catId: string) => {
    setSelectedCategory((prev) => (prev === catId ? null : catId));
    if (!combinedFilter) setSelectedTags(new Set());
  }, [combinedFilter]);

  const toggleCombinedFilter = useCallback(() => {
    setCombinedFilter((prev) => !prev);
  }, []);

  const toggleMultiTagMode = useCallback(() => {
    setMultiTagMode((prev) => !prev);
  }, []);

  const showAllItems = useCallback(() => {
    setSelectedTags(new Set());
    setSelectedCategory(null);
    setShowFavoritesOnly(false);
  }, []);

  const toggleFavoritesFilter = useCallback(() => {
    setShowFavoritesOnly((prev) => !prev);
    setSelectedTags(new Set());
    setSelectedCategory(null);
  }, []);

  const cycleTypeFilter = useCallback(() => {
    setTypeFilter((prev) => {
      if (prev === "all") return "app";
      if (prev === "app") return "url";
      return "all";
    });
  }, []);

  const cycleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags(new Set());
    setSelectedCategory(null);
    setSearchQuery("");
    setSortOrder("asc");
    setShowFavoritesOnly(false);
    setTypeFilter("all");
  }, []);

  return {
    selectedTags,
    selectedCategory,
    multiTagMode,
    searchQuery,
    sortOrder,
    showFavoritesOnly,
    filteredItems,
    toggleTag,
    toggleCategory,
    combinedFilter,
    toggleCombinedFilter,
    toggleMultiTagMode,
    typeFilter,
    showAllItems,
    toggleFavoritesFilter,
    cycleTypeFilter,
    setSearchQuery,
    cycleSortOrder,
    setSortOrder,
    setTypeFilter,
    clearFilters,
  };
}
