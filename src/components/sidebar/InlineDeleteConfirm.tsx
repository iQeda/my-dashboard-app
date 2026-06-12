import { useI18n } from "../../i18n";

interface InlineDeleteConfirmProps {
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

// インライン削除確認（SKILL.md #2: window.confirm は WKWebView で UI を破壊するため不使用）
export function InlineDeleteConfirm({ onConfirm, onCancel }: InlineDeleteConfirmProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
      <span className="flex-1 text-[11px] text-red-600 dark:text-red-400">{t("delete_confirm")}</span>
      <button onClick={onConfirm} className="px-2 py-0.5 rounded text-[11px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer">{t("yes")}</button>
      <button onClick={onCancel} className="px-2 py-0.5 rounded text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">{t("no")}</button>
    </div>
  );
}
