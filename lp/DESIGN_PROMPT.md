# MyDashboard LP Design Prompt

## Overview

MyDashboard のランディングページ（LP）をデザインしてください。
Mac 用のアプリ/サイトランチャーで、毎日使うアプリやブラウザサイトをワンクリックで起動できるダッシュボードアプリです。
Tauri v2 + React で構築されたネイティブ Mac アプリケーション。

## Target Audience

- Mac ユーザー（開発者、デザイナー、ナレッジワーカー）
- 日常的に多くのアプリ・Web サービスを使い分けている人
- キーボード操作を好むパワーユーザー

## Design Direction

- **Clean & Minimal**: 余白を活かしたモダンなデザイン
- **Dark mode base**: ダーク背景（#0F172A〜#1E293B 系）をベースに、アプリ UI と統一感
- **Accent color**: Blue (#3B82F6) をプライマリ、Purple (#8B5CF6) をセカンダリ
- **Typography**: System font stack、大きなヘッドライン、読みやすい本文
- **Glass morphism**: アプリ UI で使用しているガラス風エフェクトを LP にも適用
- **1ページ完結**: SPA 的なスクロール LP
- **Desktop-first**: モバイル対応不要（Mac アプリの LP）

## Screenshots (lp/images/)

以下の4枚のスクリーンショットを LP 内で使用してください:

| File | Content | Usage |
|------|---------|-------|
| `images/dashboard.png` | Dashboard ページ全体像。Favorites, Pinned, Categories, Workspaces | Hero セクションのメインビジュアル |
| `images/all_items.png` | Items リスト表示。カテゴリグループ、タグバッジ、ツールバー | Features / How it works セクション |
| `images/search.png` | コマンドパレット（⌘K）。ワークスペース・アイテム検索 | Keyboard Shortcuts セクション |
| `images/edit_item.png` | 編集モーダル。Type ボタン、Category、Workspaces、カラーパレット | Features セクション |

## Page Structure (Sections)

### 1. Hero Section

- **Headline**: "Your Apps & Sites. One Dashboard."
- **Subheadline**: Organize your apps and websites with categories & workspaces. Launch anything instantly with keyboard shortcuts.
- **CTA button**: "Download for Mac" (blue primary button)
- **Sub CTA**: Homebrew コマンド `brew install --cask mydashboard` をコピー可能なコードブロックで表示
- **Badges**: "Free & Open Source" / "Apple Silicon Native"
- **Hero Image**: `images/dashboard.png` を少し傾けて立体感（perspective transform）。背景にグロー効果（青/紫のグラデーション光）

### 2. Features Grid Section

"Everything you need" のような見出し。6つの主要機能をカード形式で紹介:

| Feature | Icon idea | Description |
|---------|-----------|-------------|
| App & URL Launcher | Rocket | Launch Mac apps and browser sites with one click |
| Workspaces | Layers | Group related apps & sites into workspaces. Open all at once |
| Keyboard First | Command key | ⌘K command palette, arrow keys to navigate, Enter to launch |
| Categories | Folder | Organize items by category with visual separators |
| iCloud Sync | Cloud | Config auto-saved to iCloud. Seamless across multiple Macs |
| Dark Mode | Moon | Automatically follows your macOS appearance setting |

- 各カードはアイコン + タイトル + 1-2行の説明
- ホバーで微妙に浮き上がるインタラクション

### 3. App Screenshot Showcase Section

"How it works" のような見出し。3つのスクリーンショットを横並びまたはタブ切替で表示:

1. **Dashboard View** (`images/dashboard.png`) — "See everything at a glance. Favorites, pinned workspaces, categories, and recent items."
2. **Items List** (`images/all_items.png`) — "Browse all items grouped by category. Filter by type, sort, and search."
3. **Command Palette** (`images/search.png`) — "Press ⌘K to instantly search and launch any item or workspace."

各スクリーンショットにキャプション付き。

### 4. Keyboard Shortcuts Section

"Built for keyboard users" のような見出し。主要ショートカットをキーキャップ風デザインで表示:

- `⌘K` — Command Palette
- `⌘N` — New Item
- `⌘F` — Search
- `↑↓` + `Enter` — Navigate & Launch
- `⌘⇧A` — Open All
- `⌘⇧D` — Dashboard

### 5. Open Source Section

"Open Source & Native" のような見出し。

- Tech stack icons/badges: Tauri, Rust, React, TypeScript, Tailwind CSS
- GitHub リポジトリへのリンクボタン "View on GitHub"
- License: MIT

### 6. Install Section (Final CTA)

"Get Started in Seconds" のような見出し。

- Homebrew インストールコマンド（コピーボタン付きコードブロック）:
  ```
  brew tap iQeda/tap
  brew install --cask mydashboard
  ```
- Manual download リンク（GitHub Releases）
- Badges: "Apple Silicon (aarch64) Native" / "Auto-update built-in"

### 7. Footer

- GitHub リポジトリリンク
- MIT License
- "Made with Tauri + React"

## Layout Specs

- **Max width**: 1200px
- **Section padding**: 上下 80-120px
- **Features grid**: 3x2
- **Color palette**:

| Role | Color |
|------|-------|
| Background | #0F172A |
| Surface | #1E293B |
| Primary | #3B82F6 |
| Secondary | #8B5CF6 |
| Text Primary | #F1F5F9 |
| Text Secondary | #94A3B8 |
| Border | rgba(255,255,255,0.1) |

## Notes

- ダークモードのみで OK
- アニメーションは後で HTML 実装時に追加するため、静的デザインで OK
- GitHub Pages でホストするため、最終的に静的 HTML + CSS で実装
- スクリーンショットは `images/` ディレクトリから相対パスで参照
