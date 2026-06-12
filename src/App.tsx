import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useConfig } from "./hooks/useConfig";
import { ConfigContext, useConfigContext } from "./hooks/configContext";
import { useNavigation } from "./hooks/useNavigation";
import { useViewPrefs } from "./hooks/useViewPrefs";
import { useSidebarResize } from "./hooks/useSidebarResize";
import { useLauncher } from "./hooks/useLauncher";
import { useAppShortcuts } from "./hooks/useAppShortcuts";
import { groupItemsByCategory } from "./utils/groupItems";
import { useFilter } from "./hooks/useFilter";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { Dashboard } from "./components/Dashboard";
import { ItemFormModal } from "./components/ItemFormModal";
import { CommandPalette } from "./components/CommandPalette";
import { SettingsModal } from "./components/SettingsModal";
import { ActiveFilters } from "./components/ActiveFilters";
import { ShortcutHelper } from "./components/ShortcutHelper";
import { UpdateNotification } from "./components/UpdateNotification";
import { ToolbarControls } from "./components/ToolbarControls";
import { I18nProvider, useI18n } from "./i18n";
import type { Locale } from "./i18n";
import { DashboardOverview } from "./components/DashboardOverview";
import type { DashboardItem, TagDef, Category } from "./types";
import { BoltIcon } from "./components/icons";
import { ImportNameModal } from "./components/ImportNameModal";

export default function App() {
  // useConfig() はアプリ全体でこの1回のみ。ConfigContext 経由で共有する（Phase 2-1）
  const store = useConfig();
  const { config, loading, error, updateLocale } = store;

  const locale: Locale = config?.locale ?? "en";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-red-400 text-sm">Error: {error}</p>
      </div>
    );
  }

  if (!config) return null;

  return (
    <ConfigContext.Provider value={store}>
      <I18nProvider locale={locale}>
        <AppContent locale={locale} onChangeLocale={updateLocale} />
      </I18nProvider>
    </ConfigContext.Provider>
  );
}

