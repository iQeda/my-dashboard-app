# MyDashboard 完全リファクタリング計画

作成日: 2026-06-12
監査方法: 8観点（デッドコード / 重複 / App.tsx 構造 / hooks / Rust / 型・i18n / ビルド・依存 / 規約整合）のマルチエージェント並列監査 + 所見ごとの反証検証（75エージェント、所見59件中58件が検証通過 + 網羅性チェックで7件追加 = **検証済み所見65件**）。すべての所見は file:line 単位で grep / 実読により裏取り済み。

## 背景と目的

コードベース（TS/TSX 約6,300行 + Rust 約470行）には、機能追加の積み重ねで以下の無駄が蓄積している:

1. **削除済み機能の残骸** — PR #15（commit `e46c1c2`）でプロファイル切替 UI を撤去した際の orphan が Rust コマンド・TS 型・config フィールド・i18n キーに散在
2. **コピペ重複** — 同一ロジックの多重実装（dismiss 処理 8箇所、ドラッグ並べ替え 3箇所、slugify 5箇所、SVG アイコン最大7箇所など）
3. **God モジュール** — `App.tsx`(667行・8つの関心事)、`Sidebar.tsx`(634行・内包コンポーネント5つ)、`ItemFormModal.tsx`(538行)
4. **構造的欠陥** — `useConfig()` の二重インスタンス化による潜在データ損失バグ、CI の型チェックが no-op
5. **規約逸脱・ドキュメント乖離** — t() バイパス8箇所、CLAUDE.md/README と実装の矛盾7件

本計画は**外から見た挙動を一切変えない**純粋なリファクタリングとして、これらをフェーズ分けで解消する。

## 全フェーズ共通の原則（遵守事項）

- **SKILL.md #1〜#14 の意図的パターンは維持する。** 特に: configRef + 1アクション1 `saveConfig`（#6）、`<div>` ベースモーダル（#1）、インライン確認 UI（#2）、Pointer Events DnD（#4）、`onMouseDown` + `e.target === e.currentTarget`（#5）、`overflow-y-scroll` + `overscroll-contain`（#8）。**重複の「統合」は許可、パターンの「除去」は禁止。**
- **on-disk config.json の JSON 形式はバイト互換を維持する**（フィールド名・シリアライズ形式・Tauri コマンドのワイヤ形式を変えない）。
- **config.json を CLI/スクリプトで直接書き換えない**（CLAUDE.md Config Safety Rules）。
- 各フェーズ完了ごとに `pnpm build` + `npx tsc -b` + `pnpm lint` + `cd src-tauri && cargo check` + 手動スモークテストを通してからコミット。
- 1フェーズ = 1 PR 以上。大きいフェーズ（4・5）は複数 PR に分割。

---

## フェーズ一覧

| Phase | 内容 | 工数 | リスク | 効果 |
|---|---|---|---|---|
| 0 | 安全網の構築（CI 修正 + テスト導入） | S | 低 | 全フェーズの前提 |
| 1 | デッドコード・未使用資産の一掃 | S | 低 | 約250行 + 約530KB 削減 |
| 2 | config 層の一本化（**最重要**） | M | 中 | 潜在バグ2件解消 + 約120行削減 |
| 3 | ロジックの単一ソース化（純粋関数抽出） | M | 低 | 正しさ結合の解消 |
| 4 | UI プリミティブ・共有フックの抽出 | L | 中 | 数百行削減 |
| 5 | God コンポーネントの分解 | L | 中 | App 667→約300行、Sidebar 634→約350行 |
| 6 | Rust バックエンドの整理 | M | 低 | 約80行削減 + 保守性 |
| 7 | ビルド・CI・規約・ドキュメント整合 | M | 低 | CI 時間短縮 + 規約完全準拠 |
| 8 | （任意）パフォーマンス最適化 | M | 低 | バンドル約60%減 |

依存関係: 0 → 1 → 2 → 3 → 4 → 5（順序必須）。6・7 は Phase 1 完了後いつでも並行可。8 は最後。

---

## Phase 0: 安全網の構築

**目的**: 現状テストが一切なく（`*.test.*` 0件、test script なし、`#[test]` なし）、さらに CI の型チェックが no-op のため、後続フェーズの検証手段を先に確保する。

### タスク

