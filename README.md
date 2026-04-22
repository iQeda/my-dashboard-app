# MyDashboard

Mac 用のアプリ/サイト ランチャー。毎日使うアプリやブラウザサイトをワンクリックで起動できるダッシュボード。

**Website**: https://iqeda.github.io/my-dashboard-app/

## Tech Stack

- **Tauri v2** (Rust) - ネイティブ Mac アプリ
- **React 19** + **TypeScript** - フロントエンド
- **Vite 8** - ビルドツール
- **Tailwind CSS v4** - スタイリング

## Install

### Homebrew (recommended)

```bash
brew tap iQeda/tap
brew install --cask mydashboard
```

### Manual

[Releases](https://github.com/iQeda/my-dashboard-app/releases) から `.dmg` をダウンロードして Applications にドラッグ。

> **Note**: 現在 Apple Silicon (aarch64) のみ対応。

### Uninstall

```bash
# Homebrew
brew uninstall --cask mydashboard

# config も含めて完全削除
brew uninstall --cask --zap mydashboard
```

## Development Setup

### Prerequisites

- **Node.js 20+** (`asdf install nodejs 22`)
- **Rust / Cargo** (`rustup`)
- **pnpm** (`corepack enable`)
- **Tauri CLI** (`cargo install tauri-cli --version "^2"`)

```bash
# Node.js バージョン設定 (asdf)
asdf install nodejs 22
asdf set nodejs 22

# 依存インストール
pnpm install

# 開発サーバー起動
cargo tauri dev

# プロダクションビルド (.app / .dmg 生成)
cargo tauri build
```

初回の `cargo tauri dev` は Rust クレートのコンパイルに数分かかります。2回目以降は高速です。

### Release (自動)

タグを push するだけで GitHub Actions が全自動でリリースします:

```bash
# 1. tauri.conf.json と SettingsModal.tsx のバージョンを bump
# 2. PR → CI pass → マージ
# 3. タグ push → 自動リリース
git tag v0.3.0
git push origin v0.3.0
```

Actions が自動実行する内容:
- 署名付き Tauri ビルド (`TAURI_SIGNING_PRIVATE_KEY` は GitHub Secrets)
- GitHub Release 作成 (`.app.tar.gz` + `.sig` + `.dmg` + `latest.json`)
- Homebrew Cask (`iQeda/homebrew-tap`) を自動更新

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | コマンドパレット（アイテム起動 + タグフィルター） |
| `⌘N` | アイテム追加 |
| `⌘Enter` | モーダル内で Save |
| `⌘,` | Settings |
| `↑` / `↓` | アイテム間フォーカス移動（items ページ / CommandPalette） |
| `Ctrl+P` / `Ctrl+N` | アイテム間フォーカス移動（Emacs 風、items ページ / CommandPalette） |
| `Escape` | モーダル / パレットを閉じる |
| Global Shortcut (カスタム) | アプリ非フォーカス時でもランチャー（コマンドパレット）を表示。Settings で設定 |

## Features

### Item Management
- **Mac アプリ起動** - インストール済みアプリ一覧からドロップダウンで選択
- **URL オープン** - ブラウザサイトをデフォルトブラウザで開く（URL バリデーション付き）
- **Add / Edit / Delete / Duplicate** - モーダルフォーム + 右クリックメニュー
- **右クリックメニュー** - Edit / Duplicate / Favorite / Delete
- **Emoji アイコン** - 絵文字ピッカー（カテゴリ分類 + キーワード検索 + 使用履歴 History タブ）
- **Description** - アイテム説明文（カード: 最大2行省略 / リスト: 1行省略）
- **Favorites** - 星マークでお気に入り登録
- **Open All** - フィルタリング中のアイテムを一括起動（All Items 表示中は無効）
- **Recent Access Tracking** - アイテム起動時にアクセス日時を記録（最大20件、config に保存）

### Categories
- アイテムに1つだけ設定できるカテゴリ（Tags とは別概念）
- Category でグループ化してセパレート表示（セクションヘッダー付き）
- **Uncategorized** フィルター - カテゴリ未設定アイテムの絞り込み
- サイドバーからクリックで絞り込み（紫ハイライト）
- 右クリックで Rename / Delete
- ドラッグ&ドロップで並び替え
- 見出し右クリックで昇順/降順ソート

### Tags
- タグで分類・フィルタリング
- マルチ選択は AND 条件（選択した全タグを持つアイテムのみ表示。ActiveFilters の "Multi Tag (AND)" トグルで切替）
- 右クリックで Rename / Change Color / Delete
- 20色カラーパレットから色を選択
- ポインターイベントベースのドラッグ&ドロップで並び替え
- 見出し右クリックで昇順/降順ソート
- Add Item 時にその場で新規タグ作成可能（重複チェック・カラー選択付き）

### UI
- **ビュー切替** - カードビュー / リストビュー（デフォルト: リスト）
- **Dashboard ページ** - ランディングページ。Favorites（ItemCard S）、Categories、Tags（件数付き）、Recent items（ItemCard S、最大20件）を表示。アプリ起動時のデフォルトビュー
- **コマンドパレット** (`⌘K`) - アイテム + タグの統合検索。キーボードで選択・実行。タグ選択で items ページに遷移
- **Back/Forward ナビゲーション** - History API (`pushState`/`popstate`) + Magic Mouse スワイプジェスチャー対応
- **カードサイズ切替** - S / M / L の3段階（カードビュー時のみ）
- **ソート** - A→Z / Z→A（デフォルト昇順）
- **タイプフィルター** - All / App / Web
- **検索バー** - アイテム名で絞り込み
- **アクティブフィルター表示** - 検索バー下にフィルターチップ表示 + Clear All + "Category + Tag" トグル（結合フィルター）+ "Multi Tag (AND)" トグル
- **ダークモード** - OS 設定に自動追従
- **i18n** - 英語/日本語切替（Settings から）
- **Auto-update** - Settings > About > Check for Updates → Update Now（ダウンロード・インストール・再起動を自動実行）
- 起動時にウィンドウ最大化
- ビューモード・カードサイズ・サイドバー幅・サイドバーセクション開閉・フィルターモードは config に保存（次回起動時に復元）

### Sidebar
- **Dashboard** - ダッシュボード概要ページ（ホームアイコン）
- **All Items** - 全アイテム表示
- **Favorites** - お気に入りフィルター
- **Categories** - カテゴリ絞り込み + Uncategorized（ドラッグ並替・右クリック編集・見出しソート）。見出しクリックで折りたたみ可能（状態は config に保存）
- **Tags** - タグ絞り込み（ドラッグ並替・右クリック編集・見出しソート）。見出しクリックで折りたたみ可能（状態は config に保存）
- **Settings** (`⌘,`) - 設定画面を開く（Global Shortcut の Record ボタンでカスタムショートカット設定可能）
- サイドバー幅はドラッグでリサイズ可能（160px〜400px、config に保存）
- Category と Tag はデフォルトで排他フィルター（一方を選ぶと他方がクリアされる）。ActiveFilters の "Category + Tag" トグルで結合フィルターに切替可能

### Data & Profiles
- **iCloud 同期** - `~/Library/Mobile Documents/com~apple~CloudDocs/my-dashboard-app/config.json` に優先保存
- **ローカル保存** - iCloud 未使用時は `~/.config/my-dashboard-app/config.json`
- **Import** - 別名プロファイルとして保存（既存 config を上書きしない）
- **Export** - 現在の設定をファイルに書き出し
- **Profile 切替** - Settings 内で複数プロファイルを管理・切替

## Project Structure

```
my-dashboard-app/
├── .github/
│   ├── workflows/ci.yml        # CI (TypeScript + Rust checks)
│   ├── workflows/release.yml   # Release (tag push → build → publish)
│   ├── ISSUE_TEMPLATE/         # Bug Report / Feature Request
│   └── pull_request_template.md
├── src-tauri/                  # Rust バックエンド
│   ├── src/
│   │   ├── main.rs             # エントリーポイント
│   │   ├── lib.rs              # Tauri setup, コマンド登録
│   │   └── commands.rs         # Tauri コマンド
│   ├── capabilities/
│   │   └── default.json        # Tauri permissions
│   ├── resources/
│   │   └── default-config.json # デフォルト設定
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                        # React フロントエンド
│   ├── App.tsx                 # App(I18nProvider) + AppContent(pageView state, navigateTo, launchAndRecord)
│   ├── main.tsx                # エントリーポイント
│   ├── i18n.tsx                # 翻訳システム (EN/JA)
│   ├── constants.ts            # TAG_COLORS 定義
│   ├── types/index.ts          # TypeScript 型定義
│   ├── hooks/
│   │   ├── useConfig.ts        # 設定の CRUD・永続化
│   │   └── useFilter.ts        # フィルタ・ソート・検索
│   ├── components/
│   │   ├── DashboardOverview.tsx # Dashboard ページ (Favorites, Categories, Tags, Recent)
│   │   ├── Dashboard.tsx       # カード/リストビュー + Category グループ表示
│   │   ├── ItemCard.tsx        # カードビュー用アイテム
│   │   ├── ItemRow.tsx         # リストビュー用アイテム
│   │   ├── ItemFormModal.tsx   # 追加・編集モーダル（バリデーション付き）
│   │   ├── Sidebar.tsx         # サイドバー + リサイズ + 右クリックソート
│   │   ├── SearchBar.tsx       # 検索・ビュー切替・ソート・サイズ・タイプフィルター
│   │   ├── ActiveFilters.tsx   # フィルターチップ表示 + Clear All + Combined/Multi トグル
│   │   ├── CommandPalette.tsx  # 統合検索パレット (⌘K)
│   │   ├── ContextMenu.tsx     # アイテム右クリックメニュー
│   │   ├── SettingsModal.tsx   # 設定画面 (⌘,) + 言語切替
│   │   └── EmojiPicker.tsx     # 絵文字ピッカー（履歴・検索付き）
│   └── styles/
│       └── index.css           # Tailwind エントリー
├── index.html
├── package.json
├── vite.config.ts
├── eslint.config.js            # ESLint 設定 (Flat Config)
├── CONTRIBUTING.md              # コントリビューションガイド
└── .tool-versions              # asdf Node.js バージョン
```

## Config Format

`config.json` の構造:

```json
{
  "items": [
    {
      "id": "claude",
      "name": "Claude",
      "type": "app",
      "target": "Claude",
      "tags": ["ai"],
      "icon": "🤖",
      "favorite": true,
      "category": "ai-tools",
      "description": "AI assistant"
    }
  ],
  "tagDefs": [
    { "id": "ai", "label": "AI Tools", "color": "#8B5CF6" }
  ],
  "categoryList": [
    { "id": "ai-tools", "label": "AI Tools" }
  ],
  "emojiHistory": ["🤖", "📰", "💪"],
  "viewMode": "list",
  "cardSize": "lg",
  "sidebarWidth": 208,
  "locale": "en",
  "recentAccess": [
    { "id": "claude", "at": 1711454400000 }
  ],
  "globalShortcut": "CommandOrControl+Shift+Space",
  "sidebarCategoriesOpen": true,
  "sidebarTagsOpen": true,
  "combinedFilter": false,
  "multiTagMode": false
}
```

- `type`: `"app"` (Mac アプリ) or `"url"` (ブラウザ)
- `icon`: 省略時はタイプ別デフォルト (App: 🖥️ / Web: 🌐)
- `favorite`, `category`, `description`: 全て optional
- `tagDefs`: タグ定義 (id, label, color)
- `categoryList`: カテゴリ定義 (id, label)
- `emojiHistory`: 使用済み絵文字の履歴 (最大20個)
- `viewMode`, `cardSize`, `sidebarWidth`, `locale`: UI 状態の永続化
- `recentAccess`: 最近アクセスしたアイテムの配列 (`{id, at}` 形式、`at` は Unix timestamp (ms)、最大20件)
- `globalShortcut`: システム全体のグローバルショートカットキー (例: `"CommandOrControl+Shift+Space"`)
- `sidebarCategoriesOpen`: サイドバー Categories セクションの開閉状態
- `sidebarTagsOpen`: サイドバー Tags セクションの開閉状態
- `combinedFilter`: Category + Tag の結合フィルターモード（デフォルト: `false` = 排他フィルター）
- `multiTagMode`: 複数タグ AND 条件モード（デフォルト: `false`）

## CI/CD

- **GitHub Actions CI** - PR・push 時に TypeScript 型チェック (`tsc --noEmit`) + ESLint + Rust `cargo check` を自動実行（[`.github/workflows/ci.yml`](.github/workflows/ci.yml)）
- **GitHub Actions Release** - `v*` タグ push で署名付き Tauri ビルド → GitHub Release 作成 → Homebrew Cask 自動更新（[`.github/workflows/release.yml`](.github/workflows/release.yml)）。必要な GitHub Secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `HOMEBREW_TAP_TOKEN`
- **Branch Protection** - `main` ブランチへの直接 push は禁止。PR 必須、1 approval 以上で merge
- **Auto-update** - Tauri updater plugin によるアプリ内自動更新。Settings > About から確認・実行
- **Issue Templates** - [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) / [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md)
- **PR Template** - [Pull Request Template](.github/pull_request_template.md)

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) を参照。

## Profile System

端末ごとにアプリインストール状況が異なるため、Import 時は既存 config を上書きせず別名プロファイルとして保存する設計。

- `config.json` - アクティブな設定（Default）
- `config-{name}.json` - Import されたプロファイル

Settings (`⌘,`) > Profiles からワンクリックで切替可能。切替時は選択したプロファイルの内容が `config.json` にコピーされる。
