import type {
  ProductGroupMenuProperty,
  ProductGroupProperty,
  ProductGroupSortType,
} from './config';

import { PRODUCT_GROUP_MENU_DEFAULTS } from './config';

export const PRODUCT_GROUP_LIMIT = 15;
export const PRODUCT_GROUP_PAGE_SIZE_MAX = 50;
export const PRODUCT_GROUP_PAGE_SIZE_MIN = 1;

interface ProductGroupQuerySource {
  groupIds: number[];
  pageSize: number;
  sortType: ProductGroupSortType;
}

interface ProductGroupLike {
  id?: number;
}

type LegacyProductGroupProperty = Omit<ProductGroupProperty, 'menu'> & {
  menu?: Partial<ProductGroupMenuProperty>;
};

export function normalizeProductGroupProperty(
  property: LegacyProductGroupProperty,
): ProductGroupProperty {
  return {
    ...property,
    menu: {
      ...PRODUCT_GROUP_MENU_DEFAULTS,
      ...property.menu,
    },
  };
}

export function normalizeGroupIds(groupIds: number[]) {
  return [
    ...new Set(groupIds.filter((id) => Number.isInteger(id) && id > 0)),
  ].slice(0, PRODUCT_GROUP_LIMIT);
}

export function clampProductGroupPageSize(pageSize: number) {
  if (!Number.isFinite(pageSize)) return 10;
  return Math.min(
    PRODUCT_GROUP_PAGE_SIZE_MAX,
    Math.max(PRODUCT_GROUP_PAGE_SIZE_MIN, Math.trunc(pageSize)),
  );
}

export function orderSelectedGroups<T extends ProductGroupLike>(
  groupIds: number[],
  groups: T[],
) {
  const groupMap = new Map(
    groups
      .filter((group) => typeof group.id === 'number')
      .map((group) => [group.id as number, group]),
  );
  return normalizeGroupIds(groupIds)
    .map((id) => groupMap.get(id))
    .filter((group): group is T => Boolean(group));
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
      ? { groupIds: normalizeGroupIds(source.groupIds) }
      : { groupIds: [tab] }),
    pageNo: 1,
    pageSize: clampProductGroupPageSize(source.pageSize),
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
  groupIds?: number[];
}) {
  return normalizeGroupIds(property.groupIds || []).length === 0
    ? '商品分组至少需要选择一个分组'
    : undefined;
}