1. **CI の型チェック no-op を修正**: `tsconfig.json` が solution-style（`"files": []` + references のみ）のため、`.github/workflows/ci.yml:22` の `npx tsc --noEmit` は **0ファイルを検査して exit 0 している**（`--listFilesOnly` で実証済み）。`npx tsc -b` に変更する（`noEmit` は各プロジェクト config 側で設定済み。`tsc -b` は現状グリーンであることを確認済み）。CLAUDE.md の Commands 節も合わせて更新。
2. **vitest 導入**: devDependencies に `vitest` + `@testing-library/react` + `happy-dom`（または jsdom）を追加し、`"test": "vitest run"` script と CI ステップを追加。`@tauri-apps/api/core` の `invoke` は `vi.mock` でモック。
3. **キャラクタリゼーションテスト**（統合予定のロジックの現挙動を固定）:
   - `useFilter`: タグ/カテゴリ/お気に入り/タイプ/検索フィルター、combinedFilter・multiTagMode の組み合わせ、ソート順
   - カテゴリグループ順序: `App.tsx:122-145`（displayItems）と `Dashboard.tsx:43-77`（useGroupedItems）が**同一入力に対し同一順序を返すこと**（Phase 3 統合の事前条件）
   - `useConfig` mutators: `updateTagDef`/`updateCategoryDef` のリネーム時 ID 再生成・items 参照同期・pinnedOrder 連動（Phase 2 統合の事前条件）、`updateEmojiHistory` の重複排除と20件上限
   - slugify/uniqueId: `ItemFormModal.tsx:200-264` の3実装の挙動（while-suffix と regex-increment の差異を含めて記録）
4. **Rust テスト**: `cargo test` を CI に追加し、`AppConfig` の serde ラウンドトリップテスト（実 config.json 相当のフィクスチャ → deserialize → serialize → JSON 一致）を書く（Phase 6 の `rename_all` 変更の安全網）。

### 検証
CI が実際に型エラー・テスト失敗で落ちることを、意図的に壊した一時コミットで確認してから revert。

---

## Phase 1: デッドコード・未使用資産の一掃

**目的**: 構造変更の前に削除でコード面積を減らす。すべて grep で参照ゼロを検証済み。

### 1-1. プロファイル切替機能の残骸（クラスタ削除）

PR #15 で UI 撤去後に残った orphan 一式:

- `src/types/index.ts:62-67` — `ConfigProfile` interface（import ゼロ）
- `src/types/index.ts:47` — `AppConfig.hiddenProfiles`（読み書きとも参照ゼロ）と `src/hooks/useConfig.ts:279` の `hiddenProfiles?` パラメータ
- `src-tauri/src/commands.rs:300-344` — `list_config_profiles` / `switch_config`（frontend からの invoke ゼロ。他11コマンドはすべて呼び出しあり）と `ConfigProfile` struct（:278-284）、`src-tauri/src/lib.rs:92-93` の登録2行
- `commands.rs:313` の旧バックアップ方式の死んだフィルタ（`config-backup-` / `.bak` — 現行バックアップは `backups/` サブディレクトリ）
- i18n の dead keys（1-3 にまとめて削除）

> **注意**: Rust 側 `AppConfig.hidden_profiles` serde フィールド（commands.rs:74-75）は**残す**。Rust の AppConfig は typed struct なので、フィールドを消すと既存 config.json に書かれた値が次回 `save_config` で消失する（ラウンドトリップ破壊）。TS 側のみ削除する。

### 1-2. dead なフック API

- `useConfig.ts:288-299` — `addEmojiToHistory`（消費者ゼロ。絵文字履歴は addItem/updateItem 内の private `updateEmojiHistory` で更新済み = CLAUDE.md 通り）
- `useFilter.ts:96-98` — `cycleSortOrder`（App.tsx は `setSortOrder` を使用）
- `useKeyboardNavigation.ts:34` — return 中の `focusedIndex`（内部 state に戻す）

### 1-3. dead i18n キー（6件）

`i18n.tsx` の `active`(:21), `sort_asc`(:64), `sort_desc`(:65), `profiles`(:82), `remove`(:86), `no_items_match`(:110)。`TranslationKey` が `keyof typeof translations` なので、誤削除は tsc が検出する（自己検証的）。

### 1-4. 未使用アセット・依存

- `public/icons.svg`（5KB、参照ゼロ、全ビルドに混入）
- `lp/images/edit_item.png`（388KB、lp/index.html から参照されていない最大画像）
- `src-tauri/icons/Square*.png` ×10 + `StoreLogo.png`（約128KB、Windows Store 用。tauri.conf.json の bundle.icon に含まれず、Mac 専用アプリ）
- `pnpm remove @tauri-apps/plugin-global-shortcut`（JS バインディング import ゼロ。ショートカットは Rust 側 `register_shortcut`/`unregister_all_shortcuts` 経由。**Rust crate は残す**）
- > **`emojibase` は削除しない**: `emojibase-data` が `peerDependencies: { emojibase: "*" }` を持つことを確認済み。
- `src-tauri/capabilities/default.json` — `dialog:allow-open` / `dialog:allow-save`（`dialog:default` に包含、生成スキーマで確認済み）と `global-shortcut:default`（webview→plugin IPC 用だが frontend は JS API を呼ばない）を削除。**削除後にダイアログとグローバルショートカットの動作を手動確認すること。**

