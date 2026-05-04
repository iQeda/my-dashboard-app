import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, DashboardItem, TagDef, Category, ViewMode, CardSize, RecentAccessEntry } from "../types";

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

  const updateEmojiHistory = (current: AppConfig, emoji?: string): readonly string[] | undefined => {
    if (!emoji) return current.emojiHistory;
    const prev = current.emojiHistory ?? [];
    return [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 20);
  };

  const addItem = useCallback(
    async (item: DashboardItem, newTagDefs?: readonly TagDef[], newCategoryList?: readonly Category[]) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = {
        ...current,
        items: [...current.items, item],
        tagDefs: newTagDefs ?? current.tagDefs,
        categoryList: newCategoryList ?? current.categoryList,
        emojiHistory: updateEmojiHistory(current, item.icon),
      };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const updateItem = useCallback(
    async (item: DashboardItem, newTagDefs?: readonly TagDef[], newCategoryList?: readonly Category[]) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = {
        ...current,
        items: current.items.map((i) => (i.id === item.id ? item : i)),
        tagDefs: newTagDefs ?? current.tagDefs,
        categoryList: newCategoryList ?? current.categoryList,
        emojiHistory: updateEmojiHistory(current, item.icon),
      };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const duplicateItem = useCallback(
    async (id: string) => {
      const current = configRef.current;
      if (!current) return;
      const source = current.items.find((i) => i.id === id);
      if (!source) return;
      const newId = `${source.id}-copy-${Date.now()}`;
      const copy: DashboardItem = {
        ...source,
        id: newId,
        name: `${source.name} (Copy)`,
        favorite: undefined,
      };
      const newConfig: AppConfig = {
        ...current,
        items: [...current.items, copy],
      };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const current = configRef.current;
      if (!current) return;
      let removed = false;
      const newConfig: AppConfig = {
        ...current,
        items: current.items.filter((i) => {
          if (!removed && i.id === id) { removed = true; return false; }
          return true;
        }),
      };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = {
        ...current,
        items: current.items.map((i) =>
          i.id === id ? { ...i, favorite: !i.favorite } : i,
        ),
      };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const reorderTagDefs = useCallback(
    async (tagDefs: readonly TagDef[]) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = { ...current, tagDefs };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const updateTagDef = useCallback(
    async (id: string, updates: Partial<Pick<TagDef, "label" | "color" | "pinned">>) => {
      const current = configRef.current;
      if (!current) return;
      // Generate new ID from new label if label changed
      const newId = updates.label
        ? updates.label.toLowerCase().replace(/\s+/g, "-")
        : id;
      const idChanged = newId !== id && updates.label;
      const effectiveId = idChanged ? newId : id;
      // Update pinnedOrder atomically when pinned changes
      let pinnedOrder = (current.pinnedOrder ?? []);
      if (idChanged) {
        pinnedOrder = pinnedOrder.map((pid) => (pid === id ? newId : pid));
      }
      if (updates.pinned !== undefined) {
        const oldTag = current.tagDefs.find((t) => t.id === id);
        if (oldTag && !oldTag.pinned && updates.pinned) {
          pinnedOrder = [...pinnedOrder, effectiveId];
        }
        if (oldTag && oldTag.pinned && !updates.pinned) {
          pinnedOrder = pinnedOrder.filter((pid) => pid !== effectiveId);
        }
      }
      const newConfig: AppConfig = {
        ...current,
        tagDefs: current.tagDefs.map((c) =>
          c.id === id ? { ...c, ...updates, ...(idChanged ? { id: newId } : {}) } : c,
        ),
        pinnedOrder,
        ...(idChanged ? {
          items: current.items.map((item) => ({
            ...item,
            tags: item.tags.map((t) => (t === id ? newId : t)),
          })),
        } : {}),
      };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const deleteTagDef = useCallback(
    async (id: string) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = {
        ...current,
        tagDefs: current.tagDefs.filter((c) => c.id !== id),
        items: current.items.map((item) => ({
          ...item,
          tags: item.tags.filter((t) => t !== id),
        })),
      };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const updateCategoryDef = useCallback(
    async (id: string, updates: Partial<Pick<Category, "label" | "pinned">>) => {
      const current = configRef.current;
      if (!current) return;
      // Generate new ID from new label if label changed
      const newId = updates.label
        ? updates.label.toLowerCase().replace(/\s+/g, "-")
        : id;
      const idChanged = newId !== id && updates.label;
      const effectiveId = idChanged ? newId : id;
      // Update pinnedOrder atomically when pinned changes
      let pinnedOrder = (current.pinnedOrder ?? []);
      if (idChanged) {
        pinnedOrder = pinnedOrder.map((pid) => (pid === id ? newId : pid));
      }
      if (updates.pinned !== undefined) {
        const oldCat = (current.categoryList ?? []).find((c) => c.id === id);
        if (oldCat && !oldCat.pinned && updates.pinned) {
          pinnedOrder = [...pinnedOrder, effectiveId];
        }
        if (oldCat && oldCat.pinned && !updates.pinned) {
          pinnedOrder = pinnedOrder.filter((pid) => pid !== effectiveId);
        }
      }
      const newConfig: AppConfig = {
        ...current,
        categoryList: (current.categoryList ?? []).map((c) =>
          c.id === id ? { ...c, ...updates, ...(idChanged ? { id: newId } : {}) } : c,
        ),
        pinnedOrder,
        ...(idChanged ? {
          items: current.items.map((item) => ({
            ...item,
            category: item.category === id ? newId : item.category,
          })),
        } : {}),
      };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const deleteCategoryDef = useCallback(
    async (id: string) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = {
        ...current,
        categoryList: (current.categoryList ?? []).filter((c) => c.id !== id),
        items: current.items.map((item) =>
          item.category === id ? { ...item, category: undefined } : item,
        ),
      };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const reorderCategoryList = useCallback(
    async (categoryList: readonly Category[]) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = { ...current, categoryList };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const updateLocale = useCallback(
    async (locale: string) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = { ...current, locale };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const updateViewPrefs = useCallback(
    async (prefs: { viewMode?: ViewMode; cardSize?: CardSize; sidebarWidth?: number; sidebarCategoriesOpen?: boolean; sidebarTagsOpen?: boolean; combinedFilter?: boolean; multiTagMode?: boolean; pinnedOrder?: readonly string[]; hiddenProfiles?: readonly string[]; dismissedUpdateVersion?: string }) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = { ...current, ...prefs };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const addEmojiToHistory = useCallback(
    async (emoji: string) => {
      const current = configRef.current;
      if (!current || !emoji) return;
      const prev = current.emojiHistory ?? [];
      const filtered = prev.filter((e) => e !== emoji);
      const next = [emoji, ...filtered].slice(0, 20);
      const newConfig: AppConfig = { ...current, emojiHistory: next };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const updateGlobalShortcut = useCallback(
    async (globalShortcut: string | undefined) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = { ...current, globalShortcut };
      await saveConfig(newConfig);
    },
    [saveConfig],
  );

  const recordAccess = useCallback(
    async (itemId: string) => {
      const current = configRef.current;
      if (!current) return;
      const prev = (current.recentAccess ?? []).filter((e) => e.id !== itemId);
      const next: readonly RecentAccessEntry[] = [{ id: itemId, at: Date.now() }, ...prev].slice(0, 50);
      const newConfig: AppConfig = { ...current, recentAccess: next };
      await saveConfig(newConfig);
    },
    [saveConfig],
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
    addEmojiToHistory,
    recordAccess,
    updateGlobalShortcut,
    exportConfig,
  };
}
