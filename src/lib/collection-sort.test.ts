import { describe, expect, it } from "vitest";
import {
  buildCollectionHref,
  defaultInventorySortDir,
  inventorySortKey,
  isDefaultInventorySort,
  nextCollectionSort,
  parseInventorySortParam,
} from "./collection-sort";

describe("parseInventorySortParam", () => {
  it("defaults to newest added", () => {
    expect(parseInventorySortParam()).toEqual({ sort: "added", dir: "desc" });
    expect(parseInventorySortParam("", "")).toEqual({ sort: "added", dir: "desc" });
    expect(parseInventorySortParam("nope")).toEqual({ sort: "added", dir: "desc" });
  });

  it("reads a combined sort key", () => {
    expect(parseInventorySortParam("name:desc")).toEqual({ sort: "name", dir: "desc" });
    expect(parseInventorySortParam("set:asc")).toEqual({ sort: "set", dir: "asc" });
    expect(parseInventorySortParam("value:asc")).toEqual({ sort: "value", dir: "asc" });
  });

  it("reads separate sort and dir params", () => {
    expect(parseInventorySortParam("value", "asc")).toEqual({ sort: "value", dir: "asc" });
    expect(parseInventorySortParam("name", "desc")).toEqual({ sort: "name", dir: "desc" });
  });

  it("fills in the usual direction when only the sort is set", () => {
    expect(parseInventorySortParam("name")).toEqual({ sort: "name", dir: "asc" });
    expect(parseInventorySortParam("set")).toEqual({ sort: "set", dir: "asc" });
    expect(parseInventorySortParam("value")).toEqual({ sort: "value", dir: "desc" });
    expect(parseInventorySortParam("added")).toEqual({ sort: "added", dir: "desc" });
  });
});

describe("inventory sort helpers", () => {
  it("uses A–Z for name and set, high-to-low for value and date", () => {
    expect(defaultInventorySortDir("name")).toBe("asc");
    expect(defaultInventorySortDir("set")).toBe("asc");
    expect(defaultInventorySortDir("value")).toBe("desc");
    expect(defaultInventorySortDir("added")).toBe("desc");
  });

  it("treats newest-first as the default URL state", () => {
    expect(isDefaultInventorySort("added", "desc")).toBe(true);
    expect(isDefaultInventorySort("added", "asc")).toBe(false);
    expect(isDefaultInventorySort("name", "asc")).toBe(false);
    expect(inventorySortKey("set", "desc")).toBe("set:desc");
  });

  it("toggles the active sort and uses the usual first direction otherwise", () => {
    expect(nextCollectionSort({ sort: "name", dir: "asc" }, "name")).toEqual({
      sort: "name",
      dir: "desc",
    });
    expect(nextCollectionSort({ sort: "name", dir: "asc" }, "value")).toEqual({
      sort: "value",
      dir: "desc",
    });
    expect(nextCollectionSort({ sort: "value", dir: "desc" }, "value")).toEqual({
      sort: "value",
      dir: "asc",
    });
  });

  it("omits default newest-first sort from collection URLs", () => {
    expect(buildCollectionHref({ sort: "added", dir: "desc" })).toBe("/collection");
    expect(buildCollectionHref({ sort: "name", dir: "asc", page: 2 })).toBe(
      "/collection?sort=name%3Aasc&page=2",
    );
  });
});
