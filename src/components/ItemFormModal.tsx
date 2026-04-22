import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import type { DashboardItem, ItemType, TagDef, Category, InstalledApp } from "../types";
import { EmojiPicker } from "./EmojiPicker";
import { TAG_COLORS } from "../constants";
import { useI18n } from "../i18n";

interface ItemFormModalProps {
  readonly item: DashboardItem | null;
  readonly tagDefs: readonly TagDef[];
  readonly categoryList: readonly Category[];
  readonly emojiHistory: readonly string[];
  readonly defaultTags: readonly string[];
  readonly defaultCategory?: string;
  readonly existingItemIds?: ReadonlySet<string>;
  readonly onSave: (item: DashboardItem, newTagDefs: readonly TagDef[], newCategoryList: readonly Category[]) => void;
  readonly onDelete?: (id: string) => void;
  readonly onClose: () => void;
}

function AppPicker({
  value,
  onSelect,
}: {
  readonly value: string;
  readonly onSelect: (app: InstalledApp) => void;
}) {
  const { t } = useI18n();
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    invoke<InstalledApp[]>("list_installed_apps").then(setApps).catch(console.error);
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        listRef.current && !listRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, updatePosition]);

  const filtered = apps.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("search_installed_apps")}
          className="w-full px-3 py-2 pr-8 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && filtered.length > 0 && createPortal(
        <ul
          ref={listRef}
          style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
          className="z-[100] max-h-56 overflow-y-auto rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-xl"
        >
          {filtered.slice(0, 80).map((app) => (
            <li key={app.path}>
              <button
                type="button"
                onClick={() => {
                  onSelect(app);
                  setQuery(app.name);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer"
              >
                {app.name}
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
}

export function ItemFormModal({
  item,
  tagDefs,
  categoryList,
  emojiHistory,
  defaultTags,
  defaultCategory,
  existingItemIds,
  onSave,
  onDelete,
  onClose,
}: ItemFormModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [type, setType] = useState<ItemType>("app");
  const [target, setTarget] = useState("");
  const [icon, setIcon] = useState("");
  const [errors, setErrors] = useState<{ name?: string; target?: string }>({});
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [localCategoryList, setLocalCategoryList] = useState<Category[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [tagError, setTagError] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [excludeFromOpenAll, setExcludeFromOpenAll] = useState(false);
  const [localTagDefs, setLocalTagDefs] = useState<TagDef[]>([]);

  useEffect(() => {
    setLocalTagDefs([...tagDefs]);
    setLocalCategoryList([...categoryList]);
    if (item) {
      setName(item.name);
      setType(item.type);
      setTarget(item.target);
      setIcon(item.icon ?? "");
      setDescription(item.description ?? "");
      setSelectedTags([...item.tags]);
      setSelectedCategory(item.category ?? "");
      setExcludeFromOpenAll(item.excludeFromOpenAll ?? false);
    } else {
      setName("");
      setType("app");
      setTarget("");
      setIcon("");
      setDescription("");
      setSelectedTags([...defaultTags]);
      setSelectedCategory(defaultCategory ?? "");
      setExcludeFromOpenAll(false);
    }
  }, [item, tagDefs, categoryList, defaultTags, defaultCategory]);

  const validate = useCallback((n: string, tgt: string, tp: string) => {
    const e: { name?: string; target?: string } = {};
    if (!n.trim()) e.name = t("required");
    if (!tgt.trim()) {
      e.target = tp === "app" ? t("select_app") : t("enter_url");
    } else if (tp === "url" && !/^https?:\/\/.+/.test(tgt.trim())) {
      e.target = t("url_invalid");
    }
    return e;
  }, [t]);

  useEffect(() => {
    setErrors(validate(name, target, type));
  }, [name, target, type, validate]);

  const handleSubmit = useCallback(() => {
    const currentErrors = validate(name, target, type);
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    let id = item?.id ?? name.toLowerCase().replace(/\s+/g, "-");
    if (!item && existingItemIds) {
      while (existingItemIds.has(id)) {
        const match = id.match(/-(\d+)$/);
        id = match ? id.replace(/-\d+$/, `-${Number(match[1]) + 1}`) : `${id}-2`;
      }
    }
    const trimmedIcon = icon.trim() || undefined;
    const trimmedDesc = description.trim() || undefined;
    const cat = selectedCategory || undefined;
    onSave(
      { id, name: name.trim(), type, target: target.trim(), tags: selectedTags, icon: trimmedIcon, description: trimmedDesc, category: cat, favorite: item?.favorite, excludeFromOpenAll: excludeFromOpenAll || undefined },
      localTagDefs,
      localCategoryList,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, target, type, icon, description, selectedCategory, selectedTags, localTagDefs, localCategoryList, excludeFromOpenAll, item, onSave]);

  const handleAddCategory = () => {
    const label = newCategoryInput.trim();
    if (!label) return;
    if (localCategoryList.some((c) => c.label.toLowerCase() === label.toLowerCase())) {
      setCategoryError(t("duplicate_category"));
      return;
    }
    setCategoryError("");
    let catId = label.toLowerCase().replace(/\s+/g, "-");
    const existingIds = new Set(localCategoryList.map((c) => c.id));
    if (existingIds.has(catId)) {
      let suffix = 2;
      while (existingIds.has(`${catId}-${suffix}`)) suffix++;
      catId = `${catId}-${suffix}`;
    }
    setLocalCategoryList((prev) => [...prev, { id: catId, label }]);
    setSelectedCategory(catId);
    setNewCategoryInput("");
  };

  const handleAppSelect = (app: InstalledApp) => {
    setTarget(app.name);
    setName(app.name);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  };

  const handleAddTag = () => {
    const label = newTagInput.trim();
    if (!label) return;

    if (localTagDefs.some((c) => c.label.toLowerCase() === label.toLowerCase())) {
      setTagError(t("duplicate_workspace"));
      return;
    }
    setTagError("");

    let id = label.toLowerCase().replace(/\s+/g, "-");
    const existingIds = new Set(localTagDefs.map((c) => c.id));
    if (existingIds.has(id)) {
      let suffix = 2;
      while (existingIds.has(`${id}-${suffix}`)) suffix++;
      id = `${id}-${suffix}`;
    }

    const newDef: TagDef = { id, label, color: newTagColor };
    setLocalTagDefs((prev) => [...prev, newDef]);
    setSelectedTags((prev) => [...prev, id]);
    setNewTagInput("");
    const nextColorIdx = (TAG_COLORS.indexOf(newTagColor) + 1) % TAG_COLORS.length;
    setNewTagColor(TAG_COLORS[nextColorIdx]);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const emojiPickerOpenRef = useRef(false);
  emojiPickerOpenRef.current = emojiPickerOpen;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (emojiPickerOpenRef.current) return;
        onClose();
      }
      if (e.metaKey && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handleSubmit]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl mx-6 p-8 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col gap-5 max-h-[90vh] overflow-y-scroll overscroll-contain"
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {item ? t("edit_item") : t("add_item")}
        </h2>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("type")}</span>
          <div className="flex gap-2">
            {(["app", "url"] as const).map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => { if (tp !== type) { setType(tp); setTarget(""); setName(""); } }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  type === tp
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {tp === "app" ? t("app") : t("url")}
              </button>
            ))}
          </div>
        </div>

        {type === "app" ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("app")}
            </span>
            <AppPicker value={target} onSelect={handleAppSelect} />
            {errors.target && <span className="text-xs text-red-500 mt-0.5">{errors.target}</span>}
          </div>
        ) : (
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("url")}</span>
            <input
              type="text"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setName(e.target.value);
              }}
              placeholder={t("url_placeholder")}
              className={`px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${errors.target ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-gray-600"}`}
            />
            {errors.target && <span className="text-xs text-red-500 mt-0.5">{errors.target}</span>}
          </label>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("display_name")}
          </span>
          <div className="flex gap-2 items-center">
            <EmojiPicker
              value={icon}
              fallback={type === "app" ? "\uD83D\uDDA5\uFE0F" : "\uD83C\uDF10"}
              history={emojiHistory}
              onSelect={setIcon}
              onOpenChange={setEmojiPickerOpen}
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "app" ? t("auto_filled_from_app") : t("name_placeholder")}
              className={`flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${errors.name ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-gray-600"}`}
            />
          </div>
          {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("description")}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("optional_description")}
            rows={4}
            className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-y min-h-[40px]"
          />
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => setExcludeFromOpenAll((prev) => !prev)}
            className={`relative w-9 h-5 rounded-full transition-colors ${excludeFromOpenAll ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${excludeFromOpenAll ? "translate-x-4" : ""}`} />
          </button>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("exclude_from_open_all")}</span>
        </label>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t("category")}</legend>
          <div className="flex flex-wrap gap-2 mt-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === "" ? "bg-gray-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t("none")}
            </button>
            {[...localCategoryList].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === c.id ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => { setNewCategoryInput(e.target.value); setCategoryError(""); }}
              placeholder={t("new_category")}
              className={`flex-1 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 border text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${categoryError ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-gray-600"}`}
            />
            <button
              type="button"
              onClick={() => handleAddCategory()}
              disabled={!newCategoryInput.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
            >
              + {t("add")}
            </button>
          </div>
          {categoryError && <p className="text-xs text-red-500 dark:text-red-400">{categoryError}</p>}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t("tags")}</legend>
          <div className="flex flex-wrap gap-2 mt-1">
            {localTagDefs.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleTag(cat.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  selectedTags.includes(cat.id)
                    ? "text-white"
                    : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700"
                }`}
                style={
                  selectedTags.includes(cat.id)
                    ? { backgroundColor: cat.color }
                    : undefined
                }
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewTagColor(c)}
                className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                  newTagColor === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-800" : "hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <span
              className="w-8 h-8 rounded-lg shrink-0 self-center"
              style={{ backgroundColor: newTagColor }}
            />
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => { setNewTagInput(e.target.value); setTagError(""); }}
              onKeyDown={handleTagKeyDown}
              placeholder={t("new_tag_name")}
              className={`flex-1 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 border text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${tagError ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-gray-600"}`}
            />
            <button
              type="button"
              onClick={() => handleAddTag()}
              disabled={!newTagInput.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
            >
              + {t("add")}
            </button>
          </div>
          {tagError && <p className="text-xs text-red-500 dark:text-red-400">{tagError}</p>}
        </fieldset>

        <div className="flex items-center gap-2 mt-2">
          {item && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              {t("delete")}
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors cursor-pointer"
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
