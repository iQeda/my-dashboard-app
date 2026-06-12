import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useConfig } from "./useConfig";
import type { AppConfig } from "../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const baseConfig: AppConfig = {
  items: [
    {
      id: "alpha",
      name: "Alpha",
      type: "app",
      target: "Alpha",
      tags: ["old-tag"],
      category: "old-cat",
      icon: "😀",
    },
    { id: "beta", name: "Beta", type: "url", target: "https://b", tags: [] },
    { id: "dup", name: "Dup 1", type: "app", target: "D1", tags: [] },
    { id: "dup", name: "Dup 2", type: "app", target: "D2", tags: [] },
  ],
  tagDefs: [
    { id: "old-tag", label: "Old Tag", color: "blue", pinned: true },
    { id: "other-tag", label: "Other", color: "red" },
  ],
  categoryList: [
    { id: "old-cat", label: "Old Cat", pinned: true },
    { id: "other-cat", label: "Other Cat" },
  ],
  pinnedOrder: ["old-tag", "old-cat"],
  emojiHistory: ["😀", "🎉"],
};

let savedConfigs: AppConfig[];

async function setup(config: AppConfig = baseConfig) {
  savedConfigs = [];
  vi.mocked(invoke).mockImplementation(async (cmd, args) => {
    if (cmd === "load_config") return structuredClone(config);
    if (cmd === "save_config") {
      savedConfigs.push((args as { config: AppConfig }).config);
      return null;
    }
    return null;
  });
  const rendered = renderHook(() => useConfig());
  await waitFor(() => expect(rendered.result.current.config).not.toBeNull());
  return rendered;
}

function lastSaved(): AppConfig {
  expect(savedConfigs.length).toBeGreaterThan(0);
  return savedConfigs[savedConfigs.length - 1];
}

beforeEach(() => {
  vi.mocked(invoke).mockReset();
});

describe("useConfig mutators (characterization)", () => {
  it("loads config via load_config on mount", async () => {
    const { result } = await setup();
    expect(vi.mocked(invoke)).toHaveBeenCalledWith("load_config");
    expect(result.current.config?.items).toHaveLength(4);
  });

  it("updateTagDef rename regenerates the id from the label and syncs items + pinnedOrder", async () => {
    const { result } = await setup();
    await act(() => result.current.updateTagDef("old-tag", { label: "New Tag Name" }));
    const saved = lastSaved();
    const def = saved.tagDefs.find((t) => t.label === "New Tag Name");
    expect(def?.id).toBe("new-tag-name");
    expect(saved.items.find((i) => i.id === "alpha")?.tags).toEqual(["new-tag-name"]);
    expect(saved.pinnedOrder).toEqual(["new-tag-name", "old-cat"]);
  });

  it("updateTagDef pin appends to pinnedOrder; unpin removes", async () => {
    const { result } = await setup();
    await act(() => result.current.updateTagDef("other-tag", { pinned: true }));
    expect(lastSaved().pinnedOrder).toEqual(["old-tag", "old-cat", "other-tag"]);
    await act(() => result.current.updateTagDef("old-tag", { pinned: false }));
    expect(lastSaved().pinnedOrder).toEqual(["old-cat", "other-tag"]);
  });

  it("updateCategoryDef rename regenerates the id and syncs item.category + pinnedOrder", async () => {
    const { result } = await setup();
    await act(() => result.current.updateCategoryDef("old-cat", { label: "Fresh Cat" }));
    const saved = lastSaved();
    const def = saved.categoryList?.find((c) => c.label === "Fresh Cat");
    expect(def?.id).toBe("fresh-cat");
    expect(saved.items.find((i) => i.id === "alpha")?.category).toBe("fresh-cat");
    expect(saved.pinnedOrder).toEqual(["old-tag", "fresh-cat"]);
  });

  it("addItem prepends the icon to emojiHistory with dedupe", async () => {
    const { result } = await setup();
    await act(() =>
      result.current.addItem({
        id: "new",
        name: "New",
        type: "app",
        target: "New",
        tags: [],
        icon: "🎉",
      }),
    );
    // "🎉" already in history -> moved to front, no duplicate
    expect(lastSaved().emojiHistory).toEqual(["🎉", "😀"]);
  });

  it("emojiHistory is capped at 20 entries", async () => {
    const longHistory = Array.from({ length: 20 }, (_, i) => `e${i}`);
    const { result } = await setup({ ...baseConfig, emojiHistory: longHistory });
    await act(() =>
      result.current.updateItem({
        id: "alpha",
        name: "Alpha",
        type: "app",
        target: "Alpha",
        tags: [],
        icon: "🆕",
      }),
    );
    const history = lastSaved().emojiHistory!;
    expect(history).toHaveLength(20);
    expect(history[0]).toBe("🆕");
    expect(history).not.toContain("e19");
  });

  it("addItem without icon leaves emojiHistory unchanged", async () => {
    const { result } = await setup();
    await act(() =>
      result.current.addItem({ id: "n2", name: "N2", type: "url", target: "https://n", tags: [] }),
    );
    expect(lastSaved().emojiHistory).toEqual(["😀", "🎉"]);
  });

  it("deleteItem removes only the first item when ids are duplicated", async () => {
    const { result } = await setup();
    await act(() => result.current.deleteItem("dup"));
    const saved = lastSaved();
    const dups = saved.items.filter((i) => i.id === "dup");
    expect(dups).toHaveLength(1);
    expect(dups[0].name).toBe("Dup 2");
  });

  it("toggleFavorite flips the flag on the matching item", async () => {
    const { result } = await setup();
    await act(() => result.current.toggleFavorite("beta"));
    expect(lastSaved().items.find((i) => i.id === "beta")?.favorite).toBe(true);
  });

  it("duplicateItem appends a '(Copy)' item without favorite", async () => {
    const { result } = await setup();
    await act(() => result.current.duplicateItem("alpha"));
    const saved = lastSaved();
    const copy = saved.items[saved.items.length - 1];
    expect(copy.name).toBe("Alpha (Copy)");
    expect(copy.id).not.toBe("alpha");
    expect(copy.favorite).toBeUndefined();
  });

  it("deleteTagDef removes the def and strips the tag from items", async () => {
    const { result } = await setup();
    await act(() => result.current.deleteTagDef("old-tag"));
    const saved = lastSaved();
    expect(saved.tagDefs.map((t) => t.id)).toEqual(["other-tag"]);
    expect(saved.items.find((i) => i.id === "alpha")?.tags).toEqual([]);
  });

  it("deleteCategoryDef removes the def and unsets item.category", async () => {
    const { result } = await setup();
    await act(() => result.current.deleteCategoryDef("old-cat"));
    const saved = lastSaved();
    expect(saved.categoryList?.map((c) => c.id)).toEqual(["other-cat"]);
    expect(saved.items.find((i) => i.id === "alpha")?.category).toBeUndefined();
  });
});
