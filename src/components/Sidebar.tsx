import { useState, useCallback, useMemo } from "react";
import type { DashboardItem, TagDef, Category, PageView } from "../types";
import { useConfigContext } from "../hooks/configContext";
import { sortByLabel } from "../utils/labels";
import { getOrderedPinnedEntries, pinnedEntryId, pinnedEntryLabel, type PinnedEntry } from "../utils/pinned";
import { useI18n } from "../i18n";
import { usePointerReorder } from "../hooks/usePointerReorder";
import { SidebarContextMenu, type CtxMenuState } from "./sidebar/SidebarContextMenu";
import { InlineRename } from "./sidebar/InlineRename";
import { InlineColorPicker } from "./sidebar/InlineColorPicker";
import { InlineDeleteConfirm } from "./sidebar/InlineDeleteConfirm";
import { SortContextMenu } from "./sidebar/SortContextMenu";
import { FolderIcon, StarIcon } from "./icons";

type EditPanelState =
  | { readonly kind: "rename-tag"; readonly tag: TagDef }
  | { readonly kind: "color-tag"; readonly tag: TagDef }
  | { readonly kind: "rename-cat"; readonly cat: Category }
  | null;

interface SidebarProps {
  readonly items: readonly DashboardItem[];
  readonly tagDefs: readonly TagDef[];
  readonly categoryList: readonly Category[];
  readonly pageView: PageView;
  readonly selectedTags: ReadonlySet<string>;
  readonly selectedCategory: string | null;
  readonly showFavoritesOnly: boolean;
  readonly onGoToDashboard: () => void;
  readonly onToggleTag: (tagId: string) => void;
  readonly onToggleCategory: (catId: string) => void;
  readonly onShowAllItems: () => void;
  readonly onToggleFavoritesFilter: () => void;
  readonly initialCategoriesOpen: boolean;
  readonly initialTagsOpen: boolean;
  readonly pinnedOrder: readonly string[];
  readonly onOpenSettings: () => void;
}

