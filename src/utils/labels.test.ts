import { describe, it, expect } from "vitest";
import { slugify, uniqueId, compareLabels, sortByLabel } from "./labels";

describe("slugify", () => {
  it("lowercases and replaces whitespace runs with '-'", () => {
    expect(slugify("My  Cool App")).toBe("my-cool-app");
    expect(slugify("Work")).toBe("work");
  });
});

describe("uniqueId (while-suffix)", () => {
  it("returns base when free", () => {
    expect(uniqueId("work", new Set(["other"]))).toBe("work");
  });

  it("appends -2, -3, ... on collision", () => {
    expect(uniqueId("work", new Set(["work"]))).toBe("work-2");
    expect(uniqueId("work", new Set(["work", "work-2"]))).toBe("work-3");
  });

  it("suffixes ids that already end in a number (no regex-increment)", () => {
    expect(uniqueId("app-7", new Set(["app-7"]))).toBe("app-7-2");
  });
});

describe("compareLabels / sortByLabel", () => {
  it("sorts case-insensitively, asc and desc", () => {
    expect(compareLabels("alpha", "Beta")).toBeLessThan(0);
    const arr = [{ l: "beta" }, { l: "Alpha" }, { l: "gamma" }];
    expect(sortByLabel(arr, (x) => x.l).map((x) => x.l)).toEqual(["Alpha", "beta", "gamma"]);
    expect(sortByLabel(arr, (x) => x.l, "desc").map((x) => x.l)).toEqual(["gamma", "beta", "Alpha"]);
  });
});
