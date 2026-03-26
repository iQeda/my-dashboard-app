import { useState, useCallback } from "react";
import { ToolbarDropdown, DropdownItem, DropdownSeparator, DropdownLabel } from "./ToolbarDropdown";
import { useI18n } from "../i18n";
import type { CardSize, ViewMode } from "../types";
import type { SortOrder, TypeFilter } from "../hooks/useFilter";

interface ToolbarControlsProps {
  readonly viewMode: ViewMode;
  readonly onSetViewMode: (mode: ViewMode) => void;
  readonly cardSize: CardSize;
  readonly onSetCardSize: (size: CardSize) => void;
  readonly sortOrder: SortOrder;
  readonly onSetSortOrder: (order: SortOrder) => void;
  readonly typeFilter: TypeFilter;
  readonly onSetTypeFilter: (filter: TypeFilter) => void;
}

export function ToolbarControls({ viewMode, onSetViewMode, cardSize, onSetCardSize, sortOrder, onSetSortOrder, typeFilter, onSetTypeFilter }: ToolbarControlsProps) {
  const { t } = useI18n();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  }, []);
  const close = useCallback(() => setOpenDropdown(null), []);

  const viewIcon = viewMode === "card" ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  const filterIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );

  const sortIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {sortOrder === "desc" ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4 4m0 0l4-4m-4 4V4" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4-4m0 0l4 4m-4-4v12" />
      )}
    </svg>
  );

  const SIZE_LABELS: Record<CardSize, string> = { sm: "S", md: "M", lg: "L" };

  return (
    <div className="flex gap-1.5 shrink-0">
      {/* Display */}
      <ToolbarDropdown
        label={t("toolbar_display")}
        icon={viewIcon}
        isOpen={openDropdown === "display"}
        onToggle={() => toggle("display")}
        onClose={close}
      >
        <DropdownItem label={t("view_list")} isSelected={viewMode === "list"} onClick={() => { onSetViewMode("list"); close(); }} />
        <DropdownItem label={t("view_card")} isSelected={viewMode === "card"} onClick={() => { onSetViewMode("card"); close(); }} />
        {viewMode === "card" && (
          <>
            <DropdownSeparator />
            <DropdownLabel>{t("card_size")}</DropdownLabel>
            {(["sm", "md", "lg"] as const).map((size) => (
              <DropdownItem key={size} label={SIZE_LABELS[size]} isSelected={cardSize === size} onClick={() => { onSetCardSize(size); close(); }} />
            ))}
          </>
        )}
      </ToolbarDropdown>

      {/* Filter */}
      <ToolbarDropdown
        label={t("toolbar_filter")}
        icon={filterIcon}
        isOpen={openDropdown === "filter"}
        onToggle={() => toggle("filter")}
        onClose={close}
        isActive={typeFilter !== "all"}
      >
        <DropdownItem label={t("type_all")} isSelected={typeFilter === "all"} onClick={() => { onSetTypeFilter("all"); close(); }} />
        <DropdownItem label={t("app")} isSelected={typeFilter === "app"} onClick={() => { onSetTypeFilter("app"); close(); }} />
        <DropdownItem label={t("web")} isSelected={typeFilter === "url"} onClick={() => { onSetTypeFilter("url"); close(); }} />
      </ToolbarDropdown>

      {/* Sort */}
      <ToolbarDropdown
        label={t("toolbar_sort")}
        icon={sortIcon}
        isOpen={openDropdown === "sort"}
        onToggle={() => toggle("sort")}
        onClose={close}
      >
        <DropdownItem label={t("sort_asc_name")} isSelected={sortOrder === "asc"} onClick={() => { onSetSortOrder("asc"); close(); }} />
        <DropdownItem label={t("sort_desc_name")} isSelected={sortOrder === "desc"} onClick={() => { onSetSortOrder("desc"); close(); }} />
      </ToolbarDropdown>
    </div>
  );
}
