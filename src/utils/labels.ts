// ラベル → ID スラグ。作成側（ItemFormModal）とリネーム側（useConfig の
// renameAndRepin）が同一のスラグ規則であることに「リネーム時 ID 同期」が依存している。
export function slugify(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

// ID 衝突時は -2, -3, ... のサフィックスで一意化（while-suffix 方式）
export function uniqueId(base: string, existingIds: ReadonlySet<string>): string {
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

export function compareLabels(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function sortByLabel<T>(
  arr: readonly T[],
  getLabel: (x: T) => string,
  order: "asc" | "desc" = "asc",
): readonly T[] {
  return [...arr].sort((a, b) => {
    const cmp = compareLabels(getLabel(a), getLabel(b));
    return order === "asc" ? cmp : -cmp;
  });
}
