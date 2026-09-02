import type {
  ProductCategoryProperty,
  ProductCategorySortType,
} from './config';

import { component as PRODUCT_CATEGORY_COMPONENT } from './config';

export const PRODUCT_CATEGORY_LIMIT = 15;
export const PRODUCT_CATEGORY_PAGE_SIZE_MAX = 50;
export const PRODUCT_CATEGORY_PAGE_SIZE_MIN = 1;

interface ProductCategoryQuerySource {
  categoryIds: number[];
  pageSize: number;
  sortType: ProductCategorySortType;
}

interface ProductCategoryLike {
  id?: number;
  name?: string;
}

export type ProductCategoryPreviewState =
  | 'emptyCategory'
  | 'emptyProduct'
  | 'failed'
  | 'loading'
  | 'ready';

export type LegacyProductCategoryProperty = Partial<ProductCategoryProperty>;

export function normalizeProductCategoryProperty(
  property: LegacyProductCategoryProperty = {},
): ProductCategoryProperty {
  const defaults = PRODUCT_CATEGORY_COMPONENT.property;
  return {
    ...defaults,
    ...property,
    badge: { ...defaults.badge, ...property.badge },
    fields: {
      name: { ...defaults.fields.name, ...property.fields?.name },
      price: { ...defaults.fields.price, ...property.fields?.price },
    },
    categoryIds: normalizeCategoryIds(property.categoryIds),
    style: { ...defaults.style, ...property.style },
  };
}

export function normalizeCategoryIds(categoryIds: unknown) {
  if (!Array.isArray(categoryIds)) return [];
  return [
    ...new Set(
      categoryIds
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ].slice(0, PRODUCT_CATEGORY_LIMIT);
}

export function normalizeTreeSelectCategoryIds(values: unknown[]) {
  return normalizeCategoryIds(
    values.map((item) => {
      if (typeof item === 'object' && item !== null && 'value' in item) {
        return Number((item as { value: unknown }).value);
      }
      return Number(item);
    }),
  );
}

export function buildTreeSelectCategoryValues<T extends ProductCategoryLike>(
  categoryIds: unknown,
  categories: T[],
) {
  const categoryMap = new Map(
    categories
      .filter((category) => typeof category.id === 'number')
      .map((category) => [category.id as number, category]),
  );
  return normalizeCategoryIds(categoryIds).map((value) => ({
    label: categoryMap.get(value)?.name || `分类 ${value}`,
    value,
  }));
}

export function clampProductCategoryPageSize(pageSize: number) {
  if (!Number.isFinite(pageSize)) return 10;
  return Math.min(
    PRODUCT_CATEGORY_PAGE_SIZE_MAX,
    Math.max(PRODUCT_CATEGORY_PAGE_SIZE_MIN, Math.trunc(pageSize)),
  );
}

export function orderSelectedCategories<T extends ProductCategoryLike>(
  categoryIds: unknown,
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

function getSortParams(sortType: ProductCategorySortType) {
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

export function buildProductCategoryQuery(
  source: ProductCategoryQuerySource,
  tab: 'all' | number,
) {
  return {
    ...(tab === 'all'
      ? { categoryIds: normalizeCategoryIds(source.categoryIds) }
      : { categoryId: tab }),
    pageNo: 1,
    pageSize: clampProductCategoryPageSize(source.pageSize),
    tabType: 0,
    ...getSortParams(source.sortType),
  };
}

export function getProductCategoryValidationError(property: {
  categoryIds?: number[];
}) {
  return normalizeCategoryIds(property.categoryIds || []).length === 0
    ? '商品分类至少需要选择一个分类'
    : undefined;
}

export function getProductCategoryPreviewState(state: {
  categoryCount: number;
  failed: boolean;
  hasLoaded: boolean;
  loading: boolean;
  productCount: number;
}): ProductCategoryPreviewState {
  if (state.loading || !state.hasLoaded) return 'loading';
  if (state.failed) return 'failed';
  if (state.categoryCount === 0) return 'emptyCategory';
  if (state.productCount === 0) return 'emptyProduct';
  return 'ready';
}

export function createProductCategoryPreviewLoader<T, Q>(
  requestPage: (query: Q) => Promise<T[]>,
) {
  type LoadResult = { failed: boolean; list: T[] };
  const cache = new Map<string, Promise<LoadResult>>();
  let currentRequest = 0;
  return {
    async load(key: string, query: Q) {
      const request = ++currentRequest;
      let pending = cache.get(key);
      if (!pending) {
        pending = requestPage(query)
          .then((result) => ({
            failed: false,
            list: Array.isArray(result) ? result : [],
          }))
          .catch(() => ({ failed: true, list: [] as T[] }));
        cache.set(key, pending);
        void pending.then((result) => {
          if (result.failed && cache.get(key) === pending) cache.delete(key);
        });
      }
      const result = await pending;
      if (request !== currentRequest) {
        return { accepted: false, failed: false, list: [] as T[] };
      }
      return { accepted: true, ...result };
    },
    reset() {
      currentRequest += 1;
      cache.clear();
    },
  };
}
