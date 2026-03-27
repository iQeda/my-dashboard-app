# CLAUDE.md

## Project Overview

MyDashboard - Tauri v2 Mac アプリ。日常的に使うアプリ/ブラウザサイトのランチャー。

## Tech Stack

- **Backend**: Rust + Tauri v2 (`src-tauri/`)
- **Frontend**: React 19 + TypeScript + Vite 8 (`src/`)
- **Styling**: Tailwind CSS v4 (Vite plugin)
- **i18n**: 自前実装 (`src/i18n.tsx`、EN/JA)
- **Package Manager**: pnpm
- **Node Version Manager**: asdf (`.tool-versions`)

## Commands

```bash
# 開発
cargo tauri dev          # 開発サーバー起動 (Vite + Tauri)
pnpm dev                 # フロントエンドのみ (Vite dev server)

# ビルド
cargo tauri build        # プロダクションビルド (.app / .dmg)
pnpm build               # フロントエンドのみビルド

# チェック
npx tsc --noEmit         # TypeScript 型チェック
cd src-tauri && cargo check  # Rust コンパイルチェック
pnpm lint                # ESLint
```

## Architecture

### Rust Backend (`src-tauri/src/`)

- `commands.rs` - 全 Tauri コマンド:
  - `launch_app(name)` / `open_url(url)` - アプリ起動・URL オープン
  - `load_config()` / `save_config(config)` - iCloud > ローカル > デフォルトの優先順位で読み書き。初回起動時に `default-config.json` をサンプルプロファイルとして自動生成
  - `get_config_path()` - 現在アクティブな config ファイルパスを返す
  - `export_config(path)` - 現在の設定をファイルに書き出し
  - `import_config(path, profile_name)` - 別名プロファイルとして保存
  - `load_config_from_file(path)` - 外部 JSON ファイルを直接アクティブ config として読み込み
  - `list_config_profiles()` / `switch_config(filename)` - プロファイル管理（フルパス表示）
  - `list_installed_apps()` - Mac インストール済みアプリスキャン
- `lib.rs` - Tauri Builder にコマンドとプラグイン (dialog, log, global-shortcut, updater, process) を登録。`register_shortcut` / `unregister_all_shortcuts` コマンド。WKWebView の `allowsBackForwardNavigationGestures` を `objc2` クレートで有効化

### CI/CD (`.github/workflows/`)

- `ci.yml` - PR・push 時に TypeScript 型チェック + ESLint + Rust `cargo check`
- `release.yml` - `v*` タグ push で自動リリース:
  1. 署名付き Tauri ビルド（`TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` は GitHub Secrets）
  2. GitHub Release 作成（`.app.tar.gz` + `.sig` + `.dmg` + `latest.json`）
  3. Homebrew Cask (`iQeda/homebrew-tap`) 自動更新（`HOMEBREW_TAP_TOKEN` で認証）

GitHub Secrets（リリースに必要）:
- `TAURI_SIGNING_PRIVATE_KEY` - Tauri 署名用秘密鍵の内容
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - 秘密鍵のパスワード
- `HOMEBREW_TAP_TOKEN` - `iQeda/homebrew-tap` への push 用 PAT

### Capabilities (`src-tauri/capabilities/default.json`)

- `core:default`, `dialog:default`, `dialog:allow-open`, `dialog:allow-save`
- `global-shortcut:default` - グローバルショートカット登録
- `updater:default` - アプリ内自動更新
- `process:default` - アプリ再起動 (`relaunch`)

### React Frontend (`src/`)

- `App.tsx` - `App`(I18nProvider) + `AppContent`(メインUI) の2層構造。`pageView` state (`"dashboard"` | `"items"`) でページ切替。`navigateTo()` は `setPageView` + `history.pushState` でブラウザ履歴対応。`launchAndRecord()` でアイテム起動 + アクセス記録を一元化
- `i18n.tsx` - 翻訳システム。`I18nProvider` + `useI18n()` → `t(key)` で全 UI テキストを翻訳
- `useConfig` hook - 設定の CRUD。`configRef` パターンで最新 state を参照
  - addItem, updateItem, deleteItem, duplicateItem, toggleFavorite
  - reorderTagDefs, updateTagDef, deleteTagDef
  - updateCategoryDef, deleteCategoryDef, reorderCategoryList
  - updateViewPrefs (viewMode, cardSize, sidebarWidth, sidebarCategoriesOpen, sidebarTagsOpen, combinedFilter, multiTagMode, pinnedOrder, hiddenProfiles 永続化)
  - updateLocale (言語設定)
  - 絵文字履歴は addItem/updateItem 内で同時更新（SKILL.md #6 参照）
