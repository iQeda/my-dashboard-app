import type { DashboardItem, TagDef } from "../types";
import { itemIcon } from "../constants";
import { FavoriteStarButton, EditIconButton, TagBadges, ItemTypeBadge, useItemCtxMenu } from "./item-parts";

interface ItemRowProps {
  readonly item: DashboardItem;
  readonly tagDefs: readonly TagDef[];
  readonly onEdit: (item: DashboardItem) => void;
  readonly onToggleFavorite: (id: string) => void;
  readonly onDuplicate?: (id: string) => void;
  readonly onDelete?: (id: string) => void;
  readonly onLaunch: (item: DashboardItem) => void;
  readonly onSelect?: (item: DashboardItem) => void;
  readonly onToggleTag?: (tagId: string) => void;
  readonly isFocused?: boolean;
}

export function ItemRow({ item, tagDefs, onEdit, onToggleFavorite, onDuplicate, onDelete, onLaunch, onSelect, onToggleTag, isFocused }: ItemRowProps) {
  const { onContextMenu, menu } = useItemCtxMenu(item, { onEdit, onToggleFavorite, onDuplicate, onDelete });

  const handleClick = () => { onSelect?.(item); };
  const handleDoubleClick = () => { onLaunch(item); };

  return (
    <div
      onContextMenu={onContextMenu}
      data-focused={isFocused || undefined}
      className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/70 dark:hover:bg-white/5 transition-colors ${isFocused ? "bg-blue-50/70 dark:bg-blue-900/20 ring-1 ring-blue-500/40" : ""}`}
    >
      <FavoriteStarButton item={item} onToggleFavorite={onToggleFavorite} iconClassName="w-3.5 h-3.5" className="shrink-0" />

      <button onClick={handleClick} onDoubleClick={handleDoubleClick} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
        <span className="text-xl shrink-0">{itemIcon(item)}</span>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate shrink-0">
          {item.name}
        </span>
        <TagBadges item={item} tagDefs={tagDefs} onToggleTag={onToggleTag} className="shrink-0" />
        {item.description && (
          <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
            {item.description}
          </span>
        )}
        <ItemTypeBadge type={item.type} className="ml-auto text-[10px] shrink-0" />
      </button>

      <EditIconButton item={item} onEdit={onEdit} className="shrink-0" />

      {menu}
    </div>
  );
}
