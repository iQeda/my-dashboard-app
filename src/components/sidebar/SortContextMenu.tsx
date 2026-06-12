import { useI18n } from "../../i18n";
import { MenuSurface } from "../MenuSurface";

interface SortContextMenuProps {
  readonly x: number;
  readonly y: number;
  readonly onSortAsc: () => void;
  readonly onSortDesc: () => void;
  readonly onClose: () => void;
}

// Categories / Tags / Pinned 見出しの右クリックソートメニュー
export function SortContextMenu({ x, y, onSortAsc, onSortDesc, onClose }: SortContextMenuProps) {
  const { t } = useI18n();

  const btn = "flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer";

  return (
    <MenuSurface x={x} y={y} onClose={onClose} className="w-40">
      <button onClick={onSortAsc} className={btn}>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
        {t("sort_asc_name")}
      </button>
      <button onClick={onSortDesc} className={btn}>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4 4m0 0l4-4m-4 4V4" /></svg>
        {t("sort_desc_name")}
      </button>
    </MenuSurface>
  );
}
