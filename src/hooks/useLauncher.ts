import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DashboardItem } from "../types";

// アイテム起動 + アクセス記録の一元化。
// ItemCard / ItemRow は invoke を直接呼ばず、必ずこの launchAndRecord を経由する
export function useLauncher(recordAccess: (itemId: string) => Promise<void>) {
  const launchAndRecord = useCallback(async (item: DashboardItem) => {
    try {
      if (item.type === "app") {
        await invoke("launch_app", { name: item.target });
        await recordAccess(item.id);
        return;
      }
      await invoke("open_url", { url: item.target });
      await recordAccess(item.id);
    } catch (e) {
      console.error("Failed to launch:", e);
    }
  }, [recordAccess]);

  // Open All の起動ループ（ボタン / ⌘O / CommandPalette 共通、逐次 await）
  const openAll = useCallback(async (targets: readonly DashboardItem[]) => {
    for (const item of targets) {
      await launchAndRecord(item);
    }
  }, [launchAndRecord]);

  return { launchAndRecord, openAll } as const;
}
