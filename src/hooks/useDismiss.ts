import { useEffect } from "react";

interface UseDismissOptions {
  // Escape キーでも閉じる（デフォルト true）。
  // EmojiPicker / AppPicker のようにモーダル親と Escape を協調するもの
  // （SKILL.md #5 の onOpenChange プロトコル）は false にして呼び出し側で制御する。
  readonly escape?: boolean;
  // 開閉 state を持つドロップダウン用。false の間はリスナーを張らない
  readonly enabled?: boolean;
}

// outside-mousedown + Escape で閉じるリスナー定型を吸収する。
// refs のいずれかの要素内で mousedown された場合は閉じない。
export function useDismiss(
  refs: readonly React.RefObject<HTMLElement | null>[],
  onDismiss: () => void,
  opts?: UseDismissOptions,
) {
  const escape = opts?.escape ?? true;
  const enabled = opts?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const present = refs.filter((r) => r.current !== null);
      if (present.length === 0) return;
      if (present.some((r) => r.current!.contains(target))) return;
      onDismiss();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("mousedown", handleMouseDown);
    if (escape) document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      if (escape) document.removeEventListener("keydown", handleKeyDown);
    };
    // refs は安定した RefObject 前提のため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDismiss, escape, enabled]);
}
