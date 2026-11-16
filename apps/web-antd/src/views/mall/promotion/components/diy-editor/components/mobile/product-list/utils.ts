import type { ProductListProperty } from './config';

import {
  buildProductGroupQuery,
  normalizeGroupIds,
} from '../product-group/utils';

export function buildProductListGroupQuery(
  property: Partial<ProductListProperty>,
) {
  return buildProductGroupQuery(
    {
      groupIds: normalizeGroupIds(property.groupIds),
      pageSize: property.pageSize ?? 10,
      sortType: property.sortType ?? 'default',
    },
    'all',
  );
}

export function getProductListValidationError(
  property: Partial<ProductListProperty>,
) {
  if (property.sourceType === 'group') {
    return normalizeGroupIds(property.groupIds).length > 0
      ? undefined
      : '商品栏至少需要选择一个分组';
  }
  return property.spuIds?.length ? undefined : '商品栏至少需要选择一个商品';
}

/** 详情接口返回顺序不保证与传入 ID 相同。 */
export function orderManualProducts<T extends { id?: number }>(
  ids: number[],
  products: T[],
) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  return ids
    .map((id) => productMap.get(id))
    .filter((product): product is T => Boolean(product));
}
