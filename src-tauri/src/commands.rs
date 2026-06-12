use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

// .map_err(estr) の定型を集約（エラー文字列の出力は従来と同一）
pub(crate) fn estr(e: impl std::fmt::Display) -> String {
    e.to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardItem {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub target: String,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favorite: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exclude_from_open_all: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagDef {
    pub id: String,
    pub label: String,
    pub color: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pinned: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pinned: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub items: Vec<DashboardItem>,
    pub tag_defs: Vec<TagDef>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category_list: Option<Vec<Category>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub view_mode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub card_size: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emoji_history: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sidebar_width: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recent_access: Option<Vec<RecentAccessEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub global_shortcut: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sidebar_categories_open: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sidebar_tags_open: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub combined_filter: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multi_tag_mode: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pinned_order: Option<Vec<String>>,
    // フロントエンドでは未使用だが、typed struct から消すと既存 config.json の
    // 値が次回保存で消失するため温存（Phase 1 の注記参照）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hidden_profiles: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dismissed_update_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentAccessEntry {
    pub id: String,
    pub at: f64,
}

fn icloud_config_dir() -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let icloud_dir = home
        .join("Library/Mobile Documents/com~apple~CloudDocs/my-dashboard-app");
    if icloud_dir.exists() || {
        fs::create_dir_all(&icloud_dir).is_ok() && icloud_dir.exists()
    } {
        Some(icloud_dir)
    } else {
        None
    }
}

fn local_config_dir() -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let config_dir = home.join(".config/my-dashboard-app");
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).ok()?;
    }
    Some(config_dir)
}

// (config ディレクトリ, アクティブ config.json) を一括解決する。
// 優先順位: iCloud の config.json > ローカルの config.json > iCloud 新規 > ローカル新規。
// ディレクトリは iCloud があれば常に iCloud 側（プロファイル・バックアップの置き場所）。
// OnceLock 等でのメモ化はしない（iCloud の出現/消失への追従が現仕様）。
fn resolve_config() -> (PathBuf, PathBuf) {
    let icloud = icloud_config_dir();
    let local = local_config_dir();

    let dir = icloud
        .clone()
        .or_else(|| local.clone())
        .unwrap_or_else(|| PathBuf::from("."));

    if let Some(icloud_dir) = &icloud {
        let icloud_path = icloud_dir.join("config.json");
        if icloud_path.exists() {
            return (dir, icloud_path);
        }
    }
    if let Some(local_dir) = &local {
        let local_path = local_dir.join("config.json");
        if local_path.exists() {
            return (dir, local_path);
        }
    }
    if let Some(icloud_dir) = &icloud {
        return (dir.clone(), icloud_dir.join("config.json"));
    }
    let path = local
        .unwrap_or_else(|| PathBuf::from("."))
        .join("config.json");
    (dir, path)
}

fn default_config() -> AppConfig {
    let default_json = include_str!("../resources/default-config.json");
    serde_json::from_str(default_json).expect("default config should be valid JSON")
}

// config ファイルの読み取り + パース。raw 文字列も返す
// （load_config_from_file は元バイトをそのまま書き戻すため）
fn read_config_file(path: &PathBuf) -> Result<(String, AppConfig), String> {
    let content = fs::read_to_string(path).map_err(estr)?;
    let config: AppConfig = serde_json::from_str(&content).map_err(estr)?;
    Ok((content, config))
}

fn save_config_to_path(config: &AppConfig, path: &PathBuf) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(estr)?;
    }
    let json = serde_json::to_string_pretty(config).map_err(estr)?;
    fs::write(path, json).map_err(estr)
}

#[tauri::command]
pub fn load_config() -> Result<AppConfig, String> {
    let (dir, path) = resolve_config();
    let config = if path.exists() {
        read_config_file(&path)?.1
    } else {
        let config = default_config();
        let _ = save_config_to_path(&config, &path);
        config
    };

    // Ensure sample profile exists
    let sample_path = dir.join("default-config.json");
    if !sample_path.exists() {
        let _ = save_config_to_path(&default_config(), &sample_path);
    }

    Ok(config)
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    let (_, path) = resolve_config();
    save_config_to_path(&config, &path)
}

#[tauri::command]
pub fn launch_app(name: String) -> Result<(), String> {
    Command::new("open")
        .args(["-a", &name])
        .spawn()
        .map_err(|e| format!("Failed to launch {}: {}", name, e))?;
    Ok(())
}