### 1-5. 微細な dead 値

- `EmojiPicker.tsx:161` — 検索結果セクションのラベルに `t("no_results")` がセットされるが描画されない（`showSubgroupHeaders` が検索中常に false）
- `Sidebar.tsx:442` — Pinned 見出しの空 `onClick={() => {}}`
- `i18n.tsx` — 不要 export（`TranslationFn`）、stale コメント類

### 検証
`pnpm build` / `npx tsc -b` / `pnpm lint` / `cargo check` + 起動スモーク（ダイアログ・グローバルショートカット・絵文字ピッカー）。

---

## Phase 2: config 層の一本化（最重要）

**目的**: 検証済みの構造欠陥を解消する。**ここはリファクタリングであると同時に潜在バグ修正**（挙動維持の唯一の例外として明記）。

### 2-1. `useConfig()` の二重インスタンス解消

現状: `App()`（App.tsx:24-29、locale 用）と `AppContent`（App.tsx:69-88）が**それぞれ独立に** `useConfig()` を呼び、独立 state + 独立 configRef を持つ。検証済みの実害:

1. 起動時に `invoke("load_config")` が**2回**走る
2. **潜在データ損失バグ**: Settings で言語変更すると外側インスタンスの `updateLocale` が「起動時のままの古い configRef」から `{...current, locale}` を保存し、セッション中の編集を古い内容で上書きし得る（CLAUDE.md 記載の過去インシデントと同種）
3. **永続化設定の復元が壊れている**: AppContent 側インスタンスは config=null で開始するため、`useFilter` の `initialPrefs`（combinedFilter / multiTagMode）の useState 初期化が常に undefined を受け取り、**保存した値が復元されない**

対応:
- `useConfig()` を **App で1回だけ**呼び、`ConfigContext`（provider + `useConfigContext()`）で共有する。AppContent は config ロード完了後にしかマウントされないため、`useFilter` の initialPrefs が実値を受け取れるようになる
- App の locale ミラー state（App.tsx:31-40 の useState + 同期 useEffect）を削除し `config.locale ?? "en"` を直接導出
- configRef + 単一 saveConfig のセマンティクス（SKILL.md #6）は**そのまま維持**

### 2-2. `mutate()` ヘルパーで16関数のボイラープレート集約

`useConfig.ts` の全16 mutator が `const current = configRef.current; if (!current) return; ...; await saveConfig(newConfig);` を反復している（grep で16回ずつ確認済み）。内部ヘルパーに集約:

```typescript
const mutate = useCallback(async (update: (current: AppConfig) => AppConfig | null) => {
  const current = configRef.current;
  if (!current) return;
  const next = update(current);
  if (next) await saveConfig(next);
}, [saveConfig]);
```

各 mutator は `mutate((c) => ({ ...c, items: ... }))` の1〜5行になる。**SKILL.md #6 の「最新 state を configRef で読み、1アクション1 saveConfig」という不変条件はヘルパー内に閉じ込めて保存**。

### 2-3. `updateTagDef` / `updateCategoryDef` の40行コピペ統合

useConfig.ts:141-181 と :200-240 はスラグ再生成・idChanged 判定・pinnedOrder リマップ・pin/unpin 追従まで構造同一。純粋ヘルパーに抽出:

```typescript
function renameAndRepin<T extends { id: string; pinned?: boolean }>(
  defs: readonly T[], pinnedOrder: readonly string[], id: string,
  updates: { label?: string; pinned?: boolean },
): { defs: readonly T[]; pinnedOrder: readonly string[]; newId: string; idChanged: boolean }
```

items 参照の同期（tags 配列リマップ vs category 置換）だけ呼び出し側に残す。**Phase 0 のキャラクタリゼーションテストで挙動一致を保証。**

### 2-4. 型の整理

- `updateViewPrefs` の手書きインライン型（useConfig.ts:279）を `Partial<Pick<AppConfig, "viewMode" | "cardSize" | ...>>` に置換（`ViewPrefs` として types/index.ts から export）
- `AppConfig.locale` を `string` → `Locale` 型に（App.tsx の `as Locale` キャスト2箇所が消える）。シリアライズは不変