- `useFilter` hook - フィルタリング
  - selectedTags (Set), selectedCategory (null/""/catId), multiTagMode (AND 条件), showFavoritesOnly
  - combinedFilter (Category + Tag 結合フィルター。デフォルト false = 排他フィルター)
  - toggleCombinedFilter, toggleMultiTagMode
  - searchQuery, sortOrder, typeFilter (all/app/url)
  - setSortOrder, setTypeFilter（直接 setter、ドロップダウンメニュー用）
- `useKeyboardNavigation` hook - キーボードによるアイテムフォーカス管理
  - focusedIndex, setFocusedIndex, focusedItem, moveFocus, resetFocus
  - `displayItems`（カテゴリグループ順）を入力として使用し、表示順と一致
  - `enabled` が false または items が変わるとフォーカスリセット
- `DashboardOverview.tsx` - Dashboard ページ。Favorites（ItemCard S、Edit/Favorite のみ）、Pinned（ピン留めカテゴリ・タグ）、Categories、Tags（件数付き）、Recent items（ItemCard S）を表示。カテゴリ・タグカードは右クリックで Pin/Unpin 操作可能
- ItemCard/ItemRow は `invoke` を直接呼ばず、親から `onLaunch`/`onSelect` コールバックを受け取る設計
  - シングルクリック → `onSelect`（フォーカス）、ダブルクリック → `onLaunch`（起動）
  - `isFocused` prop でフォーカス状態のリングハイライト表示
  - タグバッジクリックで `onToggleTag` → タグフィルター適用
- `ToolbarControls.tsx` - ドロップダウンメニュー式のツールバー（items ページのみ）
  - Display: ビューモード（List/Card）+ カードサイズ（S/M/L）
  - Filter: タイプフィルター（All/App/Web）、活性時は青ハイライト
  - Sort: ソート順（A→Z / Z→A）
  - 排他制御で同時に1つのみ展開、選択後に自動閉じ
- `ToolbarDropdown.tsx` - 再利用可能なドロップダウンコンポーネント
  - `ToolbarDropdown`, `DropdownItem`, `DropdownSeparator`, `DropdownLabel` をエクスポート
  - `createPortal` + `getBoundingClientRect` でポータル表示
- `ShortcutHelper.tsx` - キーボードショートカット一覧。画面右下固定、ポップオーバーは上方向に展開
- `SearchBar.tsx` - 検索入力のみ（コントロールボタンは ToolbarControls に分離）
- `CommandPalette.tsx` - 統合検索パレット。`onLaunch` コールバック経由で起動（`launchAndRecord` 一元化）。タグ選択時は items ページに遷移
- `Sidebar.tsx` - カテゴリ・タグ・All Items・Favorites に件数表示。`items` prop から `useMemo` で集計。ピン留めセクション（Pinned）を Favorites の下に表示、ピン留め済みは Categories/Tags セクションから非表示
- `ContextMenu.tsx` - アイテム右クリックメニュー。`onDuplicate`/`onDelete` はオプショナル（Dashboard では非表示）
- `SettingsModal.tsx` - About のバージョン表示を `@tauri-apps/api/app` の `getVersion()` で動的取得。Profiles（フルパス表示、除外機能付き）、Load Config File（Finder で任意 JSON を直接読み込み）
- コンポーネントは全て props ベースの named export 関数コンポーネント

### Data Flow

```
config.json (iCloud/local) → Rust load_config → React useConfig → components
                           ← Rust save_config ← React useConfig ← user actions

Import: file → Rust import_config → config-{name}.json (別ファイル保存)
Switch: Rust switch_config → config.json を上書き → reload
```

### Type System

