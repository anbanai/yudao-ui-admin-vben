import type { ProductGroupSortType } from './config';

export const PRODUCT_GROUP_CATEGORY_LIMIT = 15;
export const PRODUCT_GROUP_PAGE_SIZE_MAX = 50;
export const PRODUCT_GROUP_PAGE_SIZE_MIN = 1;

interface ProductGroupQuerySource {
  categoryIds: number[];
  pageSize: number;
  sortType: ProductGroupSortType;
}

interface ProductCategoryLike {
  id?: number;
}

export function normalizeCategoryIds(categoryIds: number[]) {
  return [
    ...new Set(categoryIds.filter((id) => Number.isInteger(id) && id > 0)),
  ].slice(0, PRODUCT_GROUP_CATEGORY_LIMIT);
}

export function normalizeTreeSelectCategoryIds(values: unknown[]) {
  return normalizeCategoryIds(
    values.map((item) => {
      if (typeof item === 'object' && item !== null && 'value' in item) {
        return Number(item.value);
      }
      return Number(item);
    }),
  );
}

export function clampProductGroupPageSize(pageSize: number) {
  if (!Number.isFinite(pageSize)) return 10;
  return Math.min(
    PRODUCT_GROUP_PAGE_SIZE_MAX,
    Math.max(PRODUCT_GROUP_PAGE_SIZE_MIN, Math.trunc(pageSize)),
  );
}

export function orderSelectedCategories<T extends ProductCategoryLike>(
  categoryIds: number[],
  categories: T[],
) {
  const categoryMap = new Map(
    categories
      .filter((category) => typeof category.id === 'number')
      .map((category) => [category.id as number, category]),
  );
  return normalizeCategoryIds(categoryIds)
    .map((id) => categoryMap.get(id))
    .filter((category): category is T => Boolean(category));
}

function getSortParams(sortType: ProductGroupSortType) {
  switch (sortType) {
    case 'latest': {
      return { sortAsc: false, sortField: 'createTime' };
    }
    case 'priceAsc': {
      return { sortAsc: true, sortField: 'price' };
    }
    case 'priceDesc': {
      return { sortAsc: false, sortField: 'price' };
    }
    case 'sales': {
      return { sortAsc: false, sortField: 'salesCount' };
    }
    default: {
      return {};
    }
  }
}

export function buildProductGroupQuery(
  source: ProductGroupQuerySource,
  tab: 'all' | number,
) {
  return {
    ...(tab === 'all'
      ? { categoryIds: normalizeCategoryIds(source.categoryIds) }
      : { categoryId: tab }),
    pageNo: 1,
    pageSize: clampProductGroupPageSize(source.pageSize),
    tabType: 0,
    ...getSortParams(source.sortType),
  };
}

export function createRequestGuard() {
  let currentRequest = 0;
  return {
    isCurrent(request: number) {
      return request === currentRequest;
    },
    next() {
      currentRequest += 1;
      return currentRequest;
    },
  };
}

export function createPreviewProductLoader<T, Q>(
  requestPage: (query: Q) => Promise<T[]>,
) {
  const cache = new Map<string, T[]>();
  let currentRequest = 0;
  return {
    async load(key: string, query: Q) {
      const request = ++currentRequest;
      if (cache.has(key)) {
        return { accepted: true, list: cache.get(key)! };
      }
      try {
        const list = await requestPage(query);
        if (request !== currentRequest) {
          return { accepted: false, list: [] as T[] };
        }
        const normalizedList = Array.isArray(list) ? list : [];
        cache.set(key, normalizedList);
        return { accepted: true, list: normalizedList };
      } catch {
        if (request !== currentRequest) {
          return { accepted: false, list: [] as T[] };
        }
        cache.set(key, []);
        return { accepted: true, list: [] as T[] };
      }
    },
    reset() {
      currentRequest += 1;
      cache.clear();
    },
  };
}

export function getProductGroupValidationError(property: {
  categoryIds?: number[];
}) {
  return normalizeCategoryIds(property.categoryIds || []).length === 0
    ? '商品分组至少需要选择一个商品分类'
    : undefined;
}
