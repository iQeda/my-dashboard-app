import { describe, it, expect } from "vitest";
import { groupItemsByCategory } from "./groupItems";
import type { DashboardItem, Category } from "../types";

const makeItem = (id: string, category?: string): DashboardItem => ({
  id,
  name: id,
  type: "app",
  target: id,
  tags: [],
  category,
});

const categoryList: readonly Category[] = [
  { id: "dev", label: "Development" },
  { id: "media", label: "Media" },
];

function flatIds(items: readonly DashboardItem[]): readonly string[] {
  return groupItemsByCategory(items, categoryList).flatMap((g) => g.items.map((i) => i.id));
}

// App の displayItems（キーボードフォーカス順）と Dashboard の描画順の単一ソース。
// 順序: categoryList の並び順 → 未分類 → 未知のカテゴリ ID（出現順）
describe("groupItemsByCategory", () => {
  it("orders: categoryList order, then uncategorized, then unknown ids in insertion order", () => {
    const items = [
      makeItem("u1"),
      makeItem("m1", "media"),
      makeItem("x1", "ghost"),
      makeItem("d1", "dev"),
      makeItem("u2"),
      makeItem("d2", "dev"),
      makeItem("y1", "phantom"),
    ];
    expect(flatIds(items)).toEqual(["d1", "d2", "m1", "u1", "u2", "x1", "y1"]);
    expect(groupItemsByCategory(items, categoryList).map((g) => g.categoryId)).toEqual([
      "dev",
      "media",
      "",
      "ghost",
      "phantom",
    ]);
  });

  it("returns a single unlabeled group when no item has a category", () => {
    const items = [makeItem("b"), makeItem("a"), makeItem("c")];
    const groups = groupItemsByCategory(items, categoryList);
    expect(groups).toHaveLength(1);
    expect(groups[0].categoryId).toBe("");
    expect(groups[0].items.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("returns a single empty group for empty items (Dashboard renders one empty group)", () => {
    const groups = groupItemsByCategory([], categoryList);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toEqual([]);
  });

  it("omits empty known-category groups and preserves item order within groups", () => {
    const items = [makeItem("m2", "media"), makeItem("m1", "media")];
    const groups = groupItemsByCategory(items, categoryList);
    expect(groups.map((g) => g.categoryId)).toEqual(["media"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["m2", "m1"]);
  });
});
