import { useState, useEffect } from "react";
import { useI18n } from "../i18n";
import { useUpdater } from "../hooks/useUpdater";
import { XIcon } from "./icons";

interface UpdateNotificationProps {
  readonly dismissedVersion?: string;
  readonly onDismiss: (version: string) => void;
}

export function UpdateNotification({ dismissedVersion, onDismiss }: UpdateNotificationProps) {
  const { t } = useI18n();
  const { status, version, checkForUpdate, downloadAndInstall } = useUpdater();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // 起動直後の通知は静かに失敗し、dismiss 済みバージョンは無視する
      checkForUpdate({ silent: true, skipVersion: dismissedVersion });
    }, 3000);
    return () => clearTimeout(timer);
  }, [dismissedVersion, checkForUpdate]);

  // 失敗時は「Update Now」をやり直せるよう available に戻す
  const handleUpdate = () => downloadAndInstall({ onFailStatus: "available" });

  if (status === "idle" || dismissed) return null;

  return (
    <div className="fixed bottom-14 right-4 z-40 w-72 rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-white/10 p-4 flex flex-col gap-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {t("update_available")}
        </span>
        <button
          onClick={() => { onDismiss(version); setDismissed(true); }}
          className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
        >
          <XIcon className="w-4 h-4" />
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
