import { useState } from "react";
import type { DashboardItem, TagDef, CardSize } from "../types";
import { ContextMenu } from "./ContextMenu";
import { useI18n } from "../i18n";

interface ItemCardProps {
  readonly item: DashboardItem;
  readonly tagDefs: readonly TagDef[];
  readonly cardSize: CardSize;
  readonly onEdit: (item: DashboardItem) => void;
  readonly onToggleFavorite: (id: string) => void;
  readonly onDuplicate: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onLaunch: (item: DashboardItem) => void;
}

const DEFAULT_ICONS: Record<string, string> = {
  app: "\uD83D\uDDA5\uFE0F",
  url: "\uD83C\uDF10",
};

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

export function ItemCard({ item, tagDefs, cardSize, onEdit, onToggleFavorite, onDuplicate, onDelete, onLaunch }: ItemCardProps) {
  const { t } = useI18n();
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);

  const handleClick = () => { onLaunch(item); };

  const tagColors = item.tags
    .map((tag) => tagDefs.find((c) => c.id === tag))
    .filter(Boolean);

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        setCtx({ x: e.clientX, y: e.clientY });
      }}
      className={`group relative flex flex-col items-start ${GAP[cardSize]} ${PADDING[cardSize]} rounded-xl bg-white/70 dark:bg-white/8 border border-gray-200 dark:border-white/10 hover:shadow-lg hover:scale-[1.03] hover:border-blue-300 dark:hover:border-blue-500/40 transition-all duration-200`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(item.id);
        }}
        className={`absolute top-2 left-2 p-0.5 rounded transition-all cursor-pointer ${
          item.favorite
            ? "text-yellow-400 opacity-100"
            : "text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-yellow-400"
        }`}
        title={item.favorite ? t("remove_from_favorites") : t("add_to_favorites")}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill={item.favorite ? "currentColor" : "none"} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </button>

      <span className={`absolute top-2 right-2 text-xs uppercase tracking-wider font-bold group-hover:opacity-0 transition-opacity ${
        item.type === "app"
          ? "text-blue-400 dark:text-blue-500"
          : "text-emerald-400 dark:text-emerald-500"
      }`}>
        {item.type === "app" ? t("app") : t("web")}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(item);
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all cursor-pointer"
        title={t("edit")}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      <button
        onClick={handleClick}
        className={`flex flex-col items-start ${GAP[cardSize]} cursor-pointer w-full flex-1`}
      >
        <div className={`flex items-center ${GAP[cardSize]} w-full mt-2`}>
          <span className={ICON_SIZE[cardSize]}>{item.icon ?? DEFAULT_ICONS[item.type] ?? "\uD83D\uDCE6"}</span>
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

        <div className="flex flex-wrap gap-1">
          {tagColors.map(
            (cat) =>
              cat && (
                <span
                  key={cat.id}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.label}
                </span>
              ),
          )}
        </div>
      </button>

      {ctx && (
        <ContextMenu
          item={item}
          x={ctx.x}
          y={ctx.y}

          onEdit={() => onEdit(item)}
          onDuplicate={() => onDuplicate(item.id)}
          onToggleFavorite={() => onToggleFavorite(item.id)}
          onDelete={() => onDelete(item.id)}
          onClose={() => setCtx(null)}
        />
      )}
    </div>
  );
}