- `TagDef` (id, label, color, pinned?) - タグ定義。旧名 `Category`（リネーム済み）。`pinned` でピン留め
- `Category` (id, label, pinned?) - カテゴリ定義。アイテムに1つだけ設定可能。`pinned` でピン留め
- `DashboardItem` - id, name, type, target, tags[], icon?, favorite?, category?, description?, excludeFromOpenAll?
- `RecentAccessEntry` - id, at (Unix timestamp ms via `Date.now()`)
- `AppConfig` - items[], tagDefs[], categoryList?, emojiHistory?, viewMode?, cardSize?, sidebarWidth?, locale?, recentAccess?, globalShortcut?, sidebarCategoriesOpen?, sidebarTagsOpen?, combinedFilter?, multiTagMode?, pinnedOrder?, hiddenProfiles?

## Config File Location

1. `~/Library/Mobile Documents/com~apple~CloudDocs/my-dashboard-app/config.json` (iCloud, 優先)
2. `~/.config/my-dashboard-app/config.json` (ローカルフォールバック)
3. `src-tauri/resources/default-config.json` (初回起動時にコピー + `default-config.json` としてサンプルプロファイル自動生成)

## Key Design Decisions

- **`<form>` 不使用**: ItemFormModal は `<div>` ベース（SKILL.md #1）
- **`window.confirm` 不使用**: インライン確認 UI で代替（SKILL.md #2）
- **IME 対応**: Enter での操作を廃止、ボタンのみ（SKILL.md #3）
- **ポインターイベント DnD**: HTML5 DnD の代替（SKILL.md #4）
- **`createPortal` + `onMouseDown` + `onOpenChange`**: ポータルとモーダルの共存（SKILL.md #5）
- **`configRef` パターン + 単一 saveConfig**: 連続保存の競合回避（SKILL.md #6）
- **Import は別名保存**: 端末間の差異を考慮
- **Tags と Category の分離**: タグ定義は `TagDef`（旧 `Category`）、カテゴリは `Category`
- **Category / Tag 排他フィルター**: デフォルトで一方を選ぶと他方がクリアされる。ActiveFilters の "Category + Tag" トグルで結合フィルターに切替可能
- **Multi タグは AND 条件**: 選択した全タグを持つアイテムのみ表示。ActiveFilters の "Multi Tag (AND)" トグルで切替（Sidebar から移動）
- **サイドバーセクション折りたたみ**: Categories/Tags の見出しクリックで折りたたみ。状態は config に保存
- **Duplicate は `XXX (Copy)`**: ソートでオリジナル直下に並ぶ命名規則
- **サイドバー幅リサイズ**: Pointer Events でドラッグ、config に永続化
- **見出し右クリックソート**: Categories/Tags の見出しを右クリックで昇順/降順ソート
- **Dashboard がデフォルトビュー**: アプリ起動時は Dashboard ページを表示
- **Back/Forward ナビゲーション**: `history.pushState`/`popstate` + WKWebView `allowsBackForwardNavigationGestures` (Magic Mouse スワイプ)
- **`launchAndRecord()` で起動一元化**: ItemCard/ItemRow は `onLaunch` コールバック経由。直接 `invoke` しない
- **Global Shortcut**: `tauri-plugin-global-shortcut` でアプリ非フォーカス時もランチャー表示。Settings の Record ボタンで設定（SKILL.md #11, #12）
- **In-app Auto-update**: `tauri-plugin-updater` + `tauri-plugin-process` で Settings > About からアプリ内更新。Check for Updates → Update Now でダウンロード・インストール・再起動まで自動実行（手動 `brew` 不要）（SKILL.md #13）
- **シングルクリック=選択、ダブルクリック=起動**: items ページでは `onSelect` でフォーカス、`onLaunch` でダブルクリック起動。DashboardOverview は `onSelect` なしなのでダブルクリックのみで起動
- **キーボードナビゲーション**: `useKeyboardNavigation` hook で `↑↓` フォーカス移動、`Enter` で起動。`displayItems`（カテゴリグループ順に並べ替え済み）で表示順と一致
- **集約キーボードハンドラー**: App.tsx の単一 `useEffect` で全ショートカットを管理。`focusedItemRef` + `hasActiveFiltersRef` で ref 参照し、リスナー再登録を最小化
- **ツールバードロップダウン**: SearchBar からコントロールを分離し、Display/Filter/Sort の3グループに分類。`ToolbarDropdown` プリミティブで統一
- **ShortcutHelper 右下固定**: ツールバーから分離し、全ページで画面右下に固定表示。ポップオーバーは上方向に展開
- **サイドバー件数表示**: All Items / Favorites / 各カテゴリ / 各タグの横に件数を `useMemo` で集計・表示
- **カテゴリセパレータークリック可能**: Dashboard のカテゴリグループ見出しをクリックでカテゴリフィルター適用（Uncategorized は対象外）
- **Pin 機能**: カテゴリ・タグに `pinned` フィールド。右クリックメニューで Pin/Unpin。ピン留め済みはサイドバー上部・Dashboard 上部の Pinned セクションに表示、元の Categories/Tags セクションからは非表示
- **Dashboard のコンテキストメニュー簡略化**: ItemCard は Edit / Favorite のみ（Duplicate / Delete 非表示）。カテゴリ・タグカードは Pin/Unpin のみ
- **Settings バージョン動的取得**: `getVersion()` で `tauri.conf.json` の version を自動反映（ハードコード廃止）
- **Dashboard カードスタイル統一**: カテゴリ・タグカードは同一サイズ・同一ホバー（青ボーダー + scale アニメーション）。カテゴリフォルダアイコンは紫で統一
- **リネーム時 ID 同期**: カテゴリ・タグのリネーム時に ID をラベルベースで自動更新。アイテム参照と pinnedOrder も連動更新
- **カテゴリ・タグの重複バリデーション**: 新規追加・リネーム時にラベルの重複チェック。エラーメッセージを赤で表示
- **Pinned 順序永続化**: `pinnedOrder: string[]` で config にピン留め順を保存。サイドバー・Dashboard ともに同じ順序で表示。ドラッグ＆ドロップ・右クリックソートで並べ替え可能
- **excludeFromOpenAll フラグ**: アイテム編集画面でトグル。Open All（ボタン / ⌘⇧A）の対象から除外
- **ItemFormModal UI**: `<select>` 廃止、全てボタン選択式（Type / Category）。`overflow-y-scroll overscroll-contain` でスクロール対応

