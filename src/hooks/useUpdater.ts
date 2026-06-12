import { useState, useRef, useCallback } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "installing"
  | "failed";

// check → downloadAndInstall → relaunch の状態機械
// （UpdateNotification と SettingsModal > About で共用）
export function useUpdater() {
  const [status, setStatus] = useState<UpdaterStatus>("idle");
  const [version, setVersion] = useState("");
  const updateRef = useRef<Awaited<ReturnType<typeof check>> | null>(null);

  const checkForUpdate = useCallback(
    async (opts?: { readonly silent?: boolean; readonly skipVersion?: string }) => {
      if (!opts?.silent) setStatus("checking");
      try {
        const update = await check();
        if (update && update.version !== opts?.skipVersion) {
          updateRef.current = update;
          setVersion(update.version);
          setStatus("available");
          return;
        }
        if (!opts?.silent) setStatus("up-to-date");
      } catch {
        if (!opts?.silent) setStatus("failed");
      }
    },
    [],
  );

  const downloadAndInstall = useCallback(
    async (opts?: { readonly onFailStatus?: UpdaterStatus }) => {
      const update = updateRef.current;
      if (!update) return;
      try {
        setStatus("downloading");
        await update.downloadAndInstall();
        setStatus("installing");
        await relaunch();
      } catch {
        setStatus(opts?.onFailStatus ?? "failed");
      }
    },
    [],
  );

  return { status, version, checkForUpdate, downloadAndInstall } as const;
}
