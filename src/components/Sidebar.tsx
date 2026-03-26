import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { TagDef, Category } from "../types";
import { TAG_COLORS } from "../constants";
import { useI18n } from "../i18n";

interface SidebarProps {
  readonly tagDefs: readonly TagDef[];
  readonly categoryList: readonly Category[];
  readonly pageView: "dashboard" | "items";
  readonly selectedTags: ReadonlySet<string>;
  readonly selectedCategory: string | null;
  readonly showFavoritesOnly: boolean;
  readonly onGoToDashboard: () => void;
  readonly onToggleTag: (tagId: string) => void;
  readonly onToggleCategory: (catId: string) => void;
  readonly onShowAllItems: () => void;
  readonly onToggleFavoritesFilter: () => void;
  readonly onReorderTagDefs: (tagDefs: readonly TagDef[]) => void;
  readonly onUpdateTagDef: (id: string, updates: Partial<Pick<TagDef, "label" | "color">>) => void;
  readonly onDeleteTagDef: (id: string) => void;
  readonly onUpdateCategoryDef: (id: string, updates: Partial<Pick<Category, "label">>) => void;
  readonly onDeleteCategoryDef: (id: string) => void;
  readonly onReorderCategoryList: (list: readonly Category[]) => void;
  readonly initialCategoriesOpen: boolean;
  readonly initialTagsOpen: boolean;
  readonly onToggleSection: (prefs: { sidebarCategoriesOpen?: boolean; sidebarTagsOpen?: boolean }) => void;
  readonly onOpenSettings: () => void;
}

// --- Right-click context menu for tags/categories ---

type CtxMenuState =
  | { kind: "tag"; tag: TagDef; x: number; y: number }
  | { kind: "category"; cat: Category; x: number; y: number }
  | null;

type EditPanelState =
  | { kind: "rename-tag"; tag: TagDef }
  | { kind: "color-tag"; tag: TagDef }
  | { kind: "rename-cat"; cat: Category }
  | null;

