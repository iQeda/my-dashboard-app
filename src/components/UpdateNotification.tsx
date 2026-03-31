import { useState, useEffect, useRef } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useI18n } from "../i18n";

interface UpdateNotificationProps {
  readonly dismissedVersion?: string;
  readonly onDismiss: (version: string) => void;
}

export function UpdateNotification({ dismissedVersion, onDismiss }: UpdateNotificationProps) {
  const { t } = useI18n();
  const [version, setVersion] = useState("");
  const [status, setStatus] = useState<"idle" | "available" | "downloading" | "installing" | "dismissed">("idle");
  const updateRef = useRef<Awaited<ReturnType<typeof check>> | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const update = await check();
        if (update && update.version !== dismissedVersion) {
          updateRef.current = update;
          setVersion(update.version);
          setStatus("available");
        }
      } catch {
        // silently ignore
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [dismissedVersion]);

  const handleUpdate = async () => {
    const update = updateRef.current;
    if (!update) return;
    try {
      setStatus("downloading");
      await update.downloadAndInstall();
      setStatus("installing");
      await relaunch();
    } catch {
      setStatus("available");
    }
  };

  if (status === "idle" || status === "dismissed") return null;

  return (
    <div className="fixed bottom-14 right-4 z-40 w-72 rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-white/10 p-4 flex flex-col gap-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {t("update_available")}
        </span>
        <button
          onClick={() => { onDismiss(version); setStatus("dismissed"); }}
          className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        v{version}
      </p>
      <button
        onClick={handleUpdate}
        disabled={status === "downloading" || status === "installing"}
        className="w-full px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {status === "downloading" ? t("downloading") : status === "installing" ? t("installing") : t("update_now")}
      </button>
    </div>
  );
}
