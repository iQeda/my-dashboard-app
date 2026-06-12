interface CategoryTagCardProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly count: number;
  readonly onClick: () => void;
  readonly onContextMenu?: (e: React.MouseEvent) => void;
}

// Dashboard のカテゴリ・タグカード共通スタイル
// （同一サイズ・同一ホバー: 青ボーダー + scale アニメーション）
export function CategoryTagCard({ icon, label, count, onClick, onContextMenu }: CategoryTagCardProps) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 dark:bg-white/8 border border-gray-200 dark:border-white/10 hover:shadow-md hover:scale-[1.03] hover:border-blue-300 dark:hover:border-blue-500/40 transition-all cursor-pointer"
    >
      {icon}
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{count}</span>
    </button>
  );
}