### 検証
Phase 0 のフックテスト一式 + 手動: 言語切替→アイテム編集→再起動で両方残ること、combinedFilter/multiTagMode が再起動後に復元されること（**現状は復元されないので、直ることを確認**）。

---

## Phase 3: ロジックの単一ソース化（純粋関数抽出）

**目的**: 「2つの実装が暗黙に一致し続けることに依存している」正しさ結合を解消する。新設: `src/utils/`。

### 3-1. カテゴリグループ順序の統合（正しさ結合・最優先）

`App.tsx:122-145`（displayItems = キーボードフォーカス順）と `Dashboard.tsx:43-77`（useGroupedItems = 描画順）が同一アルゴリズムの独立実装。App.tsx:121 のコメント「matching Dashboard rendering」が結合を自認している。**片方だけ変更するとキーボード移動順と表示順がズレるバグになる**。

→ `src/utils/groupItems.ts` に `groupItemsByCategory(items, categoryList): readonly { categoryId, items }[]` を抽出。Dashboard はラベル解決（catMap / `t("uncategorized")`）を被せ、App は `groups.flatMap(g => g.items)` で平坦化。

### 3-2. Open All の単一化 + stale-closure 修正

- `filteredItems.filter((i) => !i.excludeFromOpenAll)` が **9箇所**（App.tsx:280, 492, 496, 498, 503 / CommandPalette.tsx:96, 99, 199, 233）。App 側は `openAllTargets` useMemo に、CommandPalette 側は `getOpenAllTargets(result, items)` ヘルパーに集約
- 起動ループが3箇所で await セマンティクス不一致（⌘O = 非 await 並列、ボタン = 逐次 await、CommandPalette = 逐次 await）。単一の `openAll = useCallback(async () => { for (...) await launchAndRecord(it); })` に統一
- **潜在バグ修正**: キーボードハンドラの useEffect が `filteredItems` を閉じ込むが依存配列（App.tsx:343）に含まれておらず、⌘O が古いアイテム集合を開き得る。`focusedItemRef` と同じ ref パターン（`filteredItemsRef`）で解消

### 3-3. slugify / uniqueId / ソート比較器

- `label.toLowerCase().replace(/\s+/g, "-")` が5箇所（useConfig.ts:147, :206 / ItemFormModal.tsx:200, :226, :259）。リネーム時 ID 同期機能は「作成側と リネーム側のスラグが一致していること」にコピペで依存している → `src/utils/labels.ts` に `slugify(label)` / `uniqueId(base, existingIds)`（while-suffix 方式に統一）/ `compareLabels` / `sortByLabel` を抽出
- ラベルソート比較器（localeCompare + 昇降フリップ）も5箇所 → 同ファイルに集約。Sidebar の3つのソートハンドラはパラメータ化した1つに

### 3-4. その他の純粋ロジック

- ピン留め順序解決: Sidebar.tsx:341-357 と DashboardOverview.tsx:117-127 の同一アルゴリズム → `src/utils/pinned.ts` の `getOrderedPinnedEntries(categoryList, tagDefs, pinnedOrder)`（`PinnedEntry` 型も export）
- 最近アイテム解決: CommandPalette と DashboardOverview の重複 → `resolveRecentItems(items, recentAccess)`
- `DEFAULT_ICONS` の3重定義（ItemCard.tsx:20-23 / ItemRow.tsx:19-22 / CommandPalette.tsx:20-23）と fallback 式 → `src/constants.ts` に `DEFAULT_ICONS: Record<ItemType, string>` + `itemIcon(item)` ヘルパー

### 検証
Phase 0 で書いた順序一致テスト・slugify テストを抽出後のユーティリティに向け替えて全パス。手動: カテゴリ並び・キーボード移動順・⌘O・ピン順序。

---

## Phase 4: UI プリミティブ・共有フックの抽出

**目的**: 8重・3重に実装された UI ボイラープレートを共有化する。複数 PR に分割推奨。

### 4-1. `useDismiss` フック（8箇所の dismiss 処理を統合）

outside-mousedown + Escape のリスナー定型が8箇所: ContextMenu.tsx:21-37 / Sidebar.tsx:67-79, :186-196 / DashboardOverview.tsx:28-37 / ToolbarDropdown.tsx:18-34 / ShortcutHelper.tsx:29-45 / EmojiPicker.tsx:135-149 / ItemFormModal.tsx(AppPicker):51-65。

