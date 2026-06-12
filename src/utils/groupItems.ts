import type { DashboardItem, Category } from "../types";

export interface CategoryGroup {
  readonly categoryId: string;
  readonly items: readonly DashboardItem[];
}

// カテゴリグループ順序の単一ソース。
// App の displayItems（キーボードフォーカス順）と Dashboard の描画順は
// 必ずこの関数を使うこと。片方だけ別実装するとフォーカス移動順と表示順がズレる。
// 順序: categoryList の並び順 → 未分類 → 未知のカテゴリ ID（出現順）
export function groupItemsByCategory(
  items: readonly DashboardItem[],
  categoryList: readonly Category[],
): readonly CategoryGroup[] {
  if (!items.some((i) => i.category)) return [{ categoryId: "", items }];

  const groups = new Map<string, DashboardItem[]>();
  for (const item of items) {
    const catId = item.category ?? "";
    if (!groups.has(catId)) groups.set(catId, []);
    groups.get(catId)!.push(item);
  }

  const result: CategoryGroup[] = [];
  for (const cat of categoryList) {
    const groupItems = groups.get(cat.id);
    if (groupItems && groupItems.length > 0) {
      result.push({ categoryId: cat.id, items: groupItems });
      groups.delete(cat.id);
    }
  }
  const uncategorized = groups.get("");
  if (uncategorized && uncategorized.length > 0) {
    result.push({ categoryId: "", items: uncategorized });
  }
  for (const [catId, groupItems] of groups) {
    if (catId === "") continue;
    result.push({ categoryId: catId, items: groupItems });
  }
  return result;
}
