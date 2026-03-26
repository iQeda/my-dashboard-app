# MyDashboard

Mac 用のアプリ/サイト ランチャー。毎日使うアプリやブラウザサイトをワンクリックで起動できるダッシュボード。

## Tech Stack

- **Tauri v2** (Rust) - ネイティブ Mac アプリ
- **React 19** + **TypeScript** - フロントエンド
- **Vite 8** - ビルドツール
- **Tailwind CSS v4** - スタイリング

## Prerequisites

- **Node.js 20+** (`asdf install nodejs 22`)
- **Rust / Cargo** (`rustup`)
- **pnpm** (`corepack enable`)
- **Tauri CLI** (`cargo install tauri-cli --version "^2"`)

## Setup

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

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | コマンドパレット（アイテム起動 + タグフィルター） |
| `⌘N` | アイテム追加 |
| `⌘Enter` | モーダル内で Save |
| `⌘,` | Settings |
| `Escape` | モーダル / パレットを閉じる |

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

### Categories
- アイテムに1つだけ設定できるカテゴリ（Tags とは別概念）
- Category でグループ化してセパレート表示（セクションヘッダー付き）
- **Uncategorized** フィルター - カテゴリ未設定アイテムの絞り込み
- サイドバーからクリックで絞り込み（紫ハイライト）
- 右クリックで Rename / Delete
- ドラッグ&ドロップで並び替え
- 見出し右クリックで昇順/降順ソート

### Tags
- タグで分類・フィルタリング（シングル / マルチ選択モード切替）
- マルチ選択は AND 条件（選択した全タグを持つアイテムのみ表示）
- 右クリックで Rename / Change Color / Delete
- 20色カラーパレットから色を選択
- ポインターイベントベースのドラッグ&ドロップで並び替え
- 見出し右クリックで昇順/降順ソート
- Add Item 時にその場で新規タグ作成可能（重複チェック・カラー選択付き）

### UI
- **ビュー切替** - カードビュー / リストビュー（デフォルト: リスト）
- **コマンドパレット** (`⌘K`) - アイテム + タグの統合検索。キーボードで選択・実行
- **カードサイズ切替** - S / M / L の3段階（カードビュー時のみ）
- **ソート** - A→Z / Z→A（デフォルト昇順）
- **タイプフィルター** - All / App / Web
- **検索バー** - アイテム名で絞り込み
- **アクティブフィルター表示** - 検索バー下にフィルターチップ表示 + Clear All
- **ダークモード** - OS 設定に自動追従
- **i18n** - 英語/日本語切替（Settings から）
- 起動時にウィンドウ最大化
- ビューモード・カードサイズ・サイドバー幅は config に保存（次回起動時に復元）

### Sidebar
- **All Items** - 全アイテム表示
- **Favorites** - お気に入りフィルター
- **Categories** - カテゴリ絞り込み + Uncategorized（ドラッグ並替・右クリック編集・見出しソート）
- **Tags** - シングル / マルチ選択トグル付き（ドラッグ並替・右クリック編集・見出しソート）
- **Settings** (`⌘,`) - 設定画面を開く
- サイドバー幅はドラッグでリサイズ可能（160px〜400px、config に保存）

### Data & Profiles
- **iCloud 同期** - `~/Library/Mobile Documents/com~apple~CloudDocs/my-dashboard-app/config.json` に優先保存
- **ローカル保存** - iCloud 未使用時は `~/.config/my-dashboard-app/config.json`
- **Import** - 別名プロファイルとして保存（既存 config を上書きしない）
- **Export** - 現在の設定をファイルに書き出し
- **Profile 切替** - Settings 内で複数プロファイルを管理・切替

## Project Structure

```
my-dashboard-app/
├── src-tauri/                  # Rust バックエンド
│   ├── src/
│   │   ├── main.rs             # エントリーポイント
│   │   ├── lib.rs              # Tauri setup, コマンド登録
│   │   └── commands.rs         # Tauri コマンド
│   ├── resources/
│   │   └── default-config.json # デフォルト設定
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                        # React フロントエンド
│   ├── App.tsx                 # ルートレイアウト・キーボードショートカット・I18nProvider
│   ├── main.tsx                # エントリーポイント
│   ├── i18n.tsx                # 翻訳システム (EN/JA)
│   ├── constants.ts            # TAG_COLORS 定義
│   ├── types/index.ts          # TypeScript 型定義
│   ├── hooks/
│   │   ├── useConfig.ts        # 設定の CRUD・永続化
│   │   └── useFilter.ts        # フィルタ・ソート・検索
│   ├── components/
│   │   ├── Dashboard.tsx       # カード/リストビュー + Category グループ表示
│   │   ├── ItemCard.tsx        # カードビュー用アイテム
│   │   ├── ItemRow.tsx         # リストビュー用アイテム
│   │   ├── ItemFormModal.tsx   # 追加・編集モーダル（バリデーション付き）
│   │   ├── Sidebar.tsx         # サイドバー + リサイズ + 右クリックソート
│   │   ├── SearchBar.tsx       # 検索・ビュー切替・ソート・サイズ・タイプフィルター
│   │   ├── ActiveFilters.tsx   # フィルターチップ表示 + Clear All
│   │   ├── CommandPalette.tsx  # 統合検索パレット (⌘K)
│   │   ├── ContextMenu.tsx     # アイテム右クリックメニュー
│   │   ├── SettingsModal.tsx   # 設定画面 (⌘,) + 言語切替
│   │   └── EmojiPicker.tsx     # 絵文字ピッカー（履歴・検索付き）
│   └── styles/
│       └── index.css           # Tailwind エントリー
├── index.html
├── package.json
├── vite.config.ts
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
  "locale": "en"
}
```

- `type`: `"app"` (Mac アプリ) or `"url"` (ブラウザ)
- `icon`: 省略時はタイプ別デフォルト (App: 🖥️ / Web: 🌐)
- `favorite`, `category`, `description`: 全て optional
- `tagDefs`: タグ定義 (id, label, color)
- `categoryList`: カテゴリ定義 (id, label)
- `emojiHistory`: 使用済み絵文字の履歴 (最大20個)
- `viewMode`, `cardSize`, `sidebarWidth`, `locale`: UI 状態の永続化

## Profile System

端末ごとにアプリインストール状況が異なるため、Import 時は既存 config を上書きせず別名プロファイルとして保存する設計。

- `config.json` - アクティブな設定（Default）
- `config-{name}.json` - Import されたプロファイル

Settings (`⌘,`) > Profiles からワンクリックで切替可能。切替時は選択したプロファイルの内容が `config.json` にコピーされる。
