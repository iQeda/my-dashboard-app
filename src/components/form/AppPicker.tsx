import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import type { InstalledApp } from "../../types";
import { useI18n } from "../../i18n";
import { useDismiss } from "../../hooks/useDismiss";

interface AppPickerProps {
  readonly value: string;
  readonly onSelect: (app: InstalledApp) => void;
}

// インストール済みアプリ一覧はセッション中変わらない前提でモジュールキャッシュする
let installedAppsCache: Promise<InstalledApp[]> | null = null;
function fetchInstalledApps(): Promise<InstalledApp[]> {
  installedAppsCache ??= invoke<InstalledApp[]>("list_installed_apps");
  return installedAppsCache;
}

// インストール済み Mac アプリの検索 + 選択ドロップダウン（ItemFormModal 用）
export function AppPicker({ value, onSelect }: AppPickerProps) {
  const { t } = useI18n();
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    fetchInstalledApps().then(setApps).catch(console.error);
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);
  // Escape はモーダル親が処理するため useDismiss では扱わない
  useDismiss([inputRef, listRef], () => setOpen(false), { enabled: open, escape: false });

  const filtered = apps.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("search_installed_apps")}
          className="w-full px-3 py-2 pr-8 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && filtered.length > 0 && createPortal(
        <ul
          ref={listRef}
          style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
          className="z-[100] max-h-56 overflow-y-auto rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-xl"
        >
          {filtered.slice(0, 80).map((app) => (
            <li key={app.path}>
              <button
                type="button"
                onClick={() => {
                  onSelect(app);
                  setQuery(app.name);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer"
              >
                {app.name}
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
}
