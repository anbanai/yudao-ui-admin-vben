import { describe, expect, it } from 'vitest';

import { component } from './config';
import {
  buildProductGroupQuery,
  clampProductGroupPageSize,
  createPreviewProductLoader,
  createRequestGuard,
  getProductGroupValidationError,
  normalizeGroupIds,
  orderSelectedGroups,
} from './utils';

describe('product group configuration', () => {
  it('provides conservative defaults', () => {
    expect(component.property).toMatchObject({
      groupIds: [],
      layoutType: 'threeCol',
      menu: {
        activeBackgroundColor: '#e6f4ff',
        activeColor: '#0958d9',
        backgroundColor: '#ffffff',
        color: '#595959',
        layout: 'horizontal',
      },
      pageSize: 10,
      showAll: false,
      sortType: 'default',
      sticky: false,
    });
  });

  it('deduplicates groups and limits selection to 15 items', () => {
    expect(
      normalizeGroupIds([
        1,
        2,
        1,
        ...Array.from({ length: 20 }, (_, i) => i + 3),
      ]),
    ).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  });

  it('restores groups to the configured order and drops unavailable values', () => {
    const groups = [
      { id: 1, name: '黄茶' },
      { id: 2, name: '绿茶' },
    ];
    expect(orderSelectedGroups([2, 99, 1], groups)).toEqual([
      { id: 2, name: '绿茶' },
      { id: 1, name: '黄茶' },
    ]);
  });

  it.each([
    ['default', {}],
    ['latest', { sortAsc: false, sortField: 'createTime' }],
    ['sales', { sortAsc: false, sortField: 'salesCount' }],
    ['priceAsc', { sortAsc: true, sortField: 'price' }],
    ['priceDesc', { sortAsc: false, sortField: 'price' }],
  ] as const)(
    'maps %s sorting to product page parameters',
    (sortType, sorting) => {
      expect(
        buildProductGroupQuery(
          {
            groupIds: [3, 5],
            pageSize: 10,
            sortType,
          },
          3,
        ),
      ).toEqual({
        groupIds: [3],
        pageNo: 1,
        pageSize: 10,
        ...sorting,
      });
    },
  );

  it('builds the all-groups query and clamps the page size', () => {
    expect(clampProductGroupPageSize(100)).toBe(50);
    expect(
      buildProductGroupQuery(
        { groupIds: [3, 5], pageSize: 100, sortType: 'default' },
        'all',
      ),
    ).toEqual({
      groupIds: [3, 5],
      pageNo: 1,
      pageSize: 50,
    });
  });

  it('accepts only the most recent preview request', () => {
    const guard = createRequestGuard();
    const first = guard.next();
    const second = guard.next();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it('discards an in-flight tab result after switching to a cached tab', async () => {
    let resolveSecond!: (value: string[]) => void;
    const loader = createPreviewProductLoader(async (query: string) => {
      if (query === 'first') return ['first-product'];
      return new Promise<string[]>((resolve) => {
        resolveSecond = resolve;
      });
    });

    expect(await loader.load('first', 'first')).toEqual({
      accepted: true,
      list: ['first-product'],
    });
    const secondRequest = loader.load('second', 'second');
    expect(await loader.load('first', 'first')).toEqual({
      accepted: true,
      list: ['first-product'],
    });
    resolveSecond(['second-product']);

    expect(await secondRequest).toEqual({ accepted: false, list: [] });
  });

  it('requires at least one product group before saving', () => {
    expect(getProductGroupValidationError({ groupIds: [] })).toBe(
      '商品分组至少需要选择一个分组',
    );
    expect(getProductGroupValidationError({ groupIds: [1] })).toBeUndefined();
  });
});
