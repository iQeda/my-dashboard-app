import type { DashboardItem, ItemType } from "./types";

export const DEFAULT_ICONS: Record<ItemType, string> = {
  app: "🖥️",
  url: "🌐",
};

// アイテム表示アイコンの fallback 規則の単一ソース
export function itemIcon(item: DashboardItem): string {
  return item.icon ?? DEFAULT_ICONS[item.type] ?? "📦";
}

export const TAG_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#10B981",
  "#14B8A6", "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6",
  "#A855F7", "#D946EF", "#EC4899", "#F43F5E", "#78716C",
  "#64748B", "#0EA5E9", "#059669", "#CA8A04", "#DC2626",
];
