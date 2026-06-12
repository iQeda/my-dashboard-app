import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ItemFormModal } from "./ItemFormModal";
import { I18nProvider } from "../i18n";
import type { DashboardItem, TagDef, Category } from "../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => []),
}));

interface RenderOpts {
  readonly item?: DashboardItem | null;
  readonly tagDefs?: readonly TagDef[];
  readonly categoryList?: readonly Category[];
  readonly existingItemIds?: ReadonlySet<string>;
}

function renderModal(opts: RenderOpts = {}) {
  const onSave = vi.fn();
  render(
    <I18nProvider locale="en">
      <ItemFormModal
        item={opts.item ?? null}
        tagDefs={opts.tagDefs ?? []}
        categoryList={opts.categoryList ?? []}
        emojiHistory={[]}
        defaultTags={[]}
        existingItemIds={opts.existingItemIds}
        onSave={onSave}
        onClose={() => {}}
      />
    </I18nProvider>,
  );
  return { onSave };
}

function fillUrlItem(name: string, url = "https://example.com/x") {
  fireEvent.click(screen.getByRole("button", { name: "URL" }));
  fireEvent.change(screen.getByPlaceholderText("e.g. https://example.com"), {
    target: { value: url },
  });
  fireEvent.change(screen.getByPlaceholderText("e.g. GitHub Reviews"), {
    target: { value: name },
  });
}

function save() {
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

beforeEach(() => {
  document.body.innerHTML = "";
});

// slugify / uniqueId の3実装の現挙動を固定する（Phase 3 統合の事前条件）
describe("ItemFormModal id generation (characterization)", () => {
  it("new item id = name.toLowerCase() with whitespace runs replaced by '-'", () => {
    const { onSave } = renderModal();
    fillUrlItem("My  Cool App");
    save();
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0][0].id).toBe("my-cool-app");
  });

  it("item id collision uses regex-increment: my-app -> my-app-2 -> my-app-3", () => {
    const { onSave } = renderModal({ existingItemIds: new Set(["my-app", "my-app-2"]) });
    fillUrlItem("My App");
    save();
    expect(onSave.mock.calls[0][0].id).toBe("my-app-3");
  });

  it("item id ending in a number is incremented, not suffixed (regex-increment quirk)", () => {
    // "app 7" -> slug "app-7" collides -> regex bumps the trailing number to "app-8"
    const { onSave } = renderModal({ existingItemIds: new Set(["app-7"]) });
    fillUrlItem("App 7");
    save();
    expect(onSave.mock.calls[0][0].id).toBe("app-8");
  });

  it("editing an existing item keeps its id", () => {
    const item: DashboardItem = {
      id: "keep-id",
      name: "Keep",
      type: "url",
      target: "https://keep.example",
      tags: [],
    };
    const { onSave } = renderModal({ item, existingItemIds: new Set(["keep-id"]) });
    save();
    expect(onSave.mock.calls[0][0].id).toBe("keep-id");
  });

  it("new category id collision uses while-suffix: work -> work-2 -> work-3", () => {
    const { onSave } = renderModal({
      categoryList: [
        { id: "work", label: "Work Other" },
        { id: "work-2", label: "Work Two" },
      ],
    });
    // category "Add" button comes before the workspace "Add" button in the DOM
    fireEvent.change(screen.getByPlaceholderText("New category"), {
      target: { value: "Work" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "+ Add" })[0]);
    fillUrlItem("Anything");
    save();
    const newCategoryList: readonly Category[] = onSave.mock.calls[0][2];
    expect(newCategoryList.map((c) => c.id)).toEqual(["work", "work-2", "work-3"]);
    expect(onSave.mock.calls[0][0].category).toBe("work-3");
  });

  it("duplicate category label (case-insensitive) is rejected", () => {
    const { onSave } = renderModal({ categoryList: [{ id: "work", label: "Work" }] });
    fireEvent.change(screen.getByPlaceholderText("New category"), {
      target: { value: "work" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "+ Add" })[0]);
    fillUrlItem("Anything");
    save();
    const newCategoryList: readonly Category[] = onSave.mock.calls[0][2];
    expect(newCategoryList.map((c) => c.id)).toEqual(["work"]);
  });

  it("new workspace (tag) id collision uses while-suffix: fun -> fun-2 -> fun-3", () => {
    const { onSave } = renderModal({
      tagDefs: [
        { id: "fun", label: "Fun Other", color: "blue" },
        { id: "fun-2", label: "Fun Two", color: "red" },
      ],
    });
    fireEvent.change(screen.getByPlaceholderText("New workspace name"), {
      target: { value: "Fun" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "+ Add" })[1]);
    fillUrlItem("Anything");
    save();
    const newTagDefs: readonly TagDef[] = onSave.mock.calls[0][1];
    expect(newTagDefs.map((t) => t.id)).toEqual(["fun", "fun-2", "fun-3"]);
    expect(onSave.mock.calls[0][0].tags).toEqual(["fun-3"]);
  });
});
