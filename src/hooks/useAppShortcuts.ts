import { useEffect } from "react";
import type { DashboardItem, PageView } from "../types";

interface AppShortcutsDeps {
  readonly showModal: boolean;
  readonly showCommandPalette: boolean;
  readonly showSettings: boolean;
  readonly showImportNameModal: boolean;
  readonly pageView: PageView;
  readonly searchInputRef: React.RefObject<HTMLInputElement | null>;
  readonly focusedItemRef: React.RefObject<DashboardItem | null>;
  readonly hasActiveFiltersRef: React.RefObject<boolean>;
  readonly openAllTargetsRef: React.RefObject<readonly DashboardItem[]>;
  readonly setShowModal: (open: boolean) => void;
  readonly setEditingItem: (item: DashboardItem | null) => void;
  readonly setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setShowCommandPalette: (open: boolean) => void;
  readonly setShowImportNameModal: (open: boolean) => void;
  readonly navigateTo: (view: PageView) => void;
  readonly launchAndRecord: (item: DashboardItem) => void;
  readonly openAll: (targets: readonly DashboardItem[]) => void;
  readonly toggleFavorite: (id: string) => void;
  readonly moveFocus: (delta: number) => void;
}

// 集約キーボードハンドラ（CLAUDE.md: 単一の集約ハンドラ + ref 参照という設計を維持。
// コンポーネントごとのリスナー分散への変更は禁止）。
// 修飾キー判定は e.metaKey のみ（Mac 専用。ctrlKey は Ctrl+N/P の Emacs 風ナビ用）
export function useAppShortcuts({
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
}: AppShortcutsDeps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Layer 0: Modal / overlay Escape handling
      if (showModal) {
        if (e.key === "Escape") { setShowModal(false); setEditingItem(null); }
        return;
      }
      if (showCommandPalette) return; // CommandPalette handles its own keys
      if (showSettings) {
        if (e.key === "Escape") setShowSettings(false);
        return;
      }
      if (showImportNameModal) {
        if (e.key === "Escape") setShowImportNameModal(false);
        return;
      }

      const meta = e.metaKey;

      // Layer 1: Meta/Ctrl shortcuts
      if (meta) {
        if (e.key === ",") {
          e.preventDefault();
          setShowSettings((prev) => !prev);
          return;
        }
        if (e.key === "n") {
          e.preventDefault();
          setEditingItem(null);
          setShowModal(true);
          return;
        }
        if (e.key === "k") {
          e.preventDefault();
          setShowCommandPalette(true);
          return;
        }
        if (e.key === "f" && !e.shiftKey) {
          e.preventDefault();
          if (pageView !== "items") navigateTo("items");
          searchInputRef.current?.focus();
          return;
        }
        if (e.shiftKey && e.key === "D") {
          e.preventDefault();
          navigateTo("dashboard");
          return;
        }
        if (e.key === "o" && !e.shiftKey && pageView === "items" && hasActiveFiltersRef.current) {
          e.preventDefault();
          openAll(openAllTargetsRef.current);
          return;
        }
        // Item operation shortcuts (items page + focused item)
        const fi = focusedItemRef.current;
        if (pageView === "items" && fi) {
          if (e.key === "Enter") {
            e.preventDefault();
            launchAndRecord(fi);
            return;
          }
          if (e.key === "e") {
            e.preventDefault();
            setEditingItem(fi);
            setShowModal(true);
            return;
          }
          if (e.shiftKey && e.key === "F") {
            e.preventDefault();
            toggleFavorite(fi.id);
            return;
          }
        }
        return;
      }

      // Layer 2: Escape (no modal open)
      if (e.key === "Escape") {
        searchInputRef.current?.blur();
        return;
      }

      // Layer 3: Arrow keys + Enter (items page)
      const isDownKey = e.key === "ArrowDown" || (e.ctrlKey && e.key === "n");
      const isUpKey = e.key === "ArrowUp" || (e.ctrlKey && e.key === "p");
      if (pageView === "items" && isDownKey && document.activeElement === searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.blur();
        moveFocus(1);
        return;
      }
      if (pageView === "items" && document.activeElement !== searchInputRef.current) {
        if (isDownKey) {
          e.preventDefault();
          moveFocus(1);
          return;
        }
        if (isUpKey) {
          e.preventDefault();
          moveFocus(-1);
          return;
        }
        if (e.key === "Enter" && focusedItemRef.current) {
          e.preventDefault();
          launchAndRecord(focusedItemRef.current);
          return;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    showModal, showCommandPalette, showSettings, showImportNameModal, pageView,
    navigateTo, launchAndRecord, openAll, toggleFavorite, moveFocus,
    setShowModal, setEditingItem, setShowSettings, setShowCommandPalette, setShowImportNameModal,
    searchInputRef, focusedItemRef, hasActiveFiltersRef, openAllTargetsRef,
  ]);
}