function AppContent({ locale, onChangeLocale }: { readonly locale: Locale; readonly onChangeLocale: (locale: Locale) => void }) {
  const { t } = useI18n();
  const {
    config,
    loading,
    addItem,
    updateItem,
    deleteItem,
    duplicateItem,
    toggleFavorite,
    reorderTagDefs,
    updateTagDef,
    deleteTagDef,
    updateCategoryDef,
    deleteCategoryDef,
    reorderCategoryList,
    updateViewPrefs,
    recordAccess,
    updateGlobalShortcut,
    reload,
    exportConfig,
  } = useConfigContext();
  const {
    selectedTags,
    selectedCategory,
    combinedFilter,
    toggleCombinedFilter,
    multiTagMode,
    searchQuery,
    sortOrder,
    showFavoritesOnly,
    filteredItems,
    toggleTag,
    toggleCategory,
    toggleMultiTagMode,
    typeFilter,
    showAllItems,
    toggleFavoritesFilter,
    cycleTypeFilter,
    clearFilters,
    setSearchQuery,
    setSortOrder,
    setTypeFilter,
  } = useFilter(config?.items ?? [], { combinedFilter: config?.combinedFilter, multiTagMode: config?.multiTagMode }, { categoryList: config?.categoryList ?? [], tagDefs: config?.tagDefs ?? [] });

  const [editingItem, setEditingItem] = useState<DashboardItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImportNameModal, setShowImportNameModal] = useState(false);
  const { pageView, navigateTo } = useNavigation();

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Display-order items: Dashboard の描画順と同じ単一ソース（groupItemsByCategory）を平坦化
  const displayItems = useMemo(
    () => groupItemsByCategory(filteredItems, config?.categoryList ?? []).flatMap((g) => g.items),
    [filteredItems, config?.categoryList],
  );

  const { focusedItem, setFocusedIndex, moveFocus, resetFocus } = useKeyboardNavigation({
    items: displayItems,
    enabled: pageView === "items",
  });
  const focusedItemRef = useRef(focusedItem);
  focusedItemRef.current = focusedItem;
  const selectItem = useCallback((item: DashboardItem) => {
    const idx = displayItems.indexOf(item);
    if (idx >= 0) setFocusedIndex(idx);
  }, [displayItems, setFocusedIndex]);

  const { cardSize, setCardSize, viewMode, setViewMode, sidebarWidth, setSidebarWidth } = useViewPrefs(config, loading);

  // Listen for global shortcut event
  useEffect(() => {
    const unlisten = listen("show-command-palette", () => {
      setShowCommandPalette(true);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  const { launchAndRecord, openAll } = useLauncher(recordAccess);

  const persistSidebarWidth = useCallback((width: number) => updateViewPrefs({ sidebarWidth: width }), [updateViewPrefs]);
  const { onResizeStart, onResizeMove, onResizeEnd } = useSidebarResize(sidebarWidth, setSidebarWidth, persistSidebarWidth);

  const hasActiveFilters = selectedTags.size > 0 || selectedCategory !== null || showFavoritesOnly || typeFilter !== "all" || searchQuery !== "";
  const hasActiveFiltersRef = useRef(hasActiveFilters);
  hasActiveFiltersRef.current = hasActiveFilters;

  // Open All の対象と起動ループの単一ソース（ボタン / ⌘O / CommandPalette 共通）
  const openAllTargets = useMemo(
    () => filteredItems.filter((i) => !i.excludeFromOpenAll),
    [filteredItems],
  );
  // キーボードハンドラの useEffect は filteredItems を依存に持たないため、
  // ref 経由で常に最新の対象を参照する（stale-closure 回避）
  const openAllTargetsRef = useRef(openAllTargets);
  openAllTargetsRef.current = openAllTargets;

  useAppShortcuts({
    showModal,
    showCommandPalette,
    showSettings,
    showImportNameModal,
    pageView,
    searchInputRef,
    focusedItemRef,
    hasActiveFiltersRef,
    openAllTargetsRef,
    setShowModal,
    setEditingItem,
    setShowSettings,
    setShowCommandPalette,
    setShowImportNameModal,
    navigateTo,
    launchAndRecord,
    openAll,
    toggleFavorite,
    moveFocus,
  });

  // Scroll focused item into view
  useEffect(() => {
    if (!focusedItem) return;
    const el = document.querySelector("[data-focused]");
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedItem]);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: DashboardItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSave = async (item: DashboardItem, newTagDefs: readonly TagDef[], newCategoryList: readonly Category[]) => {
    if (editingItem) {
      await updateItem(item, newTagDefs, newCategoryList);
      setShowModal(false);
      setEditingItem(null);
      return;
    }
    await addItem(item, newTagDefs, newCategoryList);
    setShowModal(false);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    setShowModal(false);
    setEditingItem(null);
  };

  const [importInitialName, setImportInitialName] = useState("");
  const [pendingImportPath, setPendingImportPath] = useState<string | null>(null);

  const handleImport = async () => {
    const path = await open({
      filters: [{ name: "JSON", extensions: ["json"] }],
      multiple: false,
      directory: false,
    });
    if (path) {
      const basename = path.split("/").pop()?.replace(".json", "") ?? "imported";
      setImportInitialName(basename);
      setPendingImportPath(path);
      setShowImportNameModal(true);
    }
  };

  const confirmImport = useCallback(async (name: string) => {
    if (!pendingImportPath || !name.trim()) return;
    try {
      await invoke("import_config", { path: pendingImportPath, profileName: name.trim() });
    } catch (e) {
      console.error("Import failed:", e);
    }
    setShowImportNameModal(false);
    setPendingImportPath(null);
  }, [pendingImportPath]);

  const handleLoadConfigFile = async () => {
    const path = await open({
      filters: [{ name: "JSON", extensions: ["json"] }],
      multiple: false,
      directory: false,
    });
    if (path) {
      try {
        await invoke("load_config_from_file", { path });
        await reload();
      } catch (e) {
        console.error("Load config failed:", e);
      }
    }
  };

  const handleExport = async () => {
    const path = await save({
      filters: [{ name: "JSON", extensions: ["json"] }],
      defaultPath: "dashboard-config.json",
    });
    if (path) {
      await exportConfig(path);
    }
  };

  if (!config) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex shrink-0" style={{ width: sidebarWidth }}>
        <Sidebar
          items={config.items}
          tagDefs={config.tagDefs}
          categoryList={config.categoryList ?? []}
          pageView={pageView}
          selectedTags={selectedTags}
          selectedCategory={selectedCategory}
          showFavoritesOnly={showFavoritesOnly}
          onGoToDashboard={() => navigateTo("dashboard")}
          onToggleTag={(id) => { toggleTag(id); navigateTo("items"); }}
          onToggleCategory={(id) => { toggleCategory(id); navigateTo("items"); }}
          onShowAllItems={() => { showAllItems(); navigateTo("items"); }}
          onToggleFavoritesFilter={() => { toggleFavoritesFilter(); navigateTo("items"); }}
          onReorderTagDefs={reorderTagDefs}
          onUpdateTagDef={updateTagDef}
          onDeleteTagDef={deleteTagDef}
          onUpdateCategoryDef={updateCategoryDef}
          onDeleteCategoryDef={deleteCategoryDef}
          onReorderCategoryList={reorderCategoryList}
          initialCategoriesOpen={config.sidebarCategoriesOpen ?? true}
          initialTagsOpen={config.sidebarTagsOpen ?? true}
          onToggleSection={updateViewPrefs}
          pinnedOrder={config.pinnedOrder ?? []}
          onUpdatePinnedOrder={(order) => updateViewPrefs({ pinnedOrder: order })}
          onOpenSettings={() => setShowSettings(true)}
        />
        <div
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          className="w-1 shrink-0 cursor-col-resize hover:bg-blue-400/40 active:bg-blue-400/60 transition-colors"
        />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex gap-2 p-4 pb-0">
          <SearchBar value={searchQuery} onChange={(v) => { setSearchQuery(v); if (v && pageView !== "items") navigateTo("items"); }} inputRef={searchInputRef} onInputFocus={resetFocus} />
          {pageView === "items" && (
            <ToolbarControls
              viewMode={viewMode}
              onSetViewMode={(m) => { setViewMode(m); updateViewPrefs({ viewMode: m }); }}
              cardSize={cardSize}
              onSetCardSize={(s) => { setCardSize(s); updateViewPrefs({ cardSize: s }); }}
              sortOrder={sortOrder}
              onSetSortOrder={setSortOrder}
              typeFilter={typeFilter}
              onSetTypeFilter={setTypeFilter}
            />
          )}
          {pageView === "items" && (
            <>
              <button
                onClick={() => openAll(openAllTargets)}
                disabled={openAllTargets.length === 0 || !hasActiveFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 bg-amber-500 hover:bg-amber-600 border-amber-500 text-white disabled:opacity-30 disabled:cursor-default"
                title={`${t("open_all")} ${openAllTargets.length}`}
              >
                <BoltIcon className="w-4 h-4" />
                {t("open_all")} ({openAllTargets.length})
                <kbd className="ml-1 px-1 py-0.5 rounded text-[10px] font-bold bg-white/20 border border-white/30">⌘O</kbd>
              </button>
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 bg-blue-500 hover:bg-blue-600 border-blue-500 text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("add")}
                <kbd className="ml-1 px-1 py-0.5 rounded text-[10px] font-bold bg-white/20 border border-white/30">⌘N</kbd>
              </button>
            </>
          )}
        </header>

        {pageView === "dashboard" ? (
          <DashboardOverview
            items={config.items}
            tagDefs={config.tagDefs}
            categoryList={config.categoryList ?? []}
            recentAccess={config.recentAccess ?? []}
            onSelectTag={(id) => { toggleTag(id); navigateTo("items"); }}
            onSelectCategory={(id) => { toggleCategory(id); navigateTo("items"); }}
            onSelectFavorites={() => { toggleFavoritesFilter(); navigateTo("items"); }}
            onLaunchItem={launchAndRecord}
            onEdit={handleEdit}
            onToggleFavorite={toggleFavorite}
            onToggleCategoryPin={(id) => { const cat = (config.categoryList ?? []).find((c) => c.id === id); if (cat) updateCategoryDef(id, { pinned: !cat.pinned }); }}
            onToggleTagPin={(id) => { const tag = config.tagDefs.find((t) => t.id === id); if (tag) updateTagDef(id, { pinned: !tag.pinned }); }}
            pinnedOrder={config.pinnedOrder ?? []}
          />
        ) : (
          <>
            <ActiveFilters
              selectedTags={selectedTags}
              selectedCategory={selectedCategory}
              showFavoritesOnly={showFavoritesOnly}
              typeFilter={typeFilter}
              combinedFilter={combinedFilter}
              multiTagMode={multiTagMode}
              tagDefs={config.tagDefs}
              categoryList={config.categoryList ?? []}
              onToggleTag={toggleTag}
              onToggleCategory={toggleCategory}
              onToggleFavoritesFilter={toggleFavoritesFilter}
              onCycleTypeFilter={cycleTypeFilter}
              onToggleCombinedFilter={() => { toggleCombinedFilter(); updateViewPrefs({ combinedFilter: !combinedFilter }); }}
              onToggleMultiTagMode={() => { toggleMultiTagMode(); updateViewPrefs({ multiTagMode: !multiTagMode }); }}
              onClearAll={clearFilters}
            />

            <div className="flex-1 overflow-y-auto">
              <Dashboard
                items={filteredItems}
                tagDefs={config.tagDefs}
                categoryList={config.categoryList ?? []}
                cardSize={cardSize}
                viewMode={viewMode}
                onEdit={handleEdit}
                onToggleFavorite={toggleFavorite}
                onDuplicate={duplicateItem}
                onDelete={deleteItem}
                onLaunch={launchAndRecord}
                onSelect={selectItem}
                onToggleTag={toggleTag}
                onSelectCategory={toggleCategory}
                focusedItemId={focusedItem?.id}
                onAdd={handleAdd}
              />
            </div>
          </>
        )}
      </main>

      <div className="fixed bottom-4 right-4 z-40">
        <ShortcutHelper />
      </div>
      <UpdateNotification
        dismissedVersion={config.dismissedUpdateVersion}
        onDismiss={(v) => updateViewPrefs({ dismissedUpdateVersion: v })}
      />

      {showSettings && (
        <SettingsModal
          locale={locale}
          globalShortcut={config.globalShortcut ?? ""}
          onChangeLocale={onChangeLocale}
          onChangeGlobalShortcut={async (shortcut) => {
            try {
              if (shortcut) {
                await invoke("register_shortcut", { shortcut });
                await updateGlobalShortcut(shortcut);
                return;
              }
              await invoke("unregister_all_shortcuts");
              await updateGlobalShortcut(shortcut);
            } catch (e) {
              console.error("Failed to register shortcut:", e);
            }
          }}
          onImport={handleImport}
          onLoadConfigFile={handleLoadConfigFile}
          onExport={handleExport}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showImportNameModal && (
        <ImportNameModal
          initialName={importInitialName}
          onConfirm={confirmImport}
          onClose={() => setShowImportNameModal(false)}
        />
      )}

      {showCommandPalette && config && (
        <CommandPalette
          items={config.items}
          tagDefs={config.tagDefs}
          categoryList={config.categoryList ?? []}
          recentAccess={config.recentAccess ?? []}
          onToggleTag={(id) => { if (!selectedTags.has(id)) toggleTag(id); navigateTo("items"); }}
          onToggleCategory={(id) => { if (selectedCategory !== id) toggleCategory(id); navigateTo("items"); }}
          onLaunch={launchAndRecord}
          onOpenAll={openAll}
          onEdit={handleEdit}
          onClose={() => setShowCommandPalette(false)}
        />
      )}

      {showModal && (
        <ItemFormModal
          item={editingItem}
          tagDefs={config.tagDefs}
          categoryList={config.categoryList ?? []}
          emojiHistory={config.emojiHistory ?? []}
          defaultTags={editingItem ? [] : [...selectedTags]}
          defaultCategory={editingItem ? undefined : (selectedCategory ?? undefined)}
          existingItemIds={new Set(config.items.map((i) => i.id))}
          onSave={handleSave}
          onDelete={editingItem ? handleDelete : undefined}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
