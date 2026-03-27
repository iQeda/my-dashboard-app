export type ItemType = "app" | "url";
export type CardSize = "sm" | "md" | "lg";
export type ViewMode = "card" | "list";
export type PageView = "dashboard" | "items";

export interface DashboardItem {
  readonly id: string;
  readonly name: string;
  readonly type: ItemType;
  readonly target: string;
  readonly tags: readonly string[];
  readonly icon?: string;
  readonly favorite?: boolean;
  readonly category?: string;
  readonly description?: string;
  readonly excludeFromOpenAll?: boolean;
}

export interface TagDef {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly pinned?: boolean;
}

export interface Category {
  readonly id: string;
  readonly label: string;
  readonly pinned?: boolean;
}

export interface AppConfig {
  readonly items: readonly DashboardItem[];
  readonly tagDefs: readonly TagDef[];
  readonly categoryList?: readonly Category[];
  readonly viewMode?: ViewMode;
  readonly cardSize?: CardSize;
  readonly emojiHistory?: readonly string[];
  readonly locale?: string;
  readonly sidebarWidth?: number;
  readonly globalShortcut?: string;
  readonly sidebarCategoriesOpen?: boolean;
  readonly sidebarTagsOpen?: boolean;
  readonly combinedFilter?: boolean;
  readonly multiTagMode?: boolean;
  readonly pinnedOrder?: readonly string[];
  readonly recentAccess?: readonly RecentAccessEntry[];
}

export interface RecentAccessEntry {
  readonly id: string;
  readonly at: number;
}

export interface InstalledApp {
  readonly name: string;
  readonly path: string;
}

export interface ConfigProfile {
  readonly name: string;
  readonly filename: string;
  readonly path: string;
  readonly active: boolean;
}
