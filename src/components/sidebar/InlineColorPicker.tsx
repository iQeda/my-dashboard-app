import { TAG_COLORS } from "../../constants";

interface InlineColorPickerProps {
  readonly current: string;
  readonly onSelect: (color: string) => void;
  readonly onClose: () => void;
}

// タグ色のインラインピッカー
export function InlineColorPicker({ current, onSelect, onClose }: InlineColorPickerProps) {
  return (
    <div className="px-2 py-2 rounded-md bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-500/40">
      <div className="flex flex-wrap gap-1.5">
        {TAG_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => { onSelect(c); onClose(); }}
            className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${current === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-800" : "hover:scale-110"}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}
