import { useState } from "react";
import type { DashboardItem, TagDef } from "../types";
import { ContextMenu } from "./ContextMenu";
import { useI18n } from "../i18n";

interface ItemRowProps {
  readonly item: DashboardItem;
  readonly tagDefs: readonly TagDef[];
  readonly onEdit: (item: DashboardItem) => void;
  readonly onToggleFavorite: (id: string) => void;
  readonly onDuplicate: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onLaunch: (item: DashboardItem) => void;
  readonly onToggleTag?: (tagId: string) => void;
}

const DEFAULT_ICONS: Record<string, string> = {
  app: "\uD83D\uDDA5\uFE0F",
  url: "\uD83C\uDF10",
};

export function ItemRow({ item, tagDefs, onEdit, onToggleFavorite, onDuplicate, onDelete, onLaunch, onToggleTag }: ItemRowProps) {
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
      className="group flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/70 dark:hover:bg-white/5 transition-colors"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(item.id);
        }}
        className={`p-0.5 rounded transition-all cursor-pointer shrink-0 ${
          item.favorite
            ? "text-yellow-400 opacity-100"
            : "text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-yellow-400"
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={item.favorite ? "currentColor" : "none"} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </button>

      <button onClick={handleClick} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
        <span className="text-xl shrink-0">{item.icon ?? DEFAULT_ICONS[item.type] ?? "\uD83D\uDCE6"}</span>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate shrink-0">
          {item.name}
        </span>
        <div className="flex flex-wrap gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {tagColors.map(
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
        {item.description && (
          <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
            {item.description}
          </span>
        )}
        <span className={`ml-auto text-[10px] uppercase tracking-wider font-bold shrink-0 ${
          item.type === "app"
            ? "text-blue-400 dark:text-blue-500"
            : "text-emerald-400 dark:text-emerald-500"
        }`}>
          {item.type === "app" ? t("app") : t("web")}
        </span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(item);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all cursor-pointer shrink-0"
        title={t("edit")}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
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
