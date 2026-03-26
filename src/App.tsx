import { useState, useEffect, useCallback, useRef } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useConfig } from "./hooks/useConfig";
import { useFilter } from "./hooks/useFilter";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { Dashboard } from "./components/Dashboard";
import { ItemFormModal } from "./components/ItemFormModal";
import { CommandPalette } from "./components/CommandPalette";
import { SettingsModal } from "./components/SettingsModal";
import { ActiveFilters } from "./components/ActiveFilters";
import { I18nProvider, useI18n } from "./i18n";
import type { Locale } from "./i18n";
import { DashboardOverview } from "./components/DashboardOverview";
import type { DashboardItem, TagDef, Category, CardSize, ViewMode, PageView } from "./types";

export default function App() {
  const {
    config,
    loading,
    error,
    updateLocale,
  } = useConfig();

  const [locale, setLocale] = useState<Locale>((config?.locale as Locale) ?? "en");

  useEffect(() => {
    if (config?.locale) setLocale(config.locale as Locale);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChangeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    updateLocale(newLocale);
  };

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
    <I18nProvider locale={locale}>
      <AppContent locale={locale} onChangeLocale={handleChangeLocale} />
    </I18nProvider>
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
  } = useConfig();
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
    cycleSortOrder,
  } = useFilter(config?.items ?? [], { combinedFilter: config?.combinedFilter, multiTagMode: config?.multiTagMode });

  const [editingItem, setEditingItem] = useState<DashboardItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pageView, setPageViewRaw] = useState<PageView>("dashboard");

  const navigateTo = useCallback((view: PageView) => {
    setPageViewRaw(view);
    history.pushState({ pageView: view }, "", "");
  }, []);

  useEffect(() => {
    history.replaceState({ pageView: "dashboard" }, "", "");
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { pageView?: PageView } | null;
      if (state?.pageView) {
        setPageViewRaw(state.pageView);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const [cardSize, setCardSize] = useState<CardSize>(config?.cardSize ?? "lg");
  const [viewMode, setViewMode] = useState<ViewMode>(config?.viewMode ?? "list");
  const [sidebarWidth, setSidebarWidth] = useState(config?.sidebarWidth ?? 208);

  // Listen for global shortcut event
  useEffect(() => {
    const unlisten = listen("show-command-palette", () => {
      setShowCommandPalette(true);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  // Sync from config on first load
  useEffect(() => {
    if (config) {
      if (config.cardSize) setCardSize(config.cardSize);
      if (config.viewMode) setViewMode(config.viewMode);
      if (config.sidebarWidth) setSidebarWidth(config.sidebarWidth);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sidebar resize
  const launchAndRecord = useCallback(async (item: DashboardItem) => {
    try {
      if (item.type === "app") {
        await invoke("launch_app", { name: item.target });
      } else {
        await invoke("open_url", { url: item.target });
      }
      await recordAccess(item.id);
    } catch (e) {
      console.error("Failed to launch:", e);
    }
  }, [recordAccess]);

  const sidebarResizing = useRef(false);
  const handleSidebarResizeStart = useCallback((e: React.PointerEvent) => {
    sidebarResizing.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);
  const handleSidebarResizeMove = useCallback((e: React.PointerEvent) => {
    if (!sidebarResizing.current) return;
    const newWidth = Math.max(160, Math.min(400, e.clientX));
    setSidebarWidth(newWidth);
  }, []);
  const handleSidebarResizeEnd = useCallback(() => {
    if (!sidebarResizing.current) return;
    sidebarResizing.current = false;
    updateViewPrefs({ sidebarWidth });
  }, [sidebarWidth, updateViewPrefs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showModal || showCommandPalette) return;
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setShowSettings((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setEditingItem(null);
        setShowModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal, showCommandPalette]);

  const cycleCardSize = () => {
    setCardSize((prev) => {
      const next: CardSize = prev === "sm" ? "md" : prev === "md" ? "lg" : "sm";
      updateViewPrefs({ cardSize: next });
      return next;
    });
  };

  const handleToggleViewMode = () => {
    setViewMode((prev) => {
      const next: ViewMode = prev === "card" ? "list" : "card";
      updateViewPrefs({ viewMode: next });
      return next;
    });
  };

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
    } else {
      await addItem(item, newTagDefs, newCategoryList);
    }
    setShowModal(false);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    setShowModal(false);
    setEditingItem(null);
  };

  const [importProfileName, setImportProfileName] = useState("");
  const [showImportNameModal, setShowImportNameModal] = useState(false);
  const [pendingImportPath, setPendingImportPath] = useState<string | null>(null);

  const handleImport = async () => {
    const path = await open({
      filters: [{ name: "JSON", extensions: ["json"] }],
      multiple: false,
      directory: false,
    });
    if (path) {
      const basename = path.split("/").pop()?.replace(".json", "") ?? "imported";
      setImportProfileName(basename);
      setPendingImportPath(path);
      setShowImportNameModal(true);
    }
  };

  const confirmImport = useCallback(async () => {
    if (!pendingImportPath || !importProfileName.trim()) return;
    try {
      await invoke("import_config", { path: pendingImportPath, profileName: importProfileName.trim() });
    } catch (e) {
      console.error("Import failed:", e);
    }
    setShowImportNameModal(false);
    setPendingImportPath(null);
  }, [pendingImportPath, importProfileName]);

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
          onOpenSettings={() => setShowSettings(true)}
        />
        <div
          onPointerDown={handleSidebarResizeStart}
          onPointerMove={handleSidebarResizeMove}
          onPointerUp={handleSidebarResizeEnd}
          className="w-1 shrink-0 cursor-col-resize hover:bg-blue-400/40 active:bg-blue-400/60 transition-colors"
        />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
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
            onDuplicate={duplicateItem}
            onDelete={deleteItem}
          />
        ) : (
          <>
            <header className="flex gap-2 p-4 pb-0">
              <SearchBar value={searchQuery} onChange={setSearchQuery} sortOrder={sortOrder} onToggleSort={cycleSortOrder} cardSize={cardSize} onCycleCardSize={cycleCardSize} viewMode={viewMode} onToggleViewMode={handleToggleViewMode} typeFilter={typeFilter} onCycleTypeFilter={cycleTypeFilter} shortcutsDisabled={showModal || showCommandPalette || showSettings} onOpenCommandPalette={() => setShowCommandPalette(true)} />
              <button
                onClick={async () => {
                  for (const item of filteredItems) {
                    await launchAndRecord(item);
                  }
                }}
                disabled={filteredItems.length === 0 || (selectedTags.size === 0 && !showFavoritesOnly)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 bg-white/60 dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20 disabled:opacity-30 disabled:cursor-default"
                title={`${t("open_all")} ${filteredItems.length}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t("open_all")} ({filteredItems.length})
              </button>
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 bg-blue-500 hover:bg-blue-600 border-blue-500 text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("add")}
              </button>
            </header>

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
                onAdd={handleAdd}
              />
            </div>
          </>
        )}
      </main>

      {showSettings && (
        <SettingsModal
          locale={locale}
          globalShortcut={config.globalShortcut ?? ""}
          onChangeLocale={onChangeLocale}
          onChangeGlobalShortcut={async (shortcut) => {
            try {
              if (shortcut) {
                await invoke("register_shortcut", { shortcut });
              } else {
                await invoke("unregister_all_shortcuts");
              }
              await updateGlobalShortcut(shortcut);
            } catch (e) {
              console.error("Failed to register shortcut:", e);
            }
          }}
          onImport={handleImport}
          onExport={handleExport}
          onSwitchProfile={async (filename: string) => {
            try {
              await invoke("switch_config", { filename });
              await reload();
            } catch (e) {
              console.error("Switch failed:", e);
            }
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showImportNameModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowImportNameModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm mx-4 p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t("save_as_profile")}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("import_profile_desc")}</p>
            <input
              type="text"
              value={importProfileName}
              onChange={(e) => setImportProfileName(e.target.value)}
              placeholder={t("profile_name")}
              autoFocus
              className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowImportNameModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">{t("cancel")}</button>
              <button onClick={confirmImport} disabled={!importProfileName.trim()} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-30 transition-colors cursor-pointer">{t("save")}</button>
            </div>
          </div>
        </div>
      )}

      {showCommandPalette && config && (
        <CommandPalette
          items={config.items}
          tagDefs={config.tagDefs}
          onToggleTag={(id) => { toggleTag(id); navigateTo("items"); }}
          onLaunch={launchAndRecord}
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
