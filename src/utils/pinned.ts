import type { TagDef, Category } from "../types";

export type PinnedEntry =
  | { readonly kind: "category"; readonly cat: Category }
  | { readonly kind: "tag"; readonly tag: TagDef };

export function pinnedEntryId(entry: PinnedEntry): string {
  return entry.kind === "category" ? entry.cat.id : entry.tag.id;
}

export function pinnedEntryLabel(entry: PinnedEntry): string {
  return entry.kind === "category" ? entry.cat.label : entry.tag.label;
}

// ピン留め済みカテゴリ・タグを pinnedOrder の順で解決する単一ソース
// （Sidebar と DashboardOverview は必ず同じ順序で表示する）。
// pinnedOrder にない新規ピンはカテゴリ → タグの順で末尾に追加。
export function getOrderedPinnedEntries(
  categoryList: readonly Category[],
  tagDefs: readonly TagDef[],
  pinnedOrder: readonly string[],
): readonly PinnedEntry[] {
  const catMap = new Map(categoryList.filter((c) => c.pinned).map((c) => [c.id, c]));
  const tagMap = new Map(tagDefs.filter((t) => t.pinned).map((t) => [t.id, t]));
  const result: PinnedEntry[] = [];
  for (const id of pinnedOrder) {
    const cat = catMap.get(id);
    if (cat) { result.push({ kind: "category", cat }); catMap.delete(id); continue; }
    const tag = tagMap.get(id);
    if (tag) { result.push({ kind: "tag", tag }); tagMap.delete(id); }
  }
  for (const cat of catMap.values()) result.push({ kind: "category", cat });
  for (const tag of tagMap.values()) result.push({ kind: "tag", tag });
  return result;
}
