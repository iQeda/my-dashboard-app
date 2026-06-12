import { useState, useEffect } from "react";
import type { AppConfig, CardSize, ViewMode } from "../types";

// config の表示系設定（cardSize / viewMode / sidebarWidth）のローカルミラー。
// 即時反映用の state を持ち、永続化は呼び出し側の updateViewPrefs が担う
export function useViewPrefs(config: AppConfig | null, loading: boolean) {
  const [cardSize, setCardSize] = useState<CardSize>(config?.cardSize ?? "lg");
  const [viewMode, setViewMode] = useState<ViewMode>(config?.viewMode ?? "list");
  const [sidebarWidth, setSidebarWidth] = useState(config?.sidebarWidth ?? 208);

  // Sync from config on first load
  useEffect(() => {
    if (config) {
      if (config.cardSize) setCardSize(config.cardSize);
      if (config.viewMode) setViewMode(config.viewMode);
      if (config.sidebarWidth) setSidebarWidth(config.sidebarWidth);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return { cardSize, setCardSize, viewMode, setViewMode, sidebarWidth, setSidebarWidth } as const;
}