→ `src/hooks/useDismiss.ts`: `useDismiss(refs, onClose, opts?: { escape?: boolean })`。viewport-clamp effect（ContextMenu.tsx:40-49 と Sidebar.tsx:81-86 で逐語一致）も `MenuSurface` コンポーネント（createPortal + position:fixed + clamp）として統合。

> **注意**: EmojiPicker の `onOpenChange` 連携（SKILL.md #5 の Escape 制御）は呼び出し側の責務として維持する。useDismiss は「リスナー登録の定型」だけを吸収し、モーダル親との Escape 協調プロトコルは変えない。

### 4-2. `usePointerReorder` フック（Sidebar 内3重のドラッグ並べ替え）

カテゴリ（Sidebar.tsx:267-300）・タグ（:275-320）・ピン（:360-392）で 2 useState + 4 useRef + 3 ハンドラ + 5px 閾値 + setPointerCapture + 中点スキャン + didMove クリック抑止が3重実装（約100行重複）。

→ `usePointerReorder<T>({ items, onReorder })`。SKILL.md #4 の Pointer Events 方式はフック内部にそのまま保存。

### 4-3. アイコンコンポーネント（`src/components/icons.tsx`）

逐語一致の SVG パスが散在: star ×4、pencil ×5、folder ×5、bolt ×3、X-close ×7、trash ×2（全箇所 grep 済み、約25 call sites）。`StarIcon` / `PencilIcon` / `FolderIcon` / `BoltIcon` / `XIcon` / `TrashIcon`（className/fill props）に置換。

### 4-4. ItemCard / ItemRow の共通部品（約60%が逐語一致）

`src/components/item-parts.tsx` に `FavoriteStarButton` / `EditIconButton` / `TagBadges` / `ItemTypeBadge` + `useItemCtxMenu(item, callbacks)` を抽出。ItemCard / ItemRow は「レイアウトだけが違う薄いシェル」になる。**完全統合（1コンポーネント化）はしない**（カード/行のレイアウト差が本質的なため）。

### 4-5. その他の重複 UI

- `ModalShell({ onClose, children })`: モーダルオーバーレイ4箇所の統一。**SKILL.md #5 の `onMouseDown` + `e.target === e.currentTarget` パターンを ModalShell に一元実装**することで、現在 `onClick` で実装されてしまっているインポート名モーダル（App.tsx:613）の不整合も自然に解消される
- `CategoryTagCard({ icon, label, count, onClick, onContextMenu })`: DashboardOverview の約190字クラス文字列 ×5 を統合（約80行削減）
- `PaletteGroupRow`: CommandPalette のカテゴリ行（:197-230）/タグ行（:231-267）の約35行×2を統合
- `useUpdater()` フック: UpdateNotification.tsx:13-44 と SettingsModal.tsx の check → downloadAndInstall → relaunch 状態機械の重複（約40行）を統合
- Pin/Unpin コンテキストメニューの統合（Sidebar.tsx:92-99 vs DashboardOverview PinContextMenu）

### 検証
各 PR ごとに手動スモーク必須: 右クリックメニュー全種・ドロップダウン・Escape の伝播（**絵文字ピッカーを開いた状態の Escape がモーダルを閉じないこと** = SKILL.md #5 の回帰確認）、DnD 並べ替え（カテゴリ・タグ・ピン）、画面端でのメニュー clamp。

---

## Phase 5: God コンポーネントの分解

**目的**: AppContent（600行・8関心事・11 useState）、Sidebar（634行・内包5コンポーネント・15 useState）、ItemFormModal（538行・17 useState + 内包98行 AppPicker）を分解する。**状態+effect+callback をユニットごと移すだけの機械的抽出**で、挙動・DOM 構造は不変。

### 5-1. App.tsx → カスタムフック群

| 抽出先 | 中身（現 App.tsx 行） |
|---|---|
| `useNavigation()` | pageView state(:117) + navigateTo(:158-161) + popstate effect(:163-173) |
| `useViewPrefs(config, loading)` | cardSize/viewMode/sidebarWidth ミラー(:174-176) + 同期 effect(:187-193) |
| `useSidebarResize(initial, persist)` | resizing ref(:210) + 3 pointer handlers(:211-224) |
| `useLauncher(recordAccess)` | launchAndRecord(:196-208) + openAll（Phase 3 で統合済みのもの） |
| `useAppShortcuts(deps)` | 113行の集約キーボードハンドラ effect(:230-343) を**1つのフックとして丸ごと**移動 |
| `ImportNameModal`（新コンポーネント） | インラインモーダル JSX(:612-631) + import 関連 state/handlers(:380-422) |

