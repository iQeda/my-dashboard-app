interface ModalShellProps {
  readonly onClose: () => void;
  // 配置クラス（デフォルト: 中央寄せ。CommandPalette は上寄せ等で上書き）
  readonly positionClassName?: string;
  readonly zClassName?: string;
  readonly children: React.ReactNode;
}

// モーダルオーバーレイの単一ソース。
// SKILL.md #5: createPortal 内のクリックが backdrop へ伝播するため、
// onClick ではなく onMouseDown + e.target === e.currentTarget で閉じる。
export function ModalShell({ onClose, positionClassName = "items-center justify-center", zClassName = "z-50", children }: ModalShellProps) {
  return (
    <div
      className={`fixed inset-0 ${zClassName} flex ${positionClassName} bg-black/40 backdrop-blur-sm`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
