import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, DashboardItem, TagDef, Category, ViewPrefs, RecentAccessEntry } from "../types";
import type { Locale } from "../i18n";

const updateEmojiHistory = (current: AppConfig, emoji?: string): readonly string[] | undefined => {
  if (!emoji) return current.emojiHistory;
  const prev = current.emojiHistory ?? [];
  return [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 20);
};

// リネーム時のスラグ再生成・idChanged 判定・pinnedOrder リマップ・pin/unpin 追従を
// TagDef / Category 共通で行う純粋ヘルパー（items 参照の同期は呼び出し側の責務）
function renameAndRepin<T extends { readonly id: string; readonly label: string; readonly pinned?: boolean }>(
  defs: readonly T[],
  pinnedOrder: readonly string[],
  id: string,
  updates: NoInfer<Partial<T>>,
): { readonly defs: readonly T[]; readonly pinnedOrder: readonly string[]; readonly newId: string; readonly idChanged: boolean } {
  // Generate new ID from new label if label changed
  const newId = updates.label
    ? updates.label.toLowerCase().replace(/\s+/g, "-")
    : id;
  const idChanged = Boolean(newId !== id && updates.label);
  const effectiveId = idChanged ? newId : id;
  // Update pinnedOrder atomically when pinned changes
  let order = pinnedOrder;
  if (idChanged) {
    order = order.map((pid) => (pid === id ? newId : pid));
  }
  if (updates.pinned !== undefined) {
    const oldDef = defs.find((d) => d.id === id);
    if (oldDef && !oldDef.pinned && updates.pinned) {
      order = [...order, effectiveId];
    }
    if (oldDef && oldDef.pinned && !updates.pinned) {
      order = order.filter((pid) => pid !== effectiveId);
    }
  }
  return {
    defs: defs.map((d) =>
      d.id === id ? { ...d, ...updates, ...(idChanged ? { id: newId } : {}) } : d,
    ),
    pinnedOrder: order,
    newId,
    idChanged,
  };
}

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const configRef = useRef(config);
  configRef.current = config;

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const loaded = await invoke<AppConfig>("load_config");
      setConfig(loaded);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = useCallback(async (newConfig: AppConfig) => {
    try {
      await invoke("save_config", { config: newConfig });
      setConfig(newConfig);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  // SKILL.md #6 の不変条件をここに閉じ込める:
  // 「最新 state を configRef で読み、1アクション = 1 saveConfig」
  const mutate = useCallback(
    async (update: (current: AppConfig) => AppConfig | null) => {
      const current = configRef.current;
      if (!current) return;
      const next = update(current);
      if (next) await saveConfig(next);
    },
    [saveConfig],
  );

  const addItem = useCallback(
    (item: DashboardItem, newTagDefs?: readonly TagDef[], newCategoryList?: readonly Category[]) =>
      mutate((c) => ({
        ...c,
        items: [...c.items, item],
        tagDefs: newTagDefs ?? c.tagDefs,
        categoryList: newCategoryList ?? c.categoryList,
        emojiHistory: updateEmojiHistory(c, item.icon),
      })),
    [mutate],
  );

  const updateItem = useCallback(
    (item: DashboardItem, newTagDefs?: readonly TagDef[], newCategoryList?: readonly Category[]) =>
      mutate((c) => ({
        ...c,
        items: c.items.map((i) => (i.id === item.id ? item : i)),
        tagDefs: newTagDefs ?? c.tagDefs,
        categoryList: newCategoryList ?? c.categoryList,
        emojiHistory: updateEmojiHistory(c, item.icon),
      })),
    [mutate],
  );

  const duplicateItem = useCallback(
    (id: string) =>
      mutate((c) => {
        const source = c.items.find((i) => i.id === id);
        if (!source) return null;
        const copy: DashboardItem = {
          ...source,
          id: `${source.id}-copy-${Date.now()}`,
          name: `${source.name} (Copy)`,
          favorite: undefined,
        };
        return { ...c, items: [...c.items, copy] };
      }),
    [mutate],
  );

  const deleteItem = useCallback(
    (id: string) =>
      mutate((c) => {
        let removed = false;
        return {
          ...c,
          items: c.items.filter((i) => {
            if (!removed && i.id === id) { removed = true; return false; }
            return true;
          }),
        };
      }),
    [mutate],
  );

  const toggleFavorite = useCallback(
    (id: string) =>
      mutate((c) => ({
        ...c,
        items: c.items.map((i) => (i.id === id ? { ...i, favorite: !i.favorite } : i)),
      })),
    [mutate],
  );

  const reorderTagDefs = useCallback(
    (tagDefs: readonly TagDef[]) => mutate((c) => ({ ...c, tagDefs })),
    [mutate],
  );

  const updateTagDef = useCallback(
    (id: string, updates: Partial<Pick<TagDef, "label" | "color" | "pinned">>) =>
      mutate((c) => {
        const r = renameAndRepin(c.tagDefs, c.pinnedOrder ?? [], id, updates);
        return {
          ...c,
          tagDefs: r.defs,
          pinnedOrder: r.pinnedOrder,
          ...(r.idChanged ? {
            items: c.items.map((item) => ({
              ...item,
              tags: item.tags.map((t) => (t === id ? r.newId : t)),
            })),
          } : {}),
        };
      }),
    [mutate],
  );

  const deleteTagDef = useCallback(
    (id: string) =>
      mutate((c) => ({
        ...c,
        tagDefs: c.tagDefs.filter((d) => d.id !== id),
        items: c.items.map((item) => ({
          ...item,
          tags: item.tags.filter((t) => t !== id),
        })),
      })),
    [mutate],
  );

  const updateCategoryDef = useCallback(
    (id: string, updates: Partial<Pick<Category, "label" | "pinned">>) =>
      mutate((c) => {
        const r = renameAndRepin(c.categoryList ?? [], c.pinnedOrder ?? [], id, updates);
        return {
          ...c,
          categoryList: r.defs,
          pinnedOrder: r.pinnedOrder,
          ...(r.idChanged ? {
            items: c.items.map((item) => ({
              ...item,
              category: item.category === id ? r.newId : item.category,
            })),
          } : {}),
        };
      }),
    [mutate],
  );

  const deleteCategoryDef = useCallback(
    (id: string) =>
      mutate((c) => ({
        ...c,
        categoryList: (c.categoryList ?? []).filter((d) => d.id !== id),
        items: c.items.map((item) =>
          item.category === id ? { ...item, category: undefined } : item,
        ),
      })),
    [mutate],
  );

  const reorderCategoryList = useCallback(
    (categoryList: readonly Category[]) => mutate((c) => ({ ...c, categoryList })),
    [mutate],
  );

  const updateLocale = useCallback(
    (locale: Locale) => mutate((c) => ({ ...c, locale })),
    [mutate],
  );

  const updateViewPrefs = useCallback(
    (prefs: ViewPrefs) => mutate((c) => ({ ...c, ...prefs })),
    [mutate],
  );

  const updateGlobalShortcut = useCallback(
    (globalShortcut: string | undefined) => mutate((c) => ({ ...c, globalShortcut })),
    [mutate],
  );

  const recordAccess = useCallback(
    (itemId: string) =>
      mutate((c) => {
        const prev = (c.recentAccess ?? []).filter((e) => e.id !== itemId);
        const next: readonly RecentAccessEntry[] = [{ id: itemId, at: Date.now() }, ...prev].slice(0, 50);
        return { ...c, recentAccess: next };
      }),
    [mutate],
  );

  const reload = loadConfig;

  const exportConfig = useCallback(async (path: string) => {
    try {
      await invoke("export_config", { path });
    } catch (e) {
      setError(String(e));
    }
  }, []);

  return {
    config,
    error,
    loading,
    reload,
    addItem,
    updateItem,
    deleteItem,
    duplicateItem,
    toggleFavorite,
    reorderTagDefs,
    updateTagDef,
    deleteTagDef,
    updateCategoryDef,
    deleteCategoryDef,
    reorderCategoryList,
    updateLocale,
    updateViewPrefs,
    recordAccess,
    updateGlobalShortcut,
    exportConfig,
  };
}
