import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import emojiData from "emojibase-data/en/data.json";
import emojiMessages from "emojibase-data/en/messages.json";
import { useI18n } from "../i18n";

interface EmojiEntry {
  readonly emoji: string;
  readonly keywords: string;
}

interface SubgroupSection {
  readonly key: string;
  readonly label: string;
  readonly emojis: readonly EmojiEntry[];
}

interface GroupSection {
  readonly key: string;
  readonly label: string;
  readonly subgroups: readonly SubgroupSection[];
  readonly all: readonly EmojiEntry[];
}

interface MessageEntry {
  readonly key: string;
  readonly message: string;
  readonly order: number;
}

interface EmojibaseEmoji {
  readonly emoji: string;
  readonly label: string;
  readonly group?: number;
  readonly subgroup?: number;
  readonly tags?: readonly string[];
  readonly shortcodes?: readonly string[] | string;
}

const groupOrderToInfo = new Map<number, MessageEntry>();
(emojiMessages.groups as readonly MessageEntry[]).forEach((g) => groupOrderToInfo.set(g.order, g));

const subgroupOrderToInfo = new Map<number, MessageEntry>();
(emojiMessages.subgroups as readonly MessageEntry[]).forEach((s) => subgroupOrderToInfo.set(s.order, s));

const COMPONENT_GROUP_ORDER = 2;

const buildSections = (): readonly GroupSection[] => {
  const groupMap = new Map<number, Map<number, EmojiEntry[]>>();
  for (const e of emojiData as readonly EmojibaseEmoji[]) {
    if (e.group === undefined || e.subgroup === undefined) continue;
    if (e.group === COMPONENT_GROUP_ORDER) continue;
    if (!groupMap.has(e.group)) groupMap.set(e.group, new Map());
    const subMap = groupMap.get(e.group)!;
    if (!subMap.has(e.subgroup)) subMap.set(e.subgroup, []);
    const tags = e.tags?.join(" ") ?? "";
    const shortcodes = Array.isArray(e.shortcodes)
      ? e.shortcodes.join(" ")
      : (e.shortcodes ?? "");
    subMap.get(e.subgroup)!.push({
      emoji: e.emoji,
      keywords: `${e.label} ${tags} ${shortcodes}`.toLowerCase(),
    });
  }
  const sections: GroupSection[] = [];
  const groupOrders = [...groupMap.keys()].sort((a, b) => a - b);
  for (const groupOrder of groupOrders) {
    const groupInfo = groupOrderToInfo.get(groupOrder);
    if (!groupInfo) continue;
    const subMap = groupMap.get(groupOrder)!;
    const subOrders = [...subMap.keys()].sort((a, b) => a - b);
    const subgroups: SubgroupSection[] = [];
    const all: EmojiEntry[] = [];
    for (const subOrder of subOrders) {
      const subInfo = subgroupOrderToInfo.get(subOrder);
      const emojis = subMap.get(subOrder)!;
      subgroups.push({
        key: subInfo?.key ?? `sub-${subOrder}`,
        label: subInfo?.message ?? `subgroup ${subOrder}`,
        emojis,
      });
      all.push(...emojis);
    }
    sections.push({
      key: groupInfo.key,
      label: groupInfo.message,
      subgroups,
      all,
    });
  }
  return sections;
};

const GROUP_SECTIONS = buildSections();
const ALL_ENTRIES: readonly EmojiEntry[] = GROUP_SECTIONS.flatMap((g) => g.all);

interface EmojiPickerProps {
  readonly value: string;
  readonly fallback: string;
  readonly history?: readonly string[];
  readonly onSelect: (emoji: string) => void;
  readonly onOpenChange?: (open: boolean) => void;
}

const HISTORY_KEY = "__history";

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
  const [activeGroup, setActiveGroup] = useState<string>(
    history.length > 0 ? HISTORY_KEY : (GROUP_SECTIONS[0]?.key ?? HISTORY_KEY),
  );
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const panelHeight = 360;
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

  const historyEntries = useMemo<readonly EmojiEntry[]>(() =>
    history.map((emoji) => ALL_ENTRIES.find((e) => e.emoji === emoji) ?? { emoji, keywords: "" }),
    [history],
  );

  const sections = useMemo<readonly SubgroupSection[]>(() => {
    if (search) {
      const q = search.toLowerCase();
      const matched = ALL_ENTRIES.filter((e) => e.keywords.includes(q));
      return matched.length > 0
        ? [{ key: "search", label: t("no_results"), emojis: matched }]
        : [];
    }
    if (activeGroup === HISTORY_KEY) {
      return historyEntries.length > 0
        ? [{ key: "history", label: t("history"), emojis: historyEntries }]
        : [];
    }
    const group = GROUP_SECTIONS.find((g) => g.key === activeGroup);
    return group?.subgroups ?? [];
  }, [search, activeGroup, historyEntries, t]);

  const showSubgroupHeaders = !search && activeGroup !== HISTORY_KEY;

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
          className="z-[100] w-[28rem] rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-2xl flex flex-col"
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
              {[...(history.length > 0 ? [{ key: HISTORY_KEY, label: t("history") }] : []), ...GROUP_SECTIONS.map((g) => ({ key: g.key, label: g.label }))].map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActiveGroup(group.key)}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer capitalize ${
                    activeGroup === group.key
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-2 max-h-72 overflow-y-scroll overscroll-contain">
            {sections.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">{t("no_results")}</p>
            )}
            {sections.map((sub) => (
              <div key={sub.key} className="mb-2 last:mb-0">
                {showSubgroupHeaders && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1 py-1 capitalize">
                    {sub.label}
                  </div>
                )}
                <div className="grid grid-cols-12 gap-0.5">
                  {sub.emojis.map((entry, i) => (
                    <button
                      key={`${sub.key}-${entry.emoji}-${i}`}
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
                </div>
              </div>
            ))}
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
