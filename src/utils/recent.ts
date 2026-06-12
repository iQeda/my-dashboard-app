import type { DashboardItem, RecentAccessEntry } from "../types";

// recentAccess の ID 列を現存アイテムに解決する単一ソース
// （CommandPalette の Recent タブと DashboardOverview の Recent セクションで共用）
export function resolveRecentItems(
  items: readonly DashboardItem[],
  recentAccess: readonly RecentAccessEntry[],
): readonly DashboardItem[] {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  return recentAccess
    .map((e) => itemMap.get(e.id))
    .filter((i): i is DashboardItem => i !== undefined);
}
