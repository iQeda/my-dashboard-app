import type { TagDef, Category } from "../../types";
import { useI18n } from "../../i18n";
import { MenuSurface, PinToggleMenuItem } from "../MenuSurface";
import { PencilIcon, TrashIcon } from "../icons";

// タグ / カテゴリ行の右クリックメニュー
export type CtxMenuState =
  | { readonly kind: "tag"; readonly tag: TagDef; readonly x: number; readonly y: number }
  | { readonly kind: "category"; readonly cat: Category; readonly x: number; readonly y: number }
  | null;

interface SidebarContextMenuProps {
  readonly state: NonNullable<CtxMenuState>;
  readonly isPinned: boolean;
  readonly onTogglePin: () => void;
  readonly onRename: () => void;
  readonly onChangeColor?: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}

export function SidebarContextMenu({
  state,
  isPinned,
  onTogglePin,
  onRename,
  onChangeColor,
  onDelete,
  onClose,
}: SidebarContextMenuProps) {
  const { t } = useI18n();

  const btn = "flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer";

  return (
    <MenuSurface x={state.x} y={state.y} onClose={onClose} className="w-44">
      <PinToggleMenuItem isPinned={isPinned} onToggle={onTogglePin} onClose={onClose} />
      <button onClick={() => { onRename(); onClose(); }} className={`${btn} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10`}>
        <PencilIcon className="w-4 h-4 text-gray-400" />
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
        <TrashIcon className="w-4 h-4" />
        {t("delete")}
      </button>
    </MenuSurface>
  );
}
