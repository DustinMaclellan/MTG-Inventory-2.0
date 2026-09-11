export const INVENTORY_SORTS = ["name", "set", "value", "added"] as const;
export type InventorySort = (typeof INVENTORY_SORTS)[number];

export const INVENTORY_SORT_DIRS = ["asc", "desc"] as const;
export type InventorySortDir = (typeof INVENTORY_SORT_DIRS)[number];

export function isInventorySort(value: unknown): value is InventorySort {
  return INVENTORY_SORTS.includes(value as InventorySort);
}

export function defaultInventorySortDir(sort: InventorySort): InventorySortDir {
  return sort === "name" || sort === "set" ? "asc" : "desc";
}

export function parseInventorySort(value: unknown): InventorySort {
  return isInventorySort(value) ? value : "added";
}

export function parseInventorySortDir(
  value: unknown,
  sort: InventorySort = "added",
): InventorySortDir {
  if (value === "asc" || value === "desc") return value;
  return defaultInventorySortDir(sort);
}

/** Accepts `name`, `name:asc`, or separate sort + dir query params. */
export function parseInventorySortParam(
  sortValue?: string | null,
  dirValue?: string | null,
): { sort: InventorySort; dir: InventorySortDir } {
  const raw = sortValue?.trim() ?? "";
  const [sortPart, dirFromSort] = raw.split(":");
  const sort = parseInventorySort(sortPart);
  const dir = parseInventorySortDir(dirFromSort ?? dirValue, sort);
  return { sort, dir };
}

export function inventorySortKey(sort: InventorySort, dir: InventorySortDir) {
  return `${sort}:${dir}`;
}

export function isDefaultInventorySort(sort: InventorySort, dir: InventorySortDir) {
  return sort === "added" && dir === "desc";
}

export type CollectionHrefParams = {
  page?: number;
  q?: string;
  storage?: string;
  condition?: string;
  finish?: string;
  lot?: string;
  sort?: InventorySort;
  dir?: InventorySortDir;
};

export function nextCollectionSort(
  current: Pick<CollectionHrefParams, "sort" | "dir">,
  col: InventorySort,
): { sort: InventorySort; dir: InventorySortDir } {
  const currentSort = current.sort ?? "added";
  const currentDir = current.dir ?? defaultInventorySortDir(currentSort);
  return {
    sort: col,
    dir: currentSort === col
      ? currentDir === "asc" ? "desc" : "asc"
      : defaultInventorySortDir(col),
  };
}

export function buildCollectionHref(params: CollectionHrefParams) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.storage) search.set("storage", params.storage);
  if (params.condition) search.set("condition", params.condition);
  if (params.finish) search.set("finish", params.finish);
  if (params.sort && params.dir && !isDefaultInventorySort(params.sort, params.dir)) {
    search.set("sort", inventorySortKey(params.sort, params.dir));
  }
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.lot) search.set("lot", params.lot);
  const query = search.toString();
  return query ? `/collection?${query}` : "/collection";
}