// --- Main Sidebar ---
export function Sidebar({
  items, tagDefs, categoryList, pageView, selectedTags, selectedCategory, showFavoritesOnly,
  onGoToDashboard, onToggleTag, onToggleCategory, onShowAllItems, onToggleFavoritesFilter,
  initialCategoriesOpen, initialTagsOpen,
  pinnedOrder,
  onOpenSettings,
}: SidebarProps) {
  const { t } = useI18n();
  // config 系の操作は ConfigContext から直接読む（App からの素通し props を廃止）
  const {
    reorderTagDefs: onReorderTagDefs,
    updateTagDef: onUpdateTagDef,
    deleteTagDef: onDeleteTagDef,
    updateCategoryDef: onUpdateCategoryDef,
    deleteCategoryDef: onDeleteCategoryDef,
    reorderCategoryList: onReorderCategoryList,
    updateViewPrefs,
  } = useConfigContext();
  const onToggleSection = updateViewPrefs;
  const onUpdatePinnedOrder = useCallback(
    (order: readonly string[]) => updateViewPrefs({ pinnedOrder: order }),
    [updateViewPrefs],
  );

  const catCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const catId = item.category ?? "";
      counts.set(catId, (counts.get(catId) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tagId of item.tags) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

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
  const [sortMenu, setSortMenu] = useState<{ kind: "tag" | "category" | "pinned"; x: number; y: number } | null>(null);
  const [editPanel, setEditPanel] = useState<EditPanelState>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "tag" | "category"; id: string } | null>(null);

  // Category drag
  const catDrag = usePointerReorder({ items: categoryList, onReorder: onReorderCategoryList });
  const handleCatClick = useCallback((id: string) => catDrag.clickGuard(() => onToggleCategory(id)), [catDrag, onToggleCategory]);

  // Tag drag
  const tagDrag = usePointerReorder({ items: tagDefs, onReorder: onReorderTagDefs });
  const handleTagClick = useCallback((id: string) => tagDrag.clickGuard(() => onToggleTag(id)), [tagDrag, onToggleTag]);

  const handleSortCategories = useCallback((order: "asc" | "desc") => {
    onReorderCategoryList(sortByLabel(categoryList, (c) => c.label, order));
    setSortMenu(null);
  }, [categoryList, onReorderCategoryList]);

  const handleSortTags = useCallback((order: "asc" | "desc") => {
    onReorderTagDefs(sortByLabel(tagDefs, (d) => d.label, order));
    setSortMenu(null);
  }, [tagDefs, onReorderTagDefs]);

  // Pinned items (mixed categories + tags, ordered by pinnedOrder)
  const pinnedItems = useMemo<readonly PinnedEntry[]>(
    () => getOrderedPinnedEntries(categoryList, tagDefs, pinnedOrder),
    [categoryList, tagDefs, pinnedOrder],
  );

  // Pinned drag
  const pinDrag = usePointerReorder({
    items: pinnedItems,
    onReorder: (reordered) => onUpdatePinnedOrder(reordered.map(pinnedEntryId)),
  });
  const handlePinClick = useCallback((entry: PinnedEntry) => pinDrag.clickGuard(() => {
    if (entry.kind === "category") onToggleCategory(entry.cat.id);
    else onToggleTag(entry.tag.id);
  }), [pinDrag, onToggleCategory, onToggleTag]);

  const handleSortPinned = useCallback((order: "asc" | "desc") => {
    onUpdatePinnedOrder(sortByLabel(pinnedItems, pinnedEntryLabel, order).map(pinnedEntryId));
    setSortMenu(null);
  }, [pinnedItems, onUpdatePinnedOrder]);

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
        <span className="flex-1">{t("all_items")}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{items.length}</span>
      </button>

      <button onClick={onToggleFavoritesFilter}
        className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
          showFavoritesOnly ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
        }`}>
        <StarIcon className="w-3.5 h-3.5" filled={showFavoritesOnly} />
        <span className="flex-1">{t("favorites")}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{items.filter((i) => i.favorite).length}</span>
      </button>

      {/* Pinned */}
      {pinnedItems.length > 0 && (
        <>
          <div className="border-t border-gray-200 dark:border-white/10 my-1" />
          <button
            onContextMenu={(e) => { e.preventDefault(); setSortMenu({ kind: "pinned", x: e.clientX, y: e.clientY }); }}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-default hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-white/10 rounded px-1 -mx-1 py-0.5 transition-colors"
            title="Right-click to sort"
          >
            {t("pinned")}
          </button>
          {pinnedItems.map((entry, i) => {
            const id = entry.kind === "category" ? entry.cat.id : entry.tag.id;
            if (entry.kind === "category" && editPanel?.kind === "rename-cat" && editPanel.cat.id === entry.cat.id) {
              return <InlineRename key={id} value={entry.cat.label} onSave={(v) => { onUpdateCategoryDef(entry.cat.id, { label: v }); setEditPanel(null); }} onCancel={() => setEditPanel(null)} validate={(v) => categoryList.some((c) => c.id !== entry.cat.id && c.label.toLowerCase() === v.toLowerCase()) ? t("duplicate_category") : null} />;
            }
            if (entry.kind === "tag" && editPanel?.kind === "rename-tag" && editPanel.tag.id === entry.tag.id) {
              return <InlineRename key={id} value={entry.tag.label} onSave={(v) => { onUpdateTagDef(entry.tag.id, { label: v }); setEditPanel(null); }} onCancel={() => setEditPanel(null)} validate={(v) => tagDefs.some((t) => t.id !== entry.tag.id && t.label.toLowerCase() === v.toLowerCase()) ? t("duplicate_workspace") : null} />;
            }
            if (entry.kind === "tag" && editPanel?.kind === "color-tag" && editPanel.tag.id === entry.tag.id) {
              return <InlineColorPicker key={id} current={entry.tag.color} onSelect={(c) => onUpdateTagDef(entry.tag.id, { color: c })} onClose={() => setEditPanel(null)} />;
            }
            if (entry.kind === "category" && deleteTarget?.kind === "category" && deleteTarget.id === entry.cat.id) {
              return <InlineDeleteConfirm key={id} onConfirm={() => { onDeleteCategoryDef(entry.cat.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />;
            }
            if (entry.kind === "tag" && deleteTarget?.kind === "tag" && deleteTarget.id === entry.tag.id) {
              return <InlineDeleteConfirm key={id} onConfirm={() => { onDeleteTagDef(entry.tag.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />;
            }
            const isSelected = entry.kind === "category" ? selectedCategory === entry.cat.id : selectedTags.has(entry.tag.id);
            const selectedClass = entry.kind === "category"
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium"
              : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium";
            const ringClass = entry.kind === "category" ? "ring-purple-400" : "ring-blue-400";
            return (
              <div key={id} ref={pinDrag.setItemRef(i)}
                onPointerDown={(e) => pinDrag.handlePointerDown(e, i)} onPointerMove={pinDrag.handlePointerMove} onPointerUp={pinDrag.handlePointerUp}
                onClick={() => handlePinClick(entry)}
                onContextMenu={(e) => { e.preventDefault(); if (entry.kind === "category") setCtxMenu({ kind: "category", cat: entry.cat, x: e.clientX, y: e.clientY }); else setCtxMenu({ kind: "tag", tag: entry.tag, x: e.clientX, y: e.clientY }); }}
                className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-colors select-none cursor-grab active:cursor-grabbing ${
                  isSelected ? selectedClass : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                } ${pinDrag.isDragSource(i) ? "opacity-40" : ""} ${pinDrag.isDropTarget(i) ? `ring-2 ${ringClass} ring-offset-1 dark:ring-offset-gray-900 rounded-md` : ""}`}>
                {entry.kind === "category" ? (
                  <FolderIcon className="w-3 h-3 shrink-0 text-purple-500" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.tag.color }} />
                )}
                <span className="flex-1 truncate">{entry.kind === "category" ? entry.cat.label : entry.tag.label}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                  {entry.kind === "category" ? (catCounts.get(entry.cat.id) ?? 0) : (tagCounts.get(entry.tag.id) ?? 0)}
                </span>
              </div>
            );
          })}
        </>
      )}

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
          {categoriesOpen && categoryList.map((cat, i) => {
            if (cat.pinned) return null;
            if (editPanel?.kind === "rename-cat" && editPanel.cat.id === cat.id) {
              return <InlineRename key={cat.id} value={cat.label} onSave={(v) => { onUpdateCategoryDef(cat.id, { label: v }); setEditPanel(null); }} onCancel={() => setEditPanel(null)} validate={(v) => categoryList.some((c) => c.id !== cat.id && c.label.toLowerCase() === v.toLowerCase()) ? t("duplicate_category") : null} />;
            }
            if (deleteTarget?.kind === "category" && deleteTarget.id === cat.id) {
              return <InlineDeleteConfirm key={cat.id} onConfirm={() => { onDeleteCategoryDef(cat.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />;
            }
            return (
              <div key={cat.id} ref={catDrag.setItemRef(i)}
                onPointerDown={(e) => catDrag.handlePointerDown(e, i)} onPointerMove={catDrag.handlePointerMove} onPointerUp={catDrag.handlePointerUp}
                onClick={() => handleCatClick(cat.id)}
                onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ kind: "category", cat, x: e.clientX, y: e.clientY }); }}
                className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-colors select-none cursor-grab active:cursor-grabbing ${
                  selectedCategory === cat.id ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                } ${catDrag.isDragSource(i) ? "opacity-40" : ""} ${catDrag.isDropTarget(i) ? "ring-2 ring-purple-400 ring-offset-1 dark:ring-offset-gray-900 rounded-md" : ""}`}>
                <FolderIcon className="w-3 h-3 shrink-0 text-purple-500" />
                <span className="flex-1 truncate">{cat.label}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{catCounts.get(cat.id) ?? 0}</span>
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
              <span className="flex-1 truncate">{t("uncategorized")}</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{catCounts.get("") ?? 0}</span>
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

      {tagsOpen && tagDefs.map((tag, i) => {
        if (tag.pinned) return null;
        if (editPanel?.kind === "rename-tag" && editPanel.tag.id === tag.id) {
          return <InlineRename key={tag.id} value={tag.label} onSave={(v) => { onUpdateTagDef(tag.id, { label: v }); setEditPanel(null); }} onCancel={() => setEditPanel(null)} validate={(v) => tagDefs.some((t) => t.id !== tag.id && t.label.toLowerCase() === v.toLowerCase()) ? t("duplicate_workspace") : null} />;
        }
        if (editPanel?.kind === "color-tag" && editPanel.tag.id === tag.id) {
          return <InlineColorPicker key={tag.id} current={tag.color} onSelect={(c) => onUpdateTagDef(tag.id, { color: c })} onClose={() => setEditPanel(null)} />;
        }
        if (deleteTarget?.kind === "tag" && deleteTarget.id === tag.id) {
          return <InlineDeleteConfirm key={tag.id} onConfirm={() => { onDeleteTagDef(tag.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />;
        }
        return (
          <div key={tag.id} ref={tagDrag.setItemRef(i)}
            onPointerDown={(e) => tagDrag.handlePointerDown(e, i)} onPointerMove={tagDrag.handlePointerMove} onPointerUp={tagDrag.handlePointerUp}
            onClick={() => handleTagClick(tag.id)}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ kind: "tag", tag, x: e.clientX, y: e.clientY }); }}
            className={`flex items-center gap-2 text-left px-3 py-1.5 rounded-md text-sm transition-colors select-none cursor-grab active:cursor-grabbing ${
              selectedTags.has(tag.id) ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
            } ${tagDrag.isDragSource(i) ? "opacity-40" : ""} ${tagDrag.isDropTarget(i) ? "ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-gray-900 rounded-md" : ""}`}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
            <span className="flex-1 truncate">{tag.label}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{tagCounts.get(tag.id) ?? 0}</span>
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
          isPinned={ctxMenu.kind === "tag" ? !!ctxMenu.tag.pinned : !!ctxMenu.cat.pinned}
          onTogglePin={() => {
            const id = ctxMenu.kind === "tag" ? ctxMenu.tag.id : ctxMenu.cat.id;
            const wasPinned = ctxMenu.kind === "tag" ? !!ctxMenu.tag.pinned : !!ctxMenu.cat.pinned;
            if (ctxMenu.kind === "tag") onUpdateTagDef(id, { pinned: !wasPinned });
            else onUpdateCategoryDef(id, { pinned: !wasPinned });
          }}
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
      {sortMenu && (
        <SortContextMenu
          x={sortMenu.x}
          y={sortMenu.y}
          onSortAsc={() => sortMenu.kind === "category" ? handleSortCategories("asc") : sortMenu.kind === "tag" ? handleSortTags("asc") : handleSortPinned("asc")}
          onSortDesc={() => sortMenu.kind === "category" ? handleSortCategories("desc") : sortMenu.kind === "tag" ? handleSortTags("desc") : handleSortPinned("desc")}
          onClose={() => setSortMenu(null)}
        />
      )}
    </aside>
  );
}
