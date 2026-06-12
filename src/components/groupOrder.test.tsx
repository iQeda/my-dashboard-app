import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGroupedItems } from "./Dashboard";
import { computeDisplayItems } from "../App";
import type { DashboardItem, Category } from "../types";

const makeItem = (
  id: string,
  category?: string,
): DashboardItem => ({ id, name: id, type: "app", target: id, tags: [], category });

const categoryList: readonly Category[] = [
  { id: "dev", label: "Development" },
  { id: "media", label: "Media" },
];

function groupedIds(
  items: readonly DashboardItem[],
  cats: readonly Category[],
): readonly string[] {
  const { result } = renderHook(() => useGroupedItems(items, cats, "Uncategorized"));
  return result.current.flatMap((g) => g.items.map((i) => i.id));
}

function displayIds(
  items: readonly DashboardItem[],
  cats: readonly Category[],
): readonly string[] {
  return computeDisplayItems(items, cats).map((i) => i.id);
}

// Phase 3 統合の事前条件: App.tsx の displayItems（キーボードフォーカス順）と
// Dashboard.tsx の useGroupedItems（描画順）が同一入力に対し同一順序を返すこと
describe("category group ordering: App.computeDisplayItems == Dashboard.useGroupedItems", () => {
  const scenarios: readonly { readonly name: string; readonly items: readonly DashboardItem[] }[] = [
    {
      name: "mixed: known categories + uncategorized + unknown category ids",
      items: [
        makeItem("u1"),
        makeItem("m1", "media"),
        makeItem("x1", "ghost"),
        makeItem("d1", "dev"),
        makeItem("u2"),
        makeItem("d2", "dev"),
        makeItem("y1", "phantom"),
      ],
    },
    { name: "no item has a category", items: [makeItem("b"), makeItem("a"), makeItem("c")] },
    { name: "all items in known categories", items: [makeItem("m1", "media"), makeItem("d1", "dev")] },
    { name: "only unknown categories", items: [makeItem("x1", "ghost"), makeItem("y1", "phantom")] },
    { name: "empty items", items: [] },
  ];

  for (const s of scenarios) {
    it(s.name, () => {
      expect(displayIds(s.items, categoryList)).toEqual(groupedIds(s.items, categoryList));
    });
  }

  it("characterizes the order: categoryList order, then uncategorized, then unknown ids in insertion order", () => {
    const items = [
      makeItem("u1"),
      makeItem("m1", "media"),
      makeItem("x1", "ghost"),
      makeItem("d1", "dev"),
      makeItem("u2"),
    ];
    expect(displayIds(items, categoryList)).toEqual(["d1", "m1", "u1", "u2", "x1"]);
  });
});
