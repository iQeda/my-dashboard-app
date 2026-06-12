import { memo } from "react";
import type { DashboardItem, TagDef, CardSize } from "../types";
import { itemIcon } from "../constants";
import { FavoriteStarButton, EditIconButton, TagBadges, ItemTypeBadge, useItemCtxMenu } from "./item-parts";

interface ItemCardProps {
  readonly item: DashboardItem;
  readonly tagDefs: readonly TagDef[];
  readonly cardSize: CardSize;
  readonly onEdit: (item: DashboardItem) => void;
  readonly onToggleFavorite: (id: string) => void;
  readonly onDuplicate?: (id: string) => void;
  readonly onDelete?: (id: string) => void;
  readonly onLaunch: (item: DashboardItem) => void;
  readonly onSelect?: (item: DashboardItem) => void;
  readonly onToggleTag?: (tagId: string) => void;
  readonly isFocused?: boolean;
}

const PADDING: Record<CardSize, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const ICON_SIZE: Record<CardSize, string> = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-5xl",
};

const NAME_SIZE: Record<CardSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

const GAP: Record<CardSize, string> = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

const TITLE_MT: Record<CardSize, string> = {
  sm: "mt-4",
  md: "mt-2",
  lg: "mt-2",
};

export const ItemCard = memo(function ItemCard({ item, tagDefs, cardSize, onEdit, onToggleFavorite, onDuplicate, onDelete, onLaunch, onSelect, onToggleTag, isFocused }: ItemCardProps) {
  const { onContextMenu, menu } = useItemCtxMenu(item, { onEdit, onToggleFavorite, onDuplicate, onDelete });

  const handleClick = () => { onSelect?.(item); };
  const handleDoubleClick = () => { onLaunch(item); };

  return (
    <div
      onContextMenu={onContextMenu}
      data-focused={isFocused || undefined}
      className={`group relative flex flex-col items-start ${GAP[cardSize]} ${PADDING[cardSize]} rounded-xl bg-white/70 dark:bg-white/8 border hover:shadow-lg hover:scale-[1.03] hover:border-blue-300 dark:hover:border-blue-500/40 transition-all duration-200 ${isFocused ? "ring-2 ring-blue-500/60 border-blue-400 dark:border-blue-500/50" : "border-gray-200 dark:border-white/10"}`}
    >
      <FavoriteStarButton item={item} onToggleFavorite={onToggleFavorite} iconClassName="w-4 h-4" className="absolute top-2 left-2" withTitle />

      <ItemTypeBadge type={item.type} className="absolute top-2 right-2 text-xs group-hover:opacity-0 transition-opacity" />

      <EditIconButton item={item} onEdit={onEdit} className="absolute top-2 right-2" />

      <button
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`flex flex-col items-start ${GAP[cardSize]} cursor-pointer w-full flex-1`}
      >
        <div className={`flex items-start ${GAP[cardSize]} w-full ${TITLE_MT[cardSize]}`}>
          <span className={`${ICON_SIZE[cardSize]} shrink-0`}>{itemIcon(item)}</span>
          <span className={`${NAME_SIZE[cardSize]} font-medium text-gray-800 dark:text-gray-200 leading-tight`}>
            {item.name}
          </span>
        </div>

        <div className="flex-1" />

        {item.description && (
          <span className="text-xs text-gray-500 dark:text-gray-400 leading-snug line-clamp-2 w-full text-left">
            {item.description}
          </span>
        )}

        <TagBadges item={item} tagDefs={tagDefs} onToggleTag={onToggleTag} />
      </button>

      {menu}
    </div>
  );
});
