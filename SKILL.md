# SKILL.md - Tauri v2 + React 開発で踏んだ地雷と回避策

このファイルは MyDashboard 開発中に遭遇した Tauri v2 (WKWebView) + React 固有の問題と、その回避策を記録する。同じパターンの再発を防ぐためのナレッジベース。

---

## #1: `<form>` 内の `type="button"` が submit を発火する

**症状**: `<form>` 内に `type="button"` を指定した `<button>` を配置しても、クリック時にフォームの `onSubmit` が発火する。

**原因**: Tauri v2 の WKWebView が `type="button"` 属性を正しく処理しないケースがある。

**回避策**: `<form>` を使わず `<div>` に変更。Save ボタンは `type="button"` + `onClick` で `handleSubmit` を直接呼ぶ。HTML バリデーション (`required` 等) は JS 側のバリデーション関数で代替。

**該当ファイル**: `src/components/ItemFormModal.tsx`

---

## #2: `window.confirm()` が UI を破壊する

**症状**: `window.confirm()` を呼ぶと、確認ダイアログが表示される前に背後の React コンポーネントが消える。

**原因**: Tauri の WKWebView で `window.confirm()` が同期的にブロックせず、非同期的に処理されるため、React の state が不整合になる。

**回避策**: `window.confirm()` を一切使わず、インライン確認 UI（Yes/No ボタン）で代替。

**該当ファイル**: `src/components/Sidebar.tsx` (タグ/カテゴリ削除)

---

## #3: IME 変換中の Enter で操作が発火する

**症状**: 日本語入力中に変換確定の Enter を押すと、入力欄の submit 処理が実行される。

**原因**: `e.nativeEvent.isComposing` や `compositionstart`/`compositionend` イベントが Tauri の WKWebView で正常に動作しない。

**回避策**: Enter キーでの操作（タグ追加等）を完全に廃止。ボタンクリックのみで操作する設計に変更。`handleTagKeyDown` では Enter の `preventDefault` のみ行い、`handleAddTag()` は呼ばない。

**該当ファイル**: `src/components/ItemFormModal.tsx`

---

## #4: HTML5 Drag and Drop が動作しない

**症状**: `draggable` 属性を設定したタグのドラッグ&ドロップが反応しない。

**原因**: Tauri v2 の WKWebView で HTML5 Drag and Drop API が正常に動作しない。

**回避策**: Pointer Events (`pointerdown`/`pointermove`/`pointerup`) で独自実装。5px 以上動かないとドラッグ開始しない（クリックとの誤判定防止）。`setPointerCapture` でイベントをキャプチャ。

**該当ファイル**: `src/components/Sidebar.tsx` (タグ/カテゴリの並び替え), `src/App.tsx` (サイドバー幅リサイズ)

---

## #5: `createPortal` のイベントがモーダルに伝播する

**症状**: `createPortal` でレンダリングしたドロップダウン（EmojiPicker、AppPicker）内をクリック/Escape すると、背後のモーダルが閉じる。

**原因**:
1. **クリック**: `createPortal` は DOM 的にはモーダル外にレンダリングされるが、React のイベントバブリングはポータル元のコンポーネントツリーを辿る。
2. **Escape**: 両方のコンポーネントが `window.addEventListener("keydown")` でリッスンしているため、ピッカーを閉じる Escape がモーダルも閉じる。

**回避策**:
1. モーダル背景の `onClick` → `onMouseDown` に変更 + `e.target === e.currentTarget` チェック
2. EmojiPicker に `onOpenChange` コールバックを追加し、ピッカーが開いている間は `emojiPickerOpenRef` を参照してモーダルの Escape を無視

```typescript
// NG: onClick でポータルのクリックも拾う
<div onClick={onClose}>

// OK: 直接クリックのみ反応
<div onMouseDown={(e) => {
  if (e.target === e.currentTarget) onClose();
}}>

// Escape の制御
const emojiPickerOpenRef = useRef(false);
emojiPickerOpenRef.current = emojiPickerOpen;

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (emojiPickerOpenRef.current) return; // ピッカーが開いている間は無視
      onClose();
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [onClose]);
```

