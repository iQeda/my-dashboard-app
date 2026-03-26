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
  - `load_config()` / `save_config(config)` - iCloud > ローカル > デフォルトの優先順位で読み書き
  - `get_config_path()` - 現在アクティブな config ファイルパスを返す
  - `export_config(path)` - 現在の設定をファイルに書き出し
  - `import_config(path, profile_name)` - 別名プロファイルとして保存
  - `list_config_profiles()` / `switch_config(filename)` - プロファイル管理
  - `list_installed_apps()` - Mac インストール済みアプリスキャン
- `lib.rs` - Tauri Builder にコマンドとプラグイン (dialog, log) を登録

### React Frontend (`src/`)

- `App.tsx` - `App`(I18nProvider) + `AppContent`(メインUI) の2層構造
- `i18n.tsx` - 翻訳システム。`I18nProvider` + `useI18n()` → `t(key)` で全 UI テキストを翻訳
- `useConfig` hook - 設定の CRUD。`configRef` パターンで最新 state を参照
  - addItem, updateItem, deleteItem, duplicateItem, toggleFavorite
  - reorderTagDefs, updateTagDef, deleteTagDef
  - updateCategoryDef, deleteCategoryDef, reorderCategoryList
  - updateViewPrefs (viewMode, cardSize, sidebarWidth 永続化)
  - updateLocale (言語設定)
  - 絵文字履歴は addItem/updateItem 内で同時更新（SKILL.md #6 参照）
- `useFilter` hook - フィルタリング
  - selectedTags (Set), selectedCategory (null/""/catId), multiTagMode (AND 条件), showFavoritesOnly
  - searchQuery, sortOrder, typeFilter (all/app/url)
- コンポーネントは全て props ベースの named export 関数コンポーネント

### Data Flow

```
config.json (iCloud/local) → Rust load_config → React useConfig → components
                           ← Rust save_config ← React useConfig ← user actions

Import: file → Rust import_config → config-{name}.json (別ファイル保存)
Switch: Rust switch_config → config.json を上書き → reload
```

### Type System

- `TagDef` (id, label, color) - タグ定義。旧名 `Category`（リネーム済み）
- `Category` (id, label) - カテゴリ定義。アイテムに1つだけ設定可能
- `DashboardItem` - id, name, type, target, tags[], icon?, favorite?, category?, description?
- `AppConfig` - items[], tagDefs[], categoryList?, emojiHistory?, viewMode?, cardSize?, sidebarWidth?, locale?

## Config File Location

1. `~/Library/Mobile Documents/com~apple~CloudDocs/my-dashboard-app/config.json` (iCloud, 優先)
2. `~/.config/my-dashboard-app/config.json` (ローカルフォールバック)
3. `src-tauri/resources/default-config.json` (初回起動時にコピー)

## Key Design Decisions

- **`<form>` 不使用**: ItemFormModal は `<div>` ベース（SKILL.md #1）
- **`window.confirm` 不使用**: インライン確認 UI で代替（SKILL.md #2）
- **IME 対応**: Enter での操作を廃止、ボタンのみ（SKILL.md #3）
- **ポインターイベント DnD**: HTML5 DnD の代替（SKILL.md #4）
- **`createPortal` + `onMouseDown` + `onOpenChange`**: ポータルとモーダルの共存（SKILL.md #5）
- **`configRef` パターン + 単一 saveConfig**: 連続保存の競合回避（SKILL.md #6）
- **Import は別名保存**: 端末間の差異を考慮
- **Tags と Category の分離**: タグ定義は `TagDef`（旧 `Category`）、カテゴリは `Category`
- **Multi タグは AND 条件**: 選択した全タグを持つアイテムのみ表示
- **Duplicate は `XXX (Copy)`**: ソートでオリジナル直下に並ぶ命名規則
- **サイドバー幅リサイズ**: Pointer Events でドラッグ、config に永続化
- **見出し右クリックソート**: Categories/Tags の見出しを右クリックで昇順/降順ソート

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

## Conventions

- 型は全て `readonly` プロパティ
- 新規オブジェクト生成 (immutable pattern)、既存オブジェクトの直接変更禁止
- コンポーネントは named export
- Tailwind クラスを直接使用 (CSS モジュール不使用)
- Rust: serde rename で `type` → `item_type`、`tagDefs` → `tag_defs` 等
- ビルドは `pnpm build` が通ることを確認してからコミット
- 全 UI テキストは `t()` 関数経由（ハードコード禁止）
