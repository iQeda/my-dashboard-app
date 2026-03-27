use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    #[serde(rename = "excludeFromOpenAll", skip_serializing_if = "Option::is_none")]
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
pub struct AppConfig {
    pub items: Vec<DashboardItem>,
    #[serde(rename = "tagDefs")]
    pub tag_defs: Vec<TagDef>,
    #[serde(rename = "categoryList", skip_serializing_if = "Option::is_none")]
    pub category_list: Option<Vec<Category>>,
    #[serde(rename = "viewMode", skip_serializing_if = "Option::is_none")]
    pub view_mode: Option<String>,
    #[serde(rename = "cardSize", skip_serializing_if = "Option::is_none")]
    pub card_size: Option<String>,
    #[serde(rename = "emojiHistory", skip_serializing_if = "Option::is_none")]
    pub emoji_history: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,
    #[serde(rename = "sidebarWidth", skip_serializing_if = "Option::is_none")]
    pub sidebar_width: Option<f64>,
    #[serde(rename = "recentAccess", skip_serializing_if = "Option::is_none")]
    pub recent_access: Option<Vec<RecentAccessEntry>>,
    #[serde(rename = "globalShortcut", skip_serializing_if = "Option::is_none")]
    pub global_shortcut: Option<String>,
    #[serde(rename = "sidebarCategoriesOpen", skip_serializing_if = "Option::is_none")]
    pub sidebar_categories_open: Option<bool>,
    #[serde(rename = "sidebarTagsOpen", skip_serializing_if = "Option::is_none")]
    pub sidebar_tags_open: Option<bool>,
    #[serde(rename = "combinedFilter", skip_serializing_if = "Option::is_none")]
    pub combined_filter: Option<bool>,
    #[serde(rename = "multiTagMode", skip_serializing_if = "Option::is_none")]
    pub multi_tag_mode: Option<bool>,
    #[serde(rename = "pinnedOrder", skip_serializing_if = "Option::is_none")]
    pub pinned_order: Option<Vec<String>>,
    #[serde(rename = "hiddenProfiles", skip_serializing_if = "Option::is_none")]
    pub hidden_profiles: Option<Vec<String>>,
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

fn config_path() -> PathBuf {
    if let Some(icloud_dir) = icloud_config_dir() {
        let icloud_path = icloud_dir.join("config.json");
        if icloud_path.exists() {
            return icloud_path;
        }
    }

    if let Some(local_dir) = local_config_dir() {
        let local_path = local_dir.join("config.json");
        if local_path.exists() {
            return local_path;
        }
    }

    if let Some(icloud_dir) = icloud_config_dir() {
        return icloud_dir.join("config.json");
    }

    local_config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("config.json")
}

fn default_config() -> AppConfig {
    let default_json = include_str!("../resources/default-config.json");
    serde_json::from_str(default_json).expect("default config should be valid JSON")
}

#[tauri::command]
pub fn load_config() -> Result<AppConfig, String> {
    let path = config_path();
    let config = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())?
    } else {
        let config = default_config();
        let _ = save_config_to_path(&config, &path);
        config
    };

    // Ensure sample profile exists
    let sample_path = config_dir().join("default-config.json");
    if !sample_path.exists() {
        let _ = save_config_to_path(&default_config(), &sample_path);
    }

    Ok(config)
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    let path = config_path();
    save_config_to_path(&config, &path)
}

fn save_config_to_path(config: &AppConfig, path: &PathBuf) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
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
    config_path().to_string_lossy().to_string()
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

fn config_dir() -> PathBuf {
    if let Some(d) = icloud_config_dir() { return d; }
    local_config_dir().unwrap_or_else(|| PathBuf::from("."))
}

#[tauri::command]
pub fn export_config(path: String) -> Result<(), String> {
    let config = load_config()?;
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_config(path: String, profile_name: String) -> Result<AppConfig, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: AppConfig =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let safe_name = profile_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect::<String>();
    let filename = format!("config-{}.json", safe_name);
    let dest = config_dir().join(&filename);

    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&dest, json).map_err(|e| e.to_string())?;

    Ok(config)
}

#[derive(Debug, Clone, Serialize)]
pub struct ConfigProfile {
    pub name: String,
    pub filename: String,
    pub path: String,
    pub active: bool,
}

fn backup_config() {
    let active = config_path();
    if !active.exists() { return; }
    let backup_dir = config_dir().join("backups");
    let _ = fs::create_dir_all(&backup_dir);
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let backup = backup_dir.join(format!("config-{}.json", timestamp));
    let _ = fs::copy(&active, &backup);
}

#[tauri::command]
pub fn list_config_profiles() -> Result<Vec<ConfigProfile>, String> {
    let dir = config_dir();
    let active_path = config_path();

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut profiles: Vec<ConfigProfile> = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() { continue; }
        if path.extension().and_then(|e| e.to_str()) != Some("json") { continue; }
        let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        // Exclude backup files and .bak files
        if filename.starts_with("config-backup-") || filename.ends_with(".bak") { continue; }
        let name = path.to_string_lossy().to_string();
        profiles.push(ConfigProfile {
            name,
            filename: filename.clone(),
            path: path.to_string_lossy().to_string(),
            active: path == active_path,
        });
    }

    profiles.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(profiles)
}

#[tauri::command]
pub fn switch_config(filename: String) -> Result<AppConfig, String> {
    let path = config_dir().join(&filename);
    if !path.exists() {
        return Err(format!("Config file not found: {}", filename));
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: AppConfig =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    backup_config();

    // Copy to config.json to make it active
    let active_dest = config_dir().join("config.json");
    fs::write(&active_dest, &content).map_err(|e| e.to_string())?;

    Ok(config)
}

#[tauri::command]
pub fn load_config_from_file(path: String) -> Result<AppConfig, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: AppConfig =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    backup_config();

    // Save as active config
    let active_dest = config_path();
    if let Some(parent) = active_dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&active_dest, &content).map_err(|e| e.to_string())?;

    Ok(config)
}
