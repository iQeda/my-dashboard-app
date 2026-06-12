import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFilter } from "./useFilter";
import type { DashboardItem, Category, TagDef } from "../types";

const makeItem = (
  over: Partial<DashboardItem> & { readonly id: string; readonly name: string },
): DashboardItem => ({
  type: "app",
  target: over.name,
  tags: [],
  ...over,
});

const items: readonly DashboardItem[] = [
  makeItem({ id: "alpha", name: "Alpha", tags: ["work"], category: "dev", favorite: true }),
  makeItem({ id: "beta", name: "beta", type: "url", tags: ["play"] }),
  makeItem({ id: "gamma", name: "Gamma", tags: ["work", "play"] }),
  makeItem({ id: "delta", name: "Delta", type: "url", category: "media" }),
];

const categoryList: readonly Category[] = [
  { id: "dev", label: "Development" },
  { id: "media", label: "Media Things" },
];

const tagDefs: readonly TagDef[] = [
  { id: "work", label: "Work Stuff", color: "blue" },
  { id: "play", label: "Playtime", color: "red" },
];

const lookups = { categoryList, tagDefs };

function ids(result: { readonly filteredItems: readonly DashboardItem[] }): readonly string[] {
  return result.filteredItems.map((i) => i.id);
}

describe("useFilter (characterization)", () => {
  it("sorts ascending by name (case-insensitive) by default", () => {
    const { result } = renderHook(() => useFilter(items, undefined, lookups));
    expect(ids(result.current)).toEqual(["alpha", "beta", "delta", "gamma"]);
  });

  it("sorts descending after setSortOrder('desc')", () => {
    const { result } = renderHook(() => useFilter(items, undefined, lookups));
    act(() => result.current.setSortOrder("desc"));
    expect(ids(result.current)).toEqual(["gamma", "delta", "beta", "alpha"]);
  });

  it("matches search against item name, category label, and tag label", () => {
    const { result } = renderHook(() => useFilter(items, undefined, lookups));
    act(() => result.current.setSearchQuery("gam"));
    expect(ids(result.current)).toEqual(["gamma"]);
    act(() => result.current.setSearchQuery("development"));
    expect(ids(result.current)).toEqual(["alpha"]);
    act(() => result.current.setSearchQuery("playtime"));
    expect(ids(result.current)).toEqual(["beta", "gamma"]);
  });

  it("single-tag mode: toggling a tag selects it, toggling again clears, another tag replaces", () => {
    const { result } = renderHook(() => useFilter(items, undefined, lookups));
    act(() => result.current.toggleTag("work"));
    expect(ids(result.current)).toEqual(["alpha", "gamma"]);
    act(() => result.current.toggleTag("play"));
    expect(ids(result.current)).toEqual(["beta", "gamma"]);
    act(() => result.current.toggleTag("play"));
    expect(ids(result.current)).toEqual(["alpha", "beta", "delta", "gamma"]);
  });

  it("exclusive filter (default): selecting a tag clears the category and vice versa", () => {
    const { result } = renderHook(() => useFilter(items, undefined, lookups));
    act(() => result.current.toggleCategory("dev"));
    expect(result.current.selectedCategory).toBe("dev");
    act(() => result.current.toggleTag("play"));
    expect(result.current.selectedCategory).toBeNull();
    expect(ids(result.current)).toEqual(["beta", "gamma"]);
    act(() => result.current.toggleCategory("dev"));
    expect(result.current.selectedTags.size).toBe(0);
    expect(ids(result.current)).toEqual(["alpha"]);
  });

  it("combined filter (initialPrefs): tag selection keeps the category (AND)", () => {
    const { result } = renderHook(() =>
      useFilter(items, { combinedFilter: true }, lookups),
    );
    act(() => result.current.toggleCategory("dev"));
    act(() => result.current.toggleTag("work"));
    expect(result.current.selectedCategory).toBe("dev");
    expect(ids(result.current)).toEqual(["alpha"]);
  });

  it("multiTagMode (initialPrefs): selected tags combine with AND", () => {
    const { result } = renderHook(() =>
      useFilter(items, { multiTagMode: true }, lookups),
    );
    act(() => result.current.toggleTag("work"));
    act(() => result.current.toggleTag("play"));
    expect(ids(result.current)).toEqual(["gamma"]);
    // deselect one keeps the other
    act(() => result.current.toggleTag("play"));
    expect(ids(result.current)).toEqual(["alpha", "gamma"]);
  });

  it("empty-string category selects uncategorized items only", () => {
    const { result } = renderHook(() => useFilter(items, undefined, lookups));
    act(() => result.current.toggleCategory(""));
    expect(ids(result.current)).toEqual(["beta", "gamma"]);
  });

  it("favorites filter shows favorites only and clears tag/category", () => {
    const { result } = renderHook(() => useFilter(items, undefined, lookups));
    act(() => result.current.toggleTag("play"));
    act(() => result.current.toggleFavoritesFilter());
    expect(result.current.selectedTags.size).toBe(0);
    expect(ids(result.current)).toEqual(["alpha"]);
  });

  it("type filter cycles all -> app -> url -> all", () => {
    const { result } = renderHook(() => useFilter(items, undefined, lookups));
    act(() => result.current.cycleTypeFilter());
    expect(result.current.typeFilter).toBe("app");
    expect(ids(result.current)).toEqual(["alpha", "gamma"]);
    act(() => result.current.cycleTypeFilter());
    expect(result.current.typeFilter).toBe("url");
    expect(ids(result.current)).toEqual(["beta", "delta"]);
    act(() => result.current.cycleTypeFilter());
    expect(result.current.typeFilter).toBe("all");
  });

  it("clearFilters resets tags, category, search, sort, favorites, and type", () => {
    const { result } = renderHook(() => useFilter(items, undefined, lookups));
    act(() => {
      result.current.toggleTag("work");
      result.current.setSearchQuery("a");
      result.current.setSortOrder("desc");
      result.current.setTypeFilter("url");
    });
    act(() => result.current.clearFilters());
    expect(result.current.selectedTags.size).toBe(0);
    expect(result.current.selectedCategory).toBeNull();
    expect(result.current.searchQuery).toBe("");
    expect(result.current.sortOrder).toBe("asc");
    expect(result.current.typeFilter).toBe("all");
    expect(ids(result.current)).toEqual(["alpha", "beta", "delta", "gamma"]);
  });
});
