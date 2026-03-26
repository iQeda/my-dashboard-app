import { createContext, useContext } from "react";

export type Locale = "en" | "ja";

const translations = {
  // Common
  "save": { en: "Save", ja: "保存" },
  "cancel": { en: "Cancel", ja: "キャンセル" },
  "delete": { en: "Delete", ja: "削除" },
  "delete_confirm": { en: "Delete?", ja: "削除しますか？" },
  "yes": { en: "Yes", ja: "はい" },
  "no": { en: "No", ja: "いいえ" },
  "close": { en: "Close", ja: "閉じる" },
  "rename": { en: "Rename", ja: "名前変更" },
  "change_color": { en: "Change Color", ja: "色を変更" },
  "edit": { en: "Edit", ja: "編集" },
  "add": { en: "Add", ja: "追加" },
  "none": { en: "None", ja: "なし" },
  "duplicate": { en: "Duplicate", ja: "複製" },
  "no_results": { en: "No results", ja: "結果なし" },
  "active": { en: "Active", ja: "有効" },
  "required": { en: "Required", ja: "必須" },
  "loading": { en: "Loading...", ja: "読み込み中..." },

  // Sidebar
  "dashboard": { en: "Dashboard", ja: "ダッシュボード" },
  "recent": { en: "Recent", ja: "最近のアクセス" },
  "all_items": { en: "All Items", ja: "すべてのアイテム" },
  "favorites": { en: "Favorites", ja: "お気に入り" },
  "categories": { en: "Categories", ja: "カテゴリ" },
  "tags": { en: "Tags", ja: "タグ" },
  "multi": { en: "Multi Tag (AND)", ja: "複数タグ (AND)" },
  "settings": { en: "Settings", ja: "設定" },

  // Item Form
  "add_item": { en: "Add Item", ja: "アイテム追加" },
  "edit_item": { en: "Edit Item", ja: "アイテム編集" },
  "type": { en: "Type", ja: "タイプ" },
  "app": { en: "App", ja: "アプリ" },
  "url": { en: "URL", ja: "URL" },
  "web": { en: "Web", ja: "Web" },
  "display_name": { en: "Display Name", ja: "表示名" },
  "description": { en: "Description", ja: "説明" },
  "category": { en: "Category", ja: "カテゴリ" },
  "search_installed_apps": { en: "Search installed apps...", ja: "インストール済みアプリを検索..." },
  "auto_filled_from_app": { en: "Auto-filled from app", ja: "アプリから自動入力" },
  "url_placeholder": { en: "e.g. https://example.com", ja: "例: https://example.com" },
  "name_placeholder": { en: "e.g. GitHub Reviews", ja: "例: GitHub Reviews" },
  "optional_description": { en: "Optional description", ja: "説明（任意）" },
  "new_tag_name": { en: "New tag name", ja: "新しいタグ名" },
  "new_category": { en: "New category", ja: "新しいカテゴリ" },
  "select_app": { en: "Select an app", ja: "アプリを選択してください" },
  "enter_url": { en: "Enter a URL", ja: "URL を入力してください" },
  "url_invalid": { en: "URL must start with http:// or https://", ja: "http:// または https:// で始まる URL を入力してください" },

  // Search
  "search_placeholder": { en: "Search... (⌘K)", ja: "検索... (⌘K)" },
  "search_items_tags": { en: "Search items and tags...", ja: "アイテムとタグを検索..." },

  // Sort / Filter
  "sort_asc": { en: "A → Z", ja: "A → Z" },
  "sort_desc": { en: "Z → A", ja: "Z → A" },
  "sort_asc_name": { en: "Sort A → Z", ja: "昇順ソート" },
  "sort_desc_name": { en: "Sort Z → A", ja: "降順ソート" },
  "type_all": { en: "All", ja: "すべて" },
  "clear_all": { en: "Clear All", ja: "すべて解除" },
  "combined_filter": { en: "Category + Tag", ja: "カテゴリ + タグ" },
  "open_all": { en: "Open All", ja: "すべて開く" },

  // Context Menu
  "favorite": { en: "Favorite", ja: "お気に入り" },
  "unfavorite": { en: "Unfavorite", ja: "お気に入り解除" },

  // Settings
  "config": { en: "Config", ja: "設定ファイル" },
  "current_config_file": { en: "Current config file", ja: "現在の設定ファイル" },
  "profiles": { en: "Profiles", ja: "プロファイル" },
  "data": { en: "Data", ja: "データ" },
  "import_config": { en: "Import Config (as new profile)", ja: "設定をインポート（新規プロファイル）" },
  "export_config": { en: "Export Config", ja: "設定をエクスポート" },
  "about": { en: "About", ja: "バージョン情報" },
  "language": { en: "Language", ja: "言語" },
  "global_shortcut": { en: "Global Shortcut", ja: "グローバルショートカット" },
  "press_to_record": { en: "Press keys to record...", ja: "キーを押して記録..." },
  "record": { en: "Record", ja: "記録" },
  "clear": { en: "Clear", ja: "解除" },
  "not_set": { en: "Not set", ja: "未設定" },
  "check_for_updates": { en: "Check for Updates", ja: "アップデートを確認" },
  "checking": { en: "Checking...", ja: "確認中..." },
  "up_to_date": { en: "Up to date", ja: "最新です" },
  "update_available": { en: "Update available", ja: "アップデートあり" },
  "update_now": { en: "Update Now", ja: "今すぐ更新" },
  "downloading": { en: "Downloading...", ja: "ダウンロード中..." },
  "installing": { en: "Installing... App will restart.", ja: "インストール中... アプリが再起動します。" },
  "update_failed": { en: "Update failed", ja: "更新に失敗しました" },
  "save_as_profile": { en: "Save as Profile", ja: "プロファイルとして保存" },
  "import_profile_desc": { en: "Import will be saved as a separate profile. The current config will not be overwritten.", ja: "インポートは別プロファイルとして保存されます。現在の設定は上書きされません。" },
  "profile_name": { en: "Profile name", ja: "プロファイル名" },

  // Dashboard
  "uncategorized": { en: "Uncategorized", ja: "未分類" },
  "no_items_match": { en: "No items match your filter.", ja: "条件に一致するアイテムがありません。" },

  // Emoji Picker
  "choose_icon": { en: "Choose icon", ja: "アイコンを選択" },
  "search_emoji": { en: "Search emoji...", ja: "絵文字を検索..." },
  "reset_to_default": { en: "Reset to default", ja: "デフォルトに戻す" },
  "history": { en: "History", ja: "履歴" },

  // ItemCard
  "add_to_favorites": { en: "Add to favorites", ja: "お気に入りに追加" },
  "remove_from_favorites": { en: "Remove from favorites", ja: "お気に入りから削除" },
} as const;

type TranslationKey = keyof typeof translations;

export type TranslationFn = (key: TranslationKey) => string;

function createTranslator(locale: Locale): TranslationFn {
  return (key: TranslationKey) => translations[key]?.[locale] ?? key;
}

const I18nContext = createContext<{ t: TranslationFn; locale: Locale }>({
  t: createTranslator("en"),
  locale: "en",
});

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = createTranslator(locale);
  return <I18nContext.Provider value={{ t, locale }}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  return useContext(I18nContext);
}
