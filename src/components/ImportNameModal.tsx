import { useState } from "react";
import { useI18n } from "../i18n";
import { ModalShell } from "./ModalShell";

interface ImportNameModalProps {
  readonly initialName: string;
  readonly onConfirm: (name: string) => void;
  readonly onClose: () => void;
}

// インポートした config を別名プロファイルとして保存する際の名前入力モーダル
export function ImportNameModal({ initialName, onConfirm, onClose }: ImportNameModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);

  return (
    <ModalShell onClose={onClose} zClassName="z-[60]">
      <div className="w-full max-w-sm mx-4 p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t("save_as_profile")}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("import_profile_desc")}</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("profile_name")}
          autoFocus
          className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">{t("cancel")}</button>
          <button onClick={() => onConfirm(name)} disabled={!name.trim()} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-30 transition-colors cursor-pointer">{t("save")}</button>
        </div>
      </div>
    </ModalShell>
  );
}
