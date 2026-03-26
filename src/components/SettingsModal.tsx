import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { ConfigProfile } from "../types";
import { useI18n } from "../i18n";
import type { Locale } from "../i18n";

interface SettingsModalProps {
  readonly locale: Locale;
  readonly globalShortcut: string;
  readonly onChangeLocale: (locale: Locale) => void;
  readonly onChangeGlobalShortcut: (shortcut: string | undefined) => void;
  readonly onImport: () => void;
  readonly onExport: () => void;
  readonly onSwitchProfile: (filename: string) => void;
  readonly onClose: () => void;
}

export function SettingsModal({ locale, globalShortcut, onChangeLocale, onChangeGlobalShortcut, onImport, onExport, onSwitchProfile, onClose }: SettingsModalProps) {
  const { t } = useI18n();
  const [configPath, setConfigPath] = useState("");
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [recording, setRecording] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "up-to-date" | "available" | "downloading" | "installing" | "failed">("idle");
  const [latestVersion, setLatestVersion] = useState("");
  const updateRef = useRef<Awaited<ReturnType<typeof check>> | null>(null);

  const keysPressed = useRef(new Set<string>());

  useEffect(() => {
    if (!recording) return;

    const KEY_MAP: Record<string, string> = {
      " ": "Space", "ArrowUp": "Up", "ArrowDown": "Down", "ArrowLeft": "Left", "ArrowRight": "Right",
      "Escape": "Escape", "Enter": "Return", "Backspace": "Backspace", "Delete": "Delete", "Tab": "Tab",
    };

    const toShortcutString = (): string | null => {
      const mods: string[] = [];
      const keys: string[] = [];
      for (const k of keysPressed.current) {
        if (k === "Meta" || k === "Control") { if (!mods.includes("CommandOrControl")) mods.push("CommandOrControl"); }
        else if (k === "Shift") mods.push("Shift");
        else if (k === "Alt") mods.push("Alt");
        else {
          const mapped = KEY_MAP[k] ?? (k.length === 1 ? k.toUpperCase() : k);
          keys.push(mapped);
        }
      }
      if (mods.length === 0 || keys.length === 0) return null;
      return [...mods, ...keys].join("+");
    };

    const onDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      keysPressed.current.add(e.key);
    };

    const onUp = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const shortcut = toShortcutString();
      keysPressed.current.delete(e.key);
      if (shortcut) {
        setRecording(false);
        keysPressed.current.clear();
        onChangeGlobalShortcut(shortcut);
      }
    };

    window.addEventListener("keydown", onDown, true);
    window.addEventListener("keyup", onUp, true);
    const keys = keysPressed.current;
    return () => {
      window.removeEventListener("keydown", onDown, true);
      window.removeEventListener("keyup", onUp, true);
      keys.clear();
    };
  }, [recording, onChangeGlobalShortcut]);

  useEffect(() => {
    invoke<string>("get_config_path").then(setConfigPath).catch(console.error);
    invoke<ConfigProfile[]>("list_config_profiles").then(setProfiles).catch(console.error);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-4 p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col gap-5"
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {t("settings")}
        </h2>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("language")}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => onChangeLocale("en")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                locale === "en"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40"
                  : "text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onChangeLocale("ja")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                locale === "ja"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40"
                  : "text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              JA
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("global_shortcut")}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`flex-1 px-3 py-2 rounded-lg text-sm ${
              recording
                ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300"
                : "bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-mono"
            }`}>
              {recording ? t("press_to_record") : (globalShortcut || t("not_set"))}
            </span>
            <button
              onClick={() => setRecording(!recording)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                recording
                  ? "text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  : "text-white bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {recording ? t("cancel") : t("record")}
            </button>
            {globalShortcut && (
              <button
                onClick={() => onChangeGlobalShortcut(undefined)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                {t("clear")}
              </button>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("config")}
          </h3>
          <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">{t("current_config_file")}</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-mono break-all select-all">
              {configPath || t("loading")}
            </p>
          </div>
        </section>

        {profiles.length > 1 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("profiles")}
            </h3>
            <div className="flex flex-col gap-1">
              {profiles.map((p) => (
                <button
                  key={p.filename}
                  onClick={() => {
                    if (!p.active) {
                      onSwitchProfile(p.filename);
                      onClose();
                    }
                  }}
                  className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    p.active
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.active ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.active && (
                    <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">{t("active")}</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("data")}
          </h3>
          <button
            onClick={() => {
              onImport();
              onClose();
            }}
            className="flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {t("import_config")}
          </button>
          <button
            onClick={() => {
              onExport();
              onClose();
            }}
            className="flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t("export_config")}
          </button>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("about")}
          </h3>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              MyDashboard v0.3.0
            </p>
            <button
              onClick={async () => {
                setUpdateStatus("checking");
                try {
                  const update = await check();
                  updateRef.current = update;
                  if (update) {
                    setLatestVersion(update.version);
                    setUpdateStatus("available");
                  } else {
                    setUpdateStatus("up-to-date");
                  }
                } catch {
                  setUpdateStatus("failed");
                }
              }}
              disabled={updateStatus === "checking" || updateStatus === "downloading" || updateStatus === "installing"}
              className="px-2 py-1 rounded text-[11px] font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {updateStatus === "checking" ? t("checking") : t("check_for_updates")}
            </button>
          </div>
          {updateStatus === "up-to-date" && (
            <p className="text-xs text-green-500">{t("up_to_date")}</p>
          )}
          {updateStatus === "available" && (
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">{t("update_available")}: v{latestVersion}</p>
              <button
                onClick={async () => {
                  const update = updateRef.current;
                  if (!update) return;
                  try {
                    setUpdateStatus("downloading");
                    await update.downloadAndInstall();
                    setUpdateStatus("installing");
                    await relaunch();
                  } catch {
                    setUpdateStatus("failed");
                  }
                }}
                className="px-2 py-1 rounded text-[11px] font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors cursor-pointer"
              >
                {t("update_now")}
              </button>
            </div>
          )}
          {updateStatus === "downloading" && (
            <p className="text-xs text-blue-500 animate-pulse">{t("downloading")}</p>
          )}
          {updateStatus === "installing" && (
            <p className="text-xs text-blue-500 animate-pulse">{t("installing")}</p>
          )}
          {updateStatus === "failed" && (
            <p className="text-xs text-red-500">{t("update_failed")}</p>
          )}
        </section>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
