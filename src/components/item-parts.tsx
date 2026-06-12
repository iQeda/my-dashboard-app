import { useState } from "react";
import type { DashboardItem, TagDef, ItemType } from "../types";
import { ContextMenu } from "./ContextMenu";
import { useI18n } from "../i18n";
import { PencilIcon, StarIcon } from "./icons";

// ItemCard / ItemRow で逐語一致だった部品の単一ソース（REFACTORING_PLAN.md Phase 4-4）。
// カード / 行のレイアウト差は本質的なため、完全統合（1コンポーネント化）はしない。

interface FavoriteStarButtonProps {
  readonly item: DashboardItem;
  readonly onToggleFavorite: (id: string) => void;
  readonly iconClassName: string;
  readonly className?: string;
  readonly withTitle?: boolean;
}

export function FavoriteStarButton({ item, onToggleFavorite, iconClassName, className = "", withTitle }: FavoriteStarButtonProps) {
  const { t } = useI18n();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggleFavorite(item.id);
      }}
      className={`p-0.5 rounded transition-all cursor-pointer ${
        item.favorite
          ? "text-yellow-400 opacity-100"
          : "text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-yellow-400"
      } ${className}`}
      title={withTitle ? (item.favorite ? t("remove_from_favorites") : t("add_to_favorites")) : undefined}
    >
      <StarIcon className={iconClassName} filled={item.favorite} />
    </button>
  );
}

interface EditIconButtonProps {
  readonly item: DashboardItem;
  readonly onEdit: (item: DashboardItem) => void;
  readonly className?: string;
}

export function EditIconButton({ item, onEdit, className = "" }: EditIconButtonProps) {
  const { t } = useI18n();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onEdit(item);
      }}
      className={`opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all cursor-pointer ${className}`}
      title={t("edit")}
    >
      <PencilIcon className="w-3.5 h-3.5" />
    </button>
  );
}

interface TagBadgesProps {
  readonly item: DashboardItem;
  readonly tagDefs: readonly TagDef[];
  readonly onToggleTag?: (tagId: string) => void;
  readonly className?: string;
}

export function TagBadges({ item, tagDefs, onToggleTag, className = "" }: TagBadgesProps) {
  const tags = item.tags
    .map((tag) => tagDefs.find((c) => c.id === tag))
    .filter(Boolean);
  return (
    <div className={`flex flex-wrap gap-1 ${className}`} onClick={(e) => e.stopPropagation()}>
      {tags.map(
        (cat) =>
          cat && (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggleTag?.(cat.id)}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white hover:opacity-80 transition-opacity cursor-pointer"
              style={{ backgroundColor: cat.color }}
            >
              {cat.label}
            </button>
          ),
      )}
    </div>
  );
}

interface ItemTypeBadgeProps {
  readonly type: ItemType;
  readonly className?: string;
}

export function ItemTypeBadge({ type, className = "" }: ItemTypeBadgeProps) {
  const { t } = useI18n();
  return (
    <span
      className={`uppercase tracking-wider font-bold ${
        type === "app"
          ? "text-blue-400 dark:text-blue-500"
          : "text-emerald-400 dark:text-emerald-500"
      } ${className}`}
    >
      {type === "app" ? t("app") : t("web")}
    </span>
  );
}

interface ItemCtxCallbacks {
  readonly onEdit: (item: DashboardItem) => void;
  readonly onToggleFavorite: (id: string) => void;
  readonly onDuplicate?: (id: string) => void;
  readonly onDelete?: (id: string) => void;
}

// 右クリック → ContextMenu 表示の定型（state + ハンドラ + メニュー JSX）
// eslint-disable-next-line react-refresh/only-export-components
export function useItemCtxMenu(item: DashboardItem, callbacks: ItemCtxCallbacks) {
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY });
  };

  const menu = ctx ? (
    <ContextMenu
      item={item}
      x={ctx.x}
      y={ctx.y}
      onEdit={() => callbacks.onEdit(item)}
      onDuplicate={callbacks.onDuplicate ? () => callbacks.onDuplicate!(item.id) : undefined}
      onToggleFavorite={() => callbacks.onToggleFavorite(item.id)}
      onDelete={callbacks.onDelete ? () => callbacks.onDelete!(item.id) : undefined}
      onClose={() => setCtx(null)}
    />
  ) : null;

  return { onContextMenu, menu } as const;
}
