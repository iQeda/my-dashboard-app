import type { DashboardItem } from "../types";
import { useI18n } from "../i18n";
import { MenuSurface } from "./MenuSurface";
import { PencilIcon, StarIcon, TrashIcon } from "./icons";

interface ContextMenuProps {
  readonly item: DashboardItem;
  readonly x: number;
  readonly y: number;
  readonly onEdit: () => void;
  readonly onDuplicate?: () => void;
  readonly onToggleFavorite: () => void;
  readonly onDelete?: () => void;
  readonly onClose: () => void;
}

export function ContextMenu({ item, x, y, onEdit, onDuplicate, onToggleFavorite, onDelete, onClose }: ContextMenuProps) {
  const { t } = useI18n();

  const btnClass = "flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer";

  return (
    <MenuSurface x={x} y={y} onClose={onClose} className="w-48">
      <button
        onClick={() => { onEdit(); onClose(); }}
        className={`${btnClass} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10`}
      >
        <PencilIcon className="w-4 h-4 text-gray-400" />
        {t("edit")}
      </button>

      {onDuplicate && (
        <button
          onClick={() => { onDuplicate(); onClose(); }}
          className={`${btnClass} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10`}
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {t("duplicate")}
        </button>
      )}

      <button
        onClick={() => { onToggleFavorite(); onClose(); }}
        className={`${btnClass} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10`}
      >
        <StarIcon className="w-4 h-4 text-gray-400" filled={item.favorite} />
        {item.favorite ? t("unfavorite") : t("favorite")}
      </button>

      {onDelete && (
        <>
          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
          <button
            onClick={() => { onDelete(); onClose(); }}
            className={`${btnClass} text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
          >
            <TrashIcon className="w-4 h-4" />
            {t("delete")}
          </button>
        </>
      )}
    </MenuSurface>
  );
}
