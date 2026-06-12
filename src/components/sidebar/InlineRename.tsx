import { useState } from "react";

interface InlineRenameProps {
  readonly value: string;
  readonly onSave: (value: string) => void;
  readonly onCancel: () => void;
  readonly validate?: (value: string) => string | null;
}

// インラインのリネーム入力（IME 対応のため isComposing 中の Enter は無視）
export function InlineRename({ value, onSave, onCancel, validate }: InlineRenameProps) {
  const [text, setText] = useState(value);
  const [error, setError] = useState("");
  const trySave = () => {
    const t = text.trim();
    if (!t || t === value) { onCancel(); return; }
    const err = validate?.(t);
    if (err) { setError(err); return; }
    onSave(t);
  };
  return (
    <div className="flex flex-col gap-0.5">
      <input
        type="text"
        value={text}
        onChange={(e) => { setText(e.target.value); setError(""); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) trySave();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={trySave}
        autoFocus
        className={`w-full px-2 py-1 rounded bg-white dark:bg-gray-700 border text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${error ? "border-red-400 dark:border-red-500" : "border-blue-300 dark:border-blue-500/40"}`}
      />
      {error && <span className="text-[10px] text-red-500 dark:text-red-400 px-1">{error}</span>}
    </div>
  );
}
