import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";

interface ShortcutRow {
  readonly keys: readonly string[];
  readonly label: string;
}

interface ShortcutSection {
  readonly title: string;
  readonly rows: readonly ShortcutRow[];
}

function Kbd({ children }: { readonly children: string }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-[11px] font-mono text-gray-700 dark:text-gray-300 leading-none">
      {children}
    </kbd>
  );
}

export function ShortcutHelper() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const sections: readonly ShortcutSection[] = [
    {
      title: t("shortcut_nav"),
      rows: [
        { keys: ["⌘", "F"], label: t("shortcut_search") },
        { keys: ["⌘", "⇧", "D"], label: t("shortcut_dashboard") },
        { keys: ["⌘", "K"], label: t("shortcut_cmd_palette") },
        { keys: ["⌘", ","], label: t("shortcut_settings") },
        { keys: ["Esc"], label: t("shortcut_escape") },
      ],
    },
    {
      title: t("shortcut_items"),
      rows: [
        { keys: ["↑", "↓"], label: t("shortcut_arrow") },
        { keys: ["Ctrl", "P", "/", "Ctrl", "N"], label: t("shortcut_emacs_nav") },
        { keys: ["↓"], label: t("shortcut_arrow_from_search") },
        { keys: ["Enter"], label: t("shortcut_enter") },
        { keys: ["Click"], label: t("shortcut_click") },
        { keys: ["Double-click"], label: t("shortcut_dblclick") },
      ],
    },
    {
      title: t("shortcut_actions"),
      rows: [
        { keys: ["⌘", "N"], label: t("shortcut_new") },
        { keys: ["⌘", "⇧", "A"], label: t("shortcut_open_all") },
        { keys: ["⌘", "E"], label: t("shortcut_edit") },
        { keys: ["⌘", "⇧", "F"], label: t("shortcut_favorite") },
        { keys: ["⌘", "Enter"], label: t("shortcut_launch") },
      ],
    },
  ];

  const rect = btnRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-center w-8 h-8 rounded-full border text-xs font-medium transition-colors cursor-pointer shrink-0 bg-white/80 dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-600 dark:hover:text-gray-300 shadow-sm"
        title={t("keyboard_shortcuts")}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01" />
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
        </svg>
      </button>

      {open && rect && createPortal(
        <div
          ref={popRef}
          className="fixed z-50 w-72 rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-white/10 p-4 flex flex-col gap-3"
          style={{ bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right }}
        >
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("keyboard_shortcuts")}</h3>
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{section.title}</span>
              {section.rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-300">{row.label}</span>
                  <div className="flex items-center gap-0.5">
                    {row.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
