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

---

## #11: Global Shortcut キー録音が `input onKeyDown` で動作しない

**症状**: Settings のショートカット設定で `<input onKeyDown>` を使ってキーコンビネーションを録音しようとすると、修飾キー（Cmd, Shift 等）のみの押下が取れない、またはイベントがフォーカス外で発火しない。

**原因**: Tauri v2 の WKWebView では `<input>` 要素の `onKeyDown` イベントが修飾キーの組み合わせを正しくキャプチャできないケースがある。特に `keydown` が input にフォーカスしていない場合に発火しない。

**回避策**: `window.addEventListener("keydown", handler, true)` と `window.addEventListener("keyup", handler, true)` を capture phase で登録。`keydown` で押されたキーを `Set` に蓄積し、`keyup` で全キーが離された時点でショートカット文字列を生成する。

```typescript
// Recording ボタンが押された後のロジック
useEffect(() => {
  if (!isRecording) return;
  const keys = new Set<string>();

  const onKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    keys.add(e.key);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // keys Set から shortcut 文字列を生成
    const shortcut = buildShortcutString(keys);
    if (shortcut) setRecordedShortcut(shortcut);
    keys.delete(e.key);
    if (keys.size === 0) stopRecording();
  };

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  return () => {
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
  };
}, [isRecording]);
```

**該当ファイル**: `src/components/SettingsModal.tsx`

---

## #12: `e.key` の値が Tauri ショートカット形式と異なる

**症状**: `e.key` で取得したキー名をそのまま `tauri-plugin-global-shortcut` に渡すと認識されない。例: スペースキーが `" "` (空白文字)、矢印キーが `"ArrowUp"` など。

**原因**: ブラウザの `KeyboardEvent.key` の値と Tauri のショートカット形式（Electron 互換）が異なる。

**回避策**: KEY_MAP を定義して `e.key` → Tauri 形式に変換する。

```typescript
const KEY_MAP: Record<string, string> = {
  " ": "Space",
  "ArrowUp": "Up",
  "ArrowDown": "Down",
  "ArrowLeft": "Left",
  "ArrowRight": "Right",
  "Control": "CommandOrControl",
  "Meta": "CommandOrControl",
  // ... 他のキーも必要に応じて追加
};

function mapKey(key: string): string {
  return KEY_MAP[key] ?? key;
}
```

修飾キー (`Shift`, `Alt`, `CommandOrControl`) は先頭に、通常キーは末尾に配置して `+` で連結する（例: `"CommandOrControl+Shift+Space"`）。

**該当ファイル**: `src/components/SettingsModal.tsx`

---

## #13: Tauri updater にはコード署名キーが必要

**課題**: `tauri-plugin-updater` を使ったアプリ内自動更新では、更新バンドルの署名検証が必須。署名キーがないとビルドが失敗する。

**対応**:

1. 署名キーペアを生成:
   ```bash
   cargo tauri signer generate -w src-tauri/keys/myapp.key
   ```
2. 秘密鍵は `src-tauri/keys/` に保存（`.gitignore` に `src-tauri/keys/` を追加済み）
3. ビルド時に環境変数で秘密鍵の**内容**を指定（パスではなく内容を渡す）:
   ```bash
   TAURI_SIGNING_PRIVATE_KEY=$(cat src-tauri/keys/myapp.key) cargo tauri build
   ```
4. `tauri.conf.json` に `"createUpdaterArtifacts": true` と `"pubkey"` を設定
5. ビルドすると `.sig` ファイルと `latest.json` が自動生成される
6. GitHub Release に `latest.json` と `.sig` を含めることで、エンドポイント経由で更新チェック・署名検証

**注意**:
- 環境変数名は `TAURI_SIGNING_PRIVATE_KEY`（`_PATH` ではない）。鍵ファイルの**内容**を直接渡す
- 秘密鍵はリポジトリに含めないこと
- **CI/CD**: `.github/workflows/release.yml` で `TAURI_SIGNING_PRIVATE_KEY` と `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` を GitHub Secrets から参照して自動ビルドしている。ローカルビルドは開発時のみ

**該当ファイル**: `src-tauri/tauri.conf.json`, `.gitignore`

---

## #14: ESLint `react-hooks/refs` と `react-hooks/set-state-in-effect` ルールが Tauri パターンと衝突

**症状**: ESLint v9 + `eslint-plugin-react-hooks` v7 で `react-hooks/refs`（ref を依存配列に含めろ）と `react-hooks/set-state-in-effect`（effect 内で setState するな）がエラーになる。

**原因**: Tauri アプリでは `configRef` パターン（`useRef` で最新 state を追跡）や、`useEffect` 内でイベントリスナー経由の `setState` が多用される。これらは React の推奨パターンとは異なるが、Tauri の制約上必要な設計。

**回避策**: `eslint.config.js` で該当ルールを `"warn"` に下げる。完全に無効化はせず、意図しない使用は警告で検出する。

```javascript
rules: {
  'react-hooks/set-state-in-effect': 'warn',
  'react-hooks/refs': 'warn',
},
```

**該当ファイル**: `eslint.config.js`