> **制約**: キーボードショートカットは「単一の集約 capture ハンドラ + ref 参照」という設計（CLAUDE.md）を維持する。コンポーネントごとのリスナー分散への変更は**禁止**。フック化はハンドラの所在を移すだけ。

### 5-2. Sidebar.tsx / ItemFormModal.tsx のファイル分割

- Sidebar 内包の `SidebarContextMenu`(:47) / `InlineRename`(:121) / `InlineColorPicker`(:151) / `InlineDeleteConfirm`(:167) / `SortContextMenu`(:179) → `src/components/sidebar/` 配下へ props 不変のまま移動（named export 規約違反も同時解消）
- ItemFormModal 内包の 98行 `AppPicker` → `src/components/form/AppPicker.tsx`
- Phase 4 の `useDismiss` / `usePointerReorder` / `MenuSurface` を分割後のファイルに適用（Sidebar 634 → 約350行見込み）

### 5-3. prop drilling の解消

App.tsx の Sidebar 呼び出しは24 props、うち7つは useConfig 関数の素通し（onReorderTagDefs / onUpdateTagDef / onDeleteTagDef / onUpdateCategoryDef / onDeleteCategoryDef / onReorderCategoryList / onToggleSection）。Phase 2 の ConfigContext から直接読むよう置換。`{action(); navigateTo("items")}` 形の closure 11個は `toggleTagAndGo` 等の useCallback に集約。

### 5-4. prop 名の統一

同一アクションに3つの名前が混在: DashboardOverview の `onSelectTag`/`onSelectCategory`/`onLaunchItem` vs 他コンポーネントの `onToggleTag`/`onToggleCategory`/`onLaunch`（App.tsx:448-449 と :526-529 で同じハンドラを渡している）。**`onToggleTag`/`onToggleCategory`/`onLaunch` に統一**。ItemRow の `onDuplicate`/`onDelete` を ItemCard と同じ optional に。SidebarProps に `PageView` 型を使用。

### 検証
Phase 0 テスト全パス + フルスモーク: 全ショートカット表（CLAUDE.md の表の全行）、ページ遷移 + Back/Forward スワイプ、サイドバーリサイズ、import/export、設定モーダル。

---

## Phase 6: Rust バックエンドの整理

**目的**: commands.rs(362行) + lib.rs(100行) の機械的ボイラープレートを集約する。**コマンド名・JSON ワイヤ形式・エラーメッセージ文字列は不変**。

### タスク

1. **read/write ヘルパー**: `fs::read_to_string` + `serde_json::from_str` ペアが4箇所（load_config:141-142 / import_config:261-263 / switch_config:333-335※Phase 1 で削除済みなら3箇所 / load_config_from_file:348-350）、serialize+write ペアが3箇所 → `fn read_config_file(path) -> Result<(String, AppConfig), String>`（raw 文字列も返す: load_config_from_file は元バイトをそのまま書くため）に集約し、export_config / import_config を `save_config_to_path` 経由に
2. **エラー変換の集約**: `.map_err(|e| e.to_string())` が21箇所（commands.rs 19 + lib.rs 2）→ 最小なら `fn estr(e: impl Display) -> String` ヘルパー、本格的には thiserror enum + `From`。**エラー文字列の出力は同一に保つ**
3. **パス解決の一本化**: `config_path()`(:108-130) が副作用つき `icloud_config_dir()` を2回呼び、`config_dir()`(:247-250) が同じ優先順位を別実装。1回の `load_config` で iCloud ディレクトリ判定+mkdir 試行が最大3回走る → `fn resolve_config() -> (PathBuf /*dir*/, PathBuf /*config.json*/)` に統合。**OnceLock でのメモ化はしない**（iCloud の出現/消失への追従が現仕様）
4. **serde 整理**: AppConfig の15個 + DashboardItem の1個の機械的 `#[serde(rename = "camelCase")]` → struct-level `#[serde(rename_all = "camelCase")]` + `#[serde(rename = "type")]`（item_type のみ field-level で維持）。**Phase 0 のラウンドトリップテストで JSON バイト一致を確認**

### 検証
`cargo check` + `cargo test`（ラウンドトリップ）+ 手動: 起動・保存・export/import・iCloud あり/なし両環境（iCloud 側は `~/Library/Mobile Documents/...` の存在で分岐確認）。

---

## Phase 7: ビルド・CI・規約・ドキュメントの整合

### 7-1. CI/CD の無駄取り