function SidebarContextMenu({
  state,
  onRename,
  onChangeColor,
  onDelete,
  onClose,
}: {
  state: NonNullable<CtxMenuState>;
  onRename: () => void;
  onChangeColor?: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) ref.current.style.left = `${state.x - rect.width}px`;
    if (rect.bottom > window.innerHeight) ref.current.style.top = `${state.y - rect.height}px`;
  }, [state.x, state.y]);

  const btn = "flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer";

  return createPortal(
    <div ref={ref} style={{ position: "fixed", top: state.y, left: state.x }} className="z-[100] w-44 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-xl">
      <button onClick={() => { onRename(); onClose(); }} className={`${btn} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10`}>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        {t("rename")}
      </button>
      {onChangeColor && (
        <button onClick={() => { onChangeColor(); onClose(); }} className={`${btn} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10`}>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
          {t("change_color")}
        </button>
      )}
      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
      <button onClick={() => { onDelete(); onClose(); }} className={`${btn} text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        {t("delete")}
      </button>
    </div>,
    document.body,
  );
}

// --- Inline rename input ---
function InlineRename({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value);
  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) { const t = text.trim(); if (t) onSave(t); }
        if (e.key === "Escape") onCancel();
      }}
      onBlur={() => { const t = text.trim(); if (t && t !== value) onSave(t); else onCancel(); }}
      autoFocus
      className="w-full px-2 py-1 rounded bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-500/40 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
    />
  );
}

// --- Inline color picker ---
function InlineColorPicker({ current, onSelect, onClose }: { current: string; onSelect: (c: string) => void; onClose: () => void }) {
  return (
    <div className="px-2 py-2 rounded-md bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-500/40">
      <div className="flex flex-wrap gap-1.5">
        {TAG_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => { onSelect(c); onClose(); }}
            className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${current === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-800" : "hover:scale-110"}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

// --- Delete confirmation ---
function InlineDeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
      <span className="flex-1 text-[11px] text-red-600 dark:text-red-400">{t("delete_confirm")}</span>
      <button onClick={onConfirm} className="px-2 py-0.5 rounded text-[11px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer">{t("yes")}</button>
      <button onClick={onCancel} className="px-2 py-0.5 rounded text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">{t("no")}</button>
    </div>
  );
}

// --- Sort context menu for headings ---
function SortContextMenu({ x, y, onSortAsc, onSortDesc, onClose }: {
  x: number; y: number;
  onSortAsc: () => void; onSortDesc: () => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  const btn = "flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer";

  return (
    <div ref={ref} style={{ position: "fixed", top: y, left: x }} className="z-[100] w-40 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-xl">
      <button onClick={onSortAsc} className={btn}>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
        {t("sort_asc_name")}
      </button>
      <button onClick={onSortDesc} className={btn}>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4 4m0 0l4-4m-4 4V4" /></svg>
        {t("sort_desc_name")}
      </button>
    </div>
  );
}

// --- Main Sidebar ---
export function Sidebar({
  tagDefs, categoryList, pageView, selectedTags, selectedCategory, showFavoritesOnly,
  onGoToDashboard, onToggleTag, onToggleCategory, onShowAllItems, onToggleFavoritesFilter,
  onReorderTagDefs, onUpdateTagDef, onDeleteTagDef,
  onUpdateCategoryDef, onDeleteCategoryDef, onReorderCategoryList,
  initialCategoriesOpen, initialTagsOpen, onToggleSection,
  onOpenSettings,
}: SidebarProps) {
  const { t } = useI18n();
  const [categoriesOpen, setCategoriesOpenRaw] = useState(initialCategoriesOpen);
  const [tagsOpen, setTagsOpenRaw] = useState(initialTagsOpen);
  const setCategoriesOpen = (v: boolean | ((p: boolean) => boolean)) => {
    setCategoriesOpenRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      onToggleSection({ sidebarCategoriesOpen: next });
      return next;
    });
  };
  const setTagsOpen = (v: boolean | ((p: boolean) => boolean)) => {
    setTagsOpenRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      onToggleSection({ sidebarTagsOpen: next });
      return next;
    });
  };
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState>(null);
  const [sortMenu, setSortMenu] = useState<{ kind: "tag" | "category"; x: number; y: number } | null>(null);
  const [editPanel, setEditPanel] = useState<EditPanelState>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "tag" | "category"; id: string } | null>(null);

  // Category drag
  const [catDragIndex, setCatDragIndex] = useState<number | null>(null);
  const [catOverIndex, setCatOverIndex] = useState<number | null>(null);
  const catIsDragging = useRef(false);
  const catStartY = useRef(0);
  const catDidMove = useRef(false);
  const catRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Tag drag
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const didMove = useRef(false);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Category drag handlers
  const handleCatPointerDown = useCallback((e: React.PointerEvent, i: number) => {
    catIsDragging.current = false; catDidMove.current = false; catStartY.current = e.clientY; setCatDragIndex(i);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);
  const handleCatPointerMove = useCallback((e: React.PointerEvent) => {
    if (catDragIndex === null) return;
    if (!catIsDragging.current) { if (Math.abs(e.clientY - catStartY.current) < 5) return; catIsDragging.current = true; catDidMove.current = true; }
    let closest = catDragIndex, closestDist = Infinity;
    catRefs.current.forEach((el, i) => { if (!el) return; const d = Math.abs(e.clientY - (el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2)); if (d < closestDist) { closestDist = d; closest = i; } });
    setCatOverIndex(closest);
  }, [catDragIndex]);
  const handleCatPointerUp = useCallback(() => {
    if (catDragIndex !== null && catOverIndex !== null && catDragIndex !== catOverIndex && catDidMove.current) {
      const r = [...categoryList]; const [m] = r.splice(catDragIndex, 1); r.splice(catOverIndex, 0, m); onReorderCategoryList(r);
    }
    catIsDragging.current = false; catDidMove.current = false; setCatDragIndex(null); setCatOverIndex(null);
  }, [catDragIndex, catOverIndex, categoryList, onReorderCategoryList]);
  const handleCatClick = useCallback((id: string) => { if (!catDidMove.current) onToggleCategory(id); }, [onToggleCategory]);

  // Tag drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent, i: number) => {
    isDragging.current = false; didMove.current = false; startY.current = e.clientY; setDragIndex(i);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIndex === null) return;
    if (!isDragging.current) { if (Math.abs(e.clientY - startY.current) < 5) return; isDragging.current = true; didMove.current = true; }
    let closest = dragIndex, closestDist = Infinity;
    itemRefs.current.forEach((el, i) => { if (!el) return; const d = Math.abs(e.clientY - (el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2)); if (d < closestDist) { closestDist = d; closest = i; } });
    setOverIndex(closest);
  }, [dragIndex]);
  const handlePointerUp = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex && didMove.current) {
      const r = [...tagDefs]; const [m] = r.splice(dragIndex, 1); r.splice(overIndex, 0, m); onReorderTagDefs(r);
    }
    isDragging.current = false; didMove.current = false; setDragIndex(null); setOverIndex(null);
  }, [dragIndex, overIndex, tagDefs, onReorderTagDefs]);
  const handleTagClick = useCallback((id: string) => { if (!didMove.current) onToggleTag(id); }, [onToggleTag]);

  const handleSortCategories = useCallback((order: "asc" | "desc") => {
    const sorted = [...categoryList].sort((a, b) => {
      const cmp = a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
      return order === "asc" ? cmp : -cmp;
    });
    onReorderCategoryList(sorted);
    setSortMenu(null);
  }, [categoryList, onReorderCategoryList]);

  const handleSortTags = useCallback((order: "asc" | "desc") => {
    const sorted = [...tagDefs].sort((a, b) => {
      const cmp = a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
      return order === "asc" ? cmp : -cmp;
    });
    onReorderTagDefs(sorted);
    setSortMenu(null);
  }, [tagDefs, onReorderTagDefs]);

  return (
    <aside className="flex-1 flex flex-col gap-2 p-4 bg-gray-50/80 dark:bg-white/5 overflow-y-auto">
      <button onClick={onGoToDashboard}
        className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
          pageView === "dashboard"
            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
        }`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
        {t("dashboard")}
      </button>

      <button onClick={onShowAllItems}
        className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
          pageView === "items" && selectedTags.size === 0 && selectedCategory === null && !showFavoritesOnly
            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
        }`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
        {t("all_items")}
      </button>

      <button onClick={onToggleFavoritesFilter}
        className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
          showFavoritesOnly ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
        }`}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
        {t("favorites")}
      </button>

      {/* Categories */}
      {categoryList.length > 0 && (
        <>
          <div className="border-t border-gray-200 dark:border-white/10 my-1" />
          <button
            onClick={() => setCategoriesOpen((p) => !p)}
            onContextMenu={(e) => { e.preventDefault(); setSortMenu({ kind: "category", x: e.clientX, y: e.clientY }); }}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-white/10 rounded px-1 -mx-1 py-0.5 transition-colors"
            title="Right-click to sort"
          >
            {t("categories")}
            <svg className={`w-3 h-3 transition-transform ${categoriesOpen ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {/* eslint-disable-next-line react-hooks/refs */}
          {categoriesOpen && categoryList.map((cat, i) => {
            if (editPanel?.kind === "rename-cat" && editPanel.cat.id === cat.id) {
              return <InlineRename key={cat.id} value={cat.label} onSave={(v) => { onUpdateCategoryDef(cat.id, { label: v }); setEditPanel(null); }} onCancel={() => setEditPanel(null)} />;
            }
            if (deleteTarget?.kind === "category" && deleteTarget.id === cat.id) {
              return <InlineDeleteConfirm key={cat.id} onConfirm={() => { onDeleteCategoryDef(cat.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />;
            }
            return (
              <div key={cat.id} ref={(el) => { catRefs.current[i] = el; }}
                onPointerDown={(e) => handleCatPointerDown(e, i)} onPointerMove={handleCatPointerMove} onPointerUp={handleCatPointerUp}
                onClick={() => handleCatClick(cat.id)}
                onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ kind: "category", cat, x: e.clientX, y: e.clientY }); }}
                className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-colors select-none cursor-grab active:cursor-grabbing ${
                  selectedCategory === cat.id ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                } ${catIsDragging.current && catDragIndex === i ? "opacity-40" : ""} ${catIsDragging.current && catOverIndex === i && catDragIndex !== i ? "ring-2 ring-purple-400 ring-offset-1 dark:ring-offset-gray-900 rounded-md" : ""}`}>
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                <span className="flex-1 truncate">{cat.label}</span>
              </div>
            );
          })}
          {categoriesOpen && (
            <button
              onClick={() => onToggleCategory("")}
              className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedCategory === "" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" /></svg>
              {t("uncategorized")}
            </button>
          )}
        </>
      )}

      {/* Tags */}
      <div className="border-t border-gray-200 dark:border-white/10 my-1" />
      <button
        onClick={() => setTagsOpen((p) => !p)}
        onContextMenu={(e) => { e.preventDefault(); setSortMenu({ kind: "tag", x: e.clientX, y: e.clientY }); }}
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-white/10 rounded px-1 -mx-1 py-0.5 transition-colors"
        title="Right-click to sort"
      >
        {t("tags")}
        <svg className={`w-3 h-3 transition-transform ${tagsOpen ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* eslint-disable-next-line react-hooks/refs */}
      {tagsOpen && tagDefs.map((tag, i) => {
        if (editPanel?.kind === "rename-tag" && editPanel.tag.id === tag.id) {
          return <InlineRename key={tag.id} value={tag.label} onSave={(v) => { onUpdateTagDef(tag.id, { label: v }); setEditPanel(null); }} onCancel={() => setEditPanel(null)} />;
        }
        if (editPanel?.kind === "color-tag" && editPanel.tag.id === tag.id) {
          return <InlineColorPicker key={tag.id} current={tag.color} onSelect={(c) => onUpdateTagDef(tag.id, { color: c })} onClose={() => setEditPanel(null)} />;
        }
        if (deleteTarget?.kind === "tag" && deleteTarget.id === tag.id) {
          return <InlineDeleteConfirm key={tag.id} onConfirm={() => { onDeleteTagDef(tag.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />;
        }
        return (
          <div key={tag.id} ref={(el) => { itemRefs.current[i] = el; }}
            onPointerDown={(e) => handlePointerDown(e, i)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
            onClick={() => handleTagClick(tag.id)}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ kind: "tag", tag, x: e.clientX, y: e.clientY }); }}
            className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-colors select-none cursor-grab active:cursor-grabbing ${
              selectedTags.has(tag.id) ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
            } ${isDragging.current && dragIndex === i ? "opacity-40" : ""} ${isDragging.current && overIndex === i && dragIndex !== i ? "ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-gray-900 rounded-md" : ""}`}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
            <span className="flex-1 truncate">{tag.label}</span>
          </div>
        );
      })}

      {/* Settings */}
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-white/10">
        <button onClick={onOpenSettings} className="flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors w-full">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {t("settings")}
          <kbd className="ml-auto text-[10px] text-gray-400 dark:text-gray-600">⌘,</kbd>
        </button>
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <SidebarContextMenu
          state={ctxMenu}
          onRename={() => {
            if (ctxMenu.kind === "tag") setEditPanel({ kind: "rename-tag", tag: ctxMenu.tag });
            else setEditPanel({ kind: "rename-cat", cat: ctxMenu.cat });
          }}
          onChangeColor={ctxMenu.kind === "tag" ? () => setEditPanel({ kind: "color-tag", tag: ctxMenu.tag }) : undefined}
          onDelete={() => {
            if (ctxMenu.kind === "tag") setDeleteTarget({ kind: "tag", id: ctxMenu.tag.id });
            else setDeleteTarget({ kind: "category", id: ctxMenu.cat.id });
          }}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Sort Menu */}
      {sortMenu && createPortal(
        <SortContextMenu
          x={sortMenu.x}
          y={sortMenu.y}
          onSortAsc={() => sortMenu.kind === "category" ? handleSortCategories("asc") : handleSortTags("asc")}
          onSortDesc={() => sortMenu.kind === "category" ? handleSortCategories("desc") : handleSortTags("desc")}
          onClose={() => setSortMenu(null)}
        />,
        document.body,
      )}
    </aside>
  );
}
