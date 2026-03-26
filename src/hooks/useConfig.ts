import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, DashboardItem, TagDef, Category, ViewMode, CardSize } from "../types";

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
      const newConfig: AppConfig = {
        ...current,
        items: current.items.filter((i) => i.id !== id),
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
    async (id: string, updates: Partial<Pick<TagDef, "label" | "color">>) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = {
        ...current,
        tagDefs: current.tagDefs.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
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
    async (id: string, updates: Partial<Pick<Category, "label">>) => {
      const current = configRef.current;
      if (!current) return;
      const newConfig: AppConfig = {
        ...current,
        categoryList: (current.categoryList ?? []).map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
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
    async (prefs: { viewMode?: ViewMode; cardSize?: CardSize; sidebarWidth?: number }) => {
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
    exportConfig,
  };
}
