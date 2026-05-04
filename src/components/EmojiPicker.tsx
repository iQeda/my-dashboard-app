import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import groupedEmojis from "unicode-emoji-json/data-by-group.json";
import { useI18n } from "../i18n";

interface EmojiEntry {
  readonly emoji: string;
  readonly keywords: string;
}

interface UnicodeEmojiEntry {
  readonly emoji: string;
  readonly name: string;
  readonly slug: string;
}

interface UnicodeEmojiGroup {
  readonly name: string;
  readonly slug: string;
  readonly emojis: readonly UnicodeEmojiEntry[];
}

const EMOJI_GROUPS: Record<string, EmojiEntry[]> = Object.fromEntries(
  (groupedEmojis as readonly UnicodeEmojiGroup[])
    .filter((g) => g.name !== "Component")
    .map((g) => [
      g.name,
      g.emojis.map((e) => ({
        emoji: e.emoji,
        keywords: `${e.name} ${e.slug.replace(/_/g, " ")}`,
      })),
    ]),
);

interface EmojiPickerProps {
  readonly value: string;
  readonly fallback: string;
  readonly history?: readonly string[];
  readonly onSelect: (emoji: string) => void;
  readonly onOpenChange?: (open: boolean) => void;
}

const GROUP_KEYS = Object.keys(EMOJI_GROUPS);
const HISTORY_KEY = "History";

export function EmojiPicker({ value, fallback, history = [], onSelect, onOpenChange }: EmojiPickerProps) {
  const { t } = useI18n();
  const [open, setOpenRaw] = useState(false);

  const setOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setOpenRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      if (next !== prev) onOpenChange?.(next);
      return next;
    });
  }, [onOpenChange]);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState(history.length > 0 ? HISTORY_KEY : GROUP_KEYS[0]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const panelHeight = 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > panelHeight ? rect.bottom + 4 : rect.top - panelHeight - 4;
    setPos({ top, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(t) &&
        panelRef.current && !panelRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, updatePos, setOpen]);

  const allEntries = useMemo(() => Object.values(EMOJI_GROUPS).flat(), []);

  const historyEntries = useMemo(() =>
    history.map((emoji) => allEntries.find((e) => e.emoji === emoji) ?? { emoji, keywords: "" }),
    [history, allEntries],
  );

  const filtered = useMemo(() => {
    if (search) {
      const q = search.toLowerCase();
      return allEntries.filter((e) => e.keywords.includes(q));
    }
    if (activeGroup === HISTORY_KEY) return historyEntries;
    return EMOJI_GROUPS[activeGroup] ?? [];
  }, [search, activeGroup, allEntries, historyEntries]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500/40 transition-colors cursor-pointer"
        title={t("choose_icon")}
      >
        <span className="text-2xl leading-none">{value || fallback}</span>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-[100] w-72 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-2xl flex flex-col"
        >
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search_emoji")}
              autoFocus
              className="w-full px-2.5 py-1.5 rounded-md bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {!search && (
            <div className="flex flex-wrap gap-0.5 px-2 pt-2">
              {[...(history.length > 0 ? [HISTORY_KEY] : []), ...GROUP_KEYS].map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveGroup(group)}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeGroup === group
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {group === HISTORY_KEY ? t("history") : group}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-8 gap-0.5 p-2 max-h-64 overflow-y-scroll overscroll-contain">
            {filtered.map((entry, i) => (
              <button
                key={`${entry.emoji}-${i}`}
                type="button"
                onClick={() => {
                  onSelect(entry.emoji);
                  setOpen(false);
                  setSearch("");
                }}
                className="w-8 h-8 flex items-center justify-center rounded-md text-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                title={entry.keywords}
              >
                {entry.emoji}
              </button>
            ))}
            {search && filtered.length === 0 && (
              <p className="col-span-8 text-center text-xs text-gray-400 py-4">{t("no_results")}</p>
            )}
          </div>

          {value && (
            <div className="px-2 pb-2">
              <button
                type="button"
                onClick={() => {
                  onSelect("");
                  setOpen(false);
                }}
                className="w-full text-center py-1.5 rounded-md text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                {t("reset_to_default")}
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