- `ci.yml:33-40` — check-rust ジョブの pnpm/node セットアップ + `pnpm install` を削除（`cargo check` は node_modules 不要。現に dist/ なしでパスしている。macOS ランナーで毎回 30-60秒の無駄）
- `ci.yml` に `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }` を追加
- `release.yml:33-34` — `cargo install tauri-cli --version "^2"`（毎リリース数分のソースビルド + `--locked` なしで非再現的）→ `@tauri-apps/cli` を devDependency に追加し `pnpm tauri build` に置換
- `pages.yml:27-29` — lp/ 全体を Pages にデプロイしており `my-dashboard-app.pen`（デザインソース）と `DESIGN_PROMPT.md` まで公開されている → ステージングディレクトリへ `*.pen` / `*.md` を除外コピーしてからアップロード

### 7-2. マニフェスト整理

- バージョン3重管理: package.json `0.0.0` / Cargo.toml `0.1.0` / tauri.conf.json `0.13.9`（正は tauri.conf.json、SettingsModal が getVersion() で表示）→ tauri.conf.json を単一の正と明記し、他はコメント付きセンチネルに
- Cargo.toml の依存ピン方式統一（exact patch と bare major が混在）
- `tsconfig.app.json` / `tsconfig.node.json` の12個の同一 compilerOptions → `tsconfig.base.json` に extract して `extends`（任意・低優先）

### 7-3. i18n 規約違反の解消（8箇所）

- `CommandPalette.tsx:251` — リテラル `Workspace` バッジ（JA ユーザーに英語が出る。カテゴリ行は `t("category")` 使用済み）→ `workspace` キー新設
- `Dashboard.tsx:163` — カードビューの `Add Item`（リストビューは `t("add_item")` 済み）→ 既存キー再利用
- `Sidebar.tsx:445, :502, :553` — `title="Right-click to sort"` ×3 → `right_click_to_sort` キー新設
- `ActiveFilters.tsx:64, :75` — 英語のみの title 属性2つ → キー新設
- App.tsx の Loading/Error 表示（I18nProvider マウント前）は対応不能なので CLAUDE.md に例外として明記

### 7-4. 命名・規約の統一

- **Tags→Workspaces の中途リネーム整理**: UI 表示は「Workspaces」だが i18n キー名（`tags`, `new_tag_name` など）と識別子（`tagColors` 等、TagDef を `c`/`cat` で回す変数）が混在。識別子・キー名の機械的リネームで統一。**ただし永続化された `tagDefs` フィールドと `TagDef` 型名は変更しない**（マイグレーション不要を維持）
- readonly 規約: Sidebar 内部の約9型（CtxMenuState / SidebarContextMenu props / InlineRename ほか）に readonly 付与（Phase 5 のファイル分割と同時実施が効率的）
- `App.tsx:23` — default export → named export 化 + main.tsx の import 修正

### 7-5. ドキュメント整合（検証済みの矛盾7件）

- CLAUDE.md:170, :182 — Open All のショートカットが `⌘⇧A` 表記のまま（実装は PR #35 以降 `⌘O`。App.tsx:278, ShortcutHelper.tsx:73 で確認済み）
- README.md:157, :286 — 存在しない「Settings > Profiles」の説明を削除/書き換え
- README.md:70 — リリース手順の誤り修正
- recentAccess の件数記述と実装（`slice(0, 50)`）の不一致を解消
- CLAUDE.md の lib.rs プラグイン一覧に autostart を追記、AppConfig 型一覧に dismissedUpdateVersion を追記
- README のプロジェクトツリー・コンポーネント説明の現状同期

---

## Phase 8（任意）: パフォーマンス最適化

挙動は同一のまま速くする。計測してから入れる（`pnpm build` のチャンクサイズと React DevTools Profiler）。

1. **EmojiPicker の遅延ロード**: `emojibase-data/en/data.json`（775KB）を静的 import し、モジュール評価時に全約3,700絵文字のセクション構築を実行している（EmojiPicker.tsx:3-4, :40-44, :94-95）。利用箇所は ItemFormModal のみなのに、プロダクションビルドの単一 1.1MB チャンクと起動時間を圧迫 → dynamic `import()` + 初回オープン時構築（または ItemFormModal ごと React.lazy）。**メインバンドル約60-70%削減**。初回オープン時に一瞬ロード状態が出る（軽微な体感変化として了承の上で実施）
2. **React.memo の導入**: 現状 `React.memo` 使用ゼロ。矢印キー1打/検索1文字ごとに全 ItemCard/ItemRow + Sidebar + DashboardOverview が再レンダー。ItemCard / ItemRow を memo 化し、App の handleAdd/handleEdit/handleSave を useCallback 化、Dashboard/Sidebar へ渡す inline closure を安定化
3. **I18nProvider の value メモ化**: `{ t, locale }` オブジェクトが毎レンダー新規生成され全コンシューマを再レンダー（i18n.tsx:171-174）→ `useMemo`（locale キー）
4. `existingItemIds` の `new Set(...)`（App.tsx:656）を useMemo 化、installed-apps リストのモジュールキャッシュ