#[tauri::command]
pub fn get_config_path() -> String {
    resolve_config().1.to_string_lossy().to_string()
}

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    Command::new("open")
        .arg(&url)
        .spawn()
        .map_err(|e| format!("Failed to open {}: {}", url, e))?;
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
pub struct InstalledApp {
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub fn list_installed_apps() -> Result<Vec<InstalledApp>, String> {
    let search_dirs = [
        PathBuf::from("/Applications"),
        PathBuf::from("/System/Applications"),
        dirs::home_dir()
            .map(|h| h.join("Applications"))
            .unwrap_or_default(),
    ];

    let mut apps: Vec<InstalledApp> = Vec::new();

    for dir in &search_dirs {
        if !dir.exists() {
            continue;
        }
        collect_apps(dir, &mut apps, 0);
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.name == b.name);

    Ok(apps)
}

fn collect_apps(dir: &PathBuf, apps: &mut Vec<InstalledApp>, depth: u8) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("app") {
            if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                apps.push(InstalledApp {
                    name: name.to_string(),
                    path: path.to_string_lossy().to_string(),
                });
            }
        } else if depth < 1 && path.is_dir() {
            collect_apps(&path, apps, depth + 1);
        }
    }
}

#[tauri::command]
pub fn export_config(path: String) -> Result<(), String> {
    let config = load_config()?;
    save_config_to_path(&config, &PathBuf::from(path))
}

#[tauri::command]
pub fn import_config(path: String, profile_name: String) -> Result<AppConfig, String> {
    let (_, config) = read_config_file(&PathBuf::from(path))?;

    let safe_name = profile_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect::<String>();
    let filename = format!("config-{}.json", safe_name);
    let (dir, _) = resolve_config();
    let dest = dir.join(&filename);

    save_config_to_path(&config, &dest)?;

    Ok(config)
}

fn backup_config() {
    let (dir, active) = resolve_config();
    if !active.exists() { return; }
    let backup_dir = dir.join("backups");
    let _ = fs::create_dir_all(&backup_dir);
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let backup = backup_dir.join(format!("config-{}.json", timestamp));
    let _ = fs::copy(&active, &backup);
}

#[tauri::command]
pub fn load_config_from_file(path: String) -> Result<AppConfig, String> {
    // 元バイトをそのまま書き戻すため raw 文字列も受け取る
    let (content, config) = read_config_file(&PathBuf::from(path))?;

    backup_config();

    // Save as active config
    let (_, active_dest) = resolve_config();
    if let Some(parent) = active_dest.parent() {
        fs::create_dir_all(parent).map_err(estr)?;
    }
    fs::write(&active_dest, &content).map_err(estr)?;

    Ok(config)
}

#[cfg(test)]
mod tests {
    use super::AppConfig;

    /// 実 config.json 相当のフィクスチャ（全フィールド入り）。
    /// Phase 6 の serde rename_all 変更に対する安全網:
    /// deserialize -> serialize で JSON 値が一致すること（フィールド名・形式の不変条件）。
    const FULL_CONFIG: &str = r#"{
        "items": [
            {
                "id": "alpha",
                "name": "Alpha",
                "type": "app",
                "target": "Alpha.app",
                "tags": ["work"],
                "icon": "A",
                "favorite": true,
                "category": "dev",
                "description": "desc",
                "excludeFromOpenAll": true
            },
            {
                "id": "beta",
                "name": "Beta",
                "type": "url",
                "target": "https://example.com",
                "tags": []
            }
        ],
        "tagDefs": [
            { "id": "work", "label": "Work", "color": "blue", "pinned": true },
            { "id": "play", "label": "Play", "color": "red" }
        ],
        "categoryList": [
            { "id": "dev", "label": "Development", "pinned": true },
            { "id": "media", "label": "Media" }
        ],
        "viewMode": "card",
        "cardSize": "md",
        "emojiHistory": ["A", "B"],
        "locale": "ja",
        "sidebarWidth": 240.5,
        "recentAccess": [{ "id": "alpha", "at": 1718000000000.0 }],
        "globalShortcut": "Cmd+Shift+Space",
        "sidebarCategoriesOpen": true,
        "sidebarTagsOpen": false,
        "combinedFilter": true,
        "multiTagMode": false,
        "pinnedOrder": ["work", "dev"],
        "hiddenProfiles": ["sample"],
        "dismissedUpdateVersion": "0.13.0"
    }"#;

    const MINIMAL_CONFIG: &str = r#"{ "items": [], "tagDefs": [] }"#;

    fn roundtrip(json: &str) -> (serde_json::Value, serde_json::Value) {
        let parsed: AppConfig = serde_json::from_str(json).expect("deserialize");
        let serialized = serde_json::to_string(&parsed).expect("serialize");
        (
            serde_json::from_str(json).expect("input as value"),
            serde_json::from_str(&serialized).expect("output as value"),
        )
    }

    #[test]
    fn full_config_roundtrip_preserves_all_fields() {
        let (input, output) = roundtrip(FULL_CONFIG);
        assert_eq!(input, output);
    }

    #[test]
    fn minimal_config_roundtrip_does_not_invent_fields() {
        let (input, output) = roundtrip(MINIMAL_CONFIG);
        assert_eq!(input, output);
    }

    #[test]
    fn optional_fields_are_skipped_when_absent() {
        let parsed: AppConfig = serde_json::from_str(MINIMAL_CONFIG).expect("deserialize");
        let serialized = serde_json::to_string(&parsed).expect("serialize");
        assert_eq!(serialized, r#"{"items":[],"tagDefs":[]}"#);
    }
}