## Keyboard Shortcuts

| ショートカット | 動作 |
|---|---|
| `⌘F` | 検索バーにフォーカス |
| `⌘⇧D` | Dashboard ページへ |
| `⌘K` | コマンドパレット |
| `⌘,` | 設定 |
| `⌘N` | 新規アイテム |
| `⌘⇧A` | フィルター結果をすべて開く |
| `⌘E` | 選択中アイテムを編集 |
| `⌘⇧F` | お気に入りトグル |
| `⌘Enter` | 選択中アイテムを起動 |
| `Esc` | モーダル閉じ → フィルター解除 → 検索ブラー |
| `↑` / `↓` | アイテム間フォーカス移動 |
| `↓`（検索バー時） | 検索バーを抜けてリストへ |
| `Enter` | フォーカス中アイテムを起動 |

## Tauri WebView Gotchas

SKILL.md に詳細を記載。

| 問題 | 回避策 |
|------|--------|
| `<form>` 内の `type="button"` が submit を発火 | `<form>` を使わず `<div>` |
| `window.confirm()` が UI 破壊 | インライン確認 UI |
| `isComposing` / `compositionend` が不安定 | Enter での操作を廃止 |
| HTML5 Drag and Drop が動作しない | Pointer Events |
| `overflow-y-auto` が効かないケースあり | `overflow-y-scroll` + `overscroll-contain` |
| `createPortal` のクリックがモーダル背景に伝播 | `onMouseDown` + `e.target === e.currentTarget` |
| `createPortal` の Escape がモーダルに伝播 | `onOpenChange` で子コンポーネントの open 状態を追跡 |
| `input onKeyDown` でショートカットキー録音が不完全 | `window.addEventListener("keydown"/"keyup", handler, true)` (capture phase) |
| `e.key` が Tauri shortcut 形式と異なる | KEY_MAP でマッピング (例: `" "` → `"Space"`, `"ArrowUp"` → `"Up"`) |

## Conventions

- 型は全て `readonly` プロパティ
- 新規オブジェクト生成 (immutable pattern)、既存オブジェクトの直接変更禁止
- コンポーネントは named export
- Tailwind クラスを直接使用 (CSS モジュール不使用)
- Rust: serde rename で `type` → `item_type`、`tagDefs` → `tag_defs` 等
- ビルドは `pnpm build` が通ることを確認してからコミット
- 全 UI テキストは `t()` 関数経由（ハードコード禁止）