---

## 検証方法（全フェーズ共通）

```bash
pnpm build                 # tsc -b + vite build（unused 検出含む、SKILL.md #7）
npx tsc -b                 # 型チェック単体
pnpm lint
pnpm test                  # Phase 0 以降
cd src-tauri && cargo check && cargo test
```

手動スモークの定型（毎フェーズ）:
1. `cargo tauri dev` で起動 → Dashboard 表示
2. アイテム起動（app / url、シングル=選択・ダブル=起動）
3. ⌘K / ⌘F / ⌘N / ⌘O / ⌘⇧D / ⌘, / ↑↓ / Ctrl+P/N / Enter / Esc
4. アイテム追加→編集→複製→削除（IME 入力で名前入力）
5. タグ・カテゴリの DnD 並べ替え、リネーム（ID 同期）、ピン留め
6. 設定: 言語切替、グローバルショートカット録音、import/export
7. **config.json の差分確認**: 操作前後で `~/.config/my-dashboard-app/config.json`（または iCloud 側）を読み取り専用で diff し、意図しないフィールド消失がないこと

## リスクと対応

| リスク | 対応 |
|---|---|
| テストなしでの統合作業 | Phase 0 を必須の前提とする。キャラクタリゼーションテストを「先に」書く |
| config.json のフィールド消失（serde struct 変更時） | Rust 側 `hidden_profiles` は残す。ラウンドトリップテスト + 手動 diff 確認 |
| SKILL.md パターンの誤った「修正」 | 各フェーズの注意書きに明記済み。共有化はパターンを内側に保存する方向のみ |
| キーボードフォーカス順と表示順のズレ | Phase 3-1 の順序一致テストを Phase 0 で先行配備 |
| Escape 伝播の回帰（ピッカー/モーダル） | Phase 4 スモークに専用項目。`onOpenChange` プロトコルは変えない |
| 大規模リネームの unused-variable ビルド失敗（SKILL.md #9） | こまめに `pnpm build`。リネームは型定義 → Rust → hooks → App → コンポーネントの順 |

## 実行順序と PR 分割の指針

```
PR#1  Phase 0          安全網（CI 修正 + vitest + characterization tests + cargo test）
PR#2  Phase 1          デッドコード一掃（全部まとめて1 PR で可）
PR#3  Phase 2          config 一本化 + mutate() + renameAndRepin
PR#4  Phase 3          utils 抽出（groupItems / labels / pinned / openAll / icons 定数）
PR#5  Phase 4-1,2      useDismiss + usePointerReorder + MenuSurface
PR#6  Phase 4-3,4      icons.tsx + item-parts
PR#7  Phase 4-5        ModalShell + CategoryTagCard + PaletteGroupRow + useUpdater
PR#8  Phase 5-1        App.tsx フック分解 + ImportNameModal
PR#9  Phase 5-2,3,4    Sidebar/ItemFormModal 分割 + prop drilling/命名統一
PR#10 Phase 6          Rust 整理
PR#11 Phase 7          CI/マニフェスト/i18n/命名/ドキュメント
PR#12 Phase 8          （任意）パフォーマンス
```

各 PR は独立にリリース可能な状態を保つ。Phase 2 と 5 はユーザー設定データに触れる経路を変更するため、マージ前に**実際の本番 config（iCloud 側）でのスモーク**を必ず実施する。

---

## 補遺: 監査で「無駄ではない」と確認されたもの

反証検証の過程で、以下は**意図的・正当**と確認済み（誤って「修正」しないこと）:

- `<form>` 不使用、インライン確認 UI、Enter 操作廃止、Pointer Events DnD、`overflow-y-scroll`、`onMouseDown` ポータルパターン、configRef + 単一 saveConfig、capture-phase キー録音、KEY_MAP、eslint ルールの warn 降格 — すべて SKILL.md 記載の WKWebView 回避策
- `emojibase` パッケージ — `emojibase-data` の peerDependency（削除不可）
- Rust crate `tauri-plugin-global-shortcut` — JS バインディングは未使用だが Rust 側 API は使用中（npm 側のみ削除可）
- モーダル backdrop の dismiss 実装差異の一部 — 検証の結果、ItemFormModal は文書化パターンに準拠しており所見自体が棄却された（ただしインポート名モーダルの `onClick` は Phase 4-5 で ModalShell に統一）
