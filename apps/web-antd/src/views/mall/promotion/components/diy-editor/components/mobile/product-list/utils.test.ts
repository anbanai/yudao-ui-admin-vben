import { describe, expect, it } from 'vitest';

import {
  getGroupDisplayName,
  getUnavailableGroupIds,
  isStorefrontGroup,
} from '../product-group/availability';
import {
  buildProductListGroupQuery,
  getProductListValidationError,
  orderManualProducts,
} from './utils';

describe('product list sources', () => {
  it('treats historical configurations as manual and only validates the active source', () => {
    expect(getProductListValidationError({ spuIds: [5] })).toBeUndefined();
    expect(getProductListValidationError({ groupIds: [1], spuIds: [] })).toBe(
      '商品栏至少需要选择一个商品',
    );
    expect(
      getProductListValidationError({
        sourceType: 'group',
        groupIds: [],
        spuIds: [5],
      }),
    ).toBe('商品栏至少需要选择一个分组');
    expect(
      getProductListValidationError({
        sourceType: 'group',
        groupIds: [1],
        spuIds: [],
      }),
    ).toBeUndefined();
  });

  it('uses conservative dynamic defaults and never fabricates group ids', () => {
    expect(buildProductListGroupQuery({})).toEqual({
      groupIds: [],
      pageNo: 1,
      pageSize: 10,
    });
    expect(
      buildProductListGroupQuery({
        groupIds: [3, 3, 5],
        pageSize: 80,
        sortType: 'priceDesc',
      }),
    ).toEqual({
      groupIds: [3, 5],
      pageNo: 1,
      pageSize: 50,
      sortAsc: false,
      sortField: 'price',
    });
  });

  it('keeps the manual selection order when detail responses arrive unordered', () => {
    expect(orderManualProducts([2, 1, 99], [{ id: 1 }, { id: 2 }])).toEqual([
      { id: 2 },
      { id: 1 },
    ]);
  });

  it('keeps unavailable ids distinguishable and treats old groups as public', () => {
    const groups = [
      { id: 1, name: '旧分组', status: 0 },
      { id: 2, name: '已停用', status: 1, storefrontVisible: true },
      { id: 3, name: '内部活动', status: 0, storefrontVisible: false },
    ];
    expect(
      groups
        .filter((group) => isStorefrontGroup(group))
        .map((group) => group.id),
    ).toEqual([1]);
    expect(getUnavailableGroupIds([1, 2, 3, 99], groups)).toEqual([2, 3, 99]);
    expect(getGroupDisplayName(3, groups)).toBe('内部活动（仅内部使用）');
    expect(getGroupDisplayName(2, groups)).toBe('已停用（已禁用）');
    expect(getGroupDisplayName(99, groups)).toBe('分组 99（已删除或不可访问）');
  });
});