**該当ファイル**: `src/components/ItemFormModal.tsx`, `src/components/EmojiPicker.tsx`

---

## #6: 連続 saveConfig で config が上書きされる

**症状**: アイテム保存 → 絵文字履歴更新を連続で呼ぶと、2回目の保存が1回目の変更を上書きしてしまう（絵文字が保存されない）。

**原因**: `useCallback` + `configRef` パターンで最新の config を参照しているが、React の `setConfig` はバッチ更新のため、同じレンダーサイクル内では `configRef.current` に反映されない。

```
1. updateItem → saveConfig(icon付きconfig) → setConfig(new)
2. addEmojiToHistory → configRef.current はまだ古い → saveConfig(iconなしconfig) で上書き
```

**回避策**: 複数の config 変更を1回の `saveConfig` にまとめる。`addItem`/`updateItem` 内で `emojiHistory` も同時に更新する。

```typescript
// NG: 連続呼び出し
await updateItem(item);
await addEmojiToHistory(item.icon); // 古い config で上書き

// OK: 1回にまとめる
const newConfig = {
  ...current,
  items: current.items.map(i => i.id === item.id ? item : i),
  emojiHistory: updateEmojiHistory(current, item.icon),
};
await saveConfig(newConfig);
```

**一般原則**: `configRef.current` を使った連続 `saveConfig` は禁止。1つのアクションで config を変更する場合は、必ず1回の `saveConfig` にまとめること。

**該当ファイル**: `src/hooks/useConfig.ts`, `src/App.tsx`

---

## #7: TypeScript の unused variable でビルドが失敗する

**症状**: `pnpm build` が `TS6133: 'xxx' is declared but its value is never read` で失敗する。`cargo tauri dev` のフロントエンドが更新されず、古いコードが配信される。

**原因**: `tsc -b` が `pnpm build` のステップに含まれており、unused variable があるとビルドが止まる。

**回避策**: コード変更後は必ず `pnpm build` を実行して確認。特にリネームや props 変更後は要注意。

---

## #8: `overflow-y-auto` がスクロールできない

**症状**: `overflow-y-auto` を設定したコンテナでスクロール操作ができない。

**原因**: Tauri の WKWebView でのスクロール処理の問題。

**回避策**: `overflow-y-scroll` + `overscroll-contain` を使用。

```html
<!-- NG -->
<div class="overflow-y-auto">

<!-- OK -->
<div class="overflow-y-scroll overscroll-contain">
```

**該当ファイル**: `src/components/EmojiPicker.tsx`

---

## #9: リネーム時の既存コード衝突

**症状**: `Category` を `TagDef` にリネームした際、新しい `Category` 型と既存の変数名・メソッド名が衝突してコンパイルエラーが大量発生。

**原因**: 旧 `Category` 型がタグ定義として全ファイルで使われていたが、新しい概念の `Category` を追加する際に名前が衝突。

**回避策**: リネーム作業は以下の順序で行う:
1. 型定義（`types/index.ts`）を先に変更
2. Rust 側（`commands.rs`）を変更。`serde(alias = "旧名")` で後方互換を維持可能
3. `useConfig.ts` → `App.tsx` → 全コンポーネントの順で参照を更新
4. default-config.json と既存 config.json のキー名も更新
5. `pnpm build` で unused variable がないか確認

**教訓**: 広範囲リネームは `pnpm build` のたびに未使用変数エラーで失敗しやすい。こまめにビルドチェックすること。

---

## #10: Duplicate アイテムの命名規則

**課題**: `Copy of XXX` という名前だと、昇順ソートでオリジナルから離れた位置に表示される。

**解決**: `XXX (Copy)` にすることで、ソートでオリジナル直下に並ぶ。

**該当ファイル**: `src/hooks/useConfig.ts` (`duplicateItem`)
