import { describe, expect, it } from 'vitest';

import { component } from './config';
import {
  buildProductGroupQuery,
  clampProductGroupPageSize,
  createPreviewProductLoader,
  createRequestGuard,
  getProductGroupValidationError,
  normalizeCategoryIds,
  normalizeTreeSelectCategoryIds,
  orderSelectedCategories,
} from './utils';

describe('product group configuration', () => {
  it('provides conservative defaults', () => {
    expect(component.property).toMatchObject({
      categoryIds: [],
      layoutType: 'threeCol',
      pageSize: 10,
      showAll: false,
      sortType: 'default',
      sticky: false,
    });
  });

  it('deduplicates categories and limits selection to 15 items', () => {
    expect(
      normalizeCategoryIds([
        1,
        2,
        1,
        ...Array.from({ length: 20 }, (_, i) => i + 3),
      ]),
    ).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  });

  it('normalizes strict tree-select label values to category ids', () => {
    expect(
      normalizeTreeSelectCategoryIds([
        { label: '黄茶', value: 2 },
        1,
        { label: '重复黄茶', value: 2 },
      ]),
    ).toEqual([2, 1]);
  });

  it('restores categories to the configured order and drops unavailable values', () => {
    const categories = [
      { id: 1, name: '黄茶' },
      { id: 2, name: '绿茶' },
    ];
    expect(orderSelectedCategories([2, 99, 1], categories)).toEqual([
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
            categoryIds: [3, 5],
            pageSize: 10,
            sortType,
          },
          3,
        ),
      ).toEqual({
        categoryId: 3,
        pageNo: 1,
        pageSize: 10,
        tabType: 0,
        ...sorting,
      });
    },
  );

  it('builds the all-groups query and clamps the page size', () => {
    expect(clampProductGroupPageSize(100)).toBe(50);
    expect(
      buildProductGroupQuery(
        { categoryIds: [3, 5], pageSize: 100, sortType: 'default' },
        'all',
      ),
    ).toEqual({
      categoryIds: [3, 5],
      pageNo: 1,
      pageSize: 50,
      tabType: 0,
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

  it('requires at least one product category before saving', () => {
    expect(getProductGroupValidationError({ categoryIds: [] })).toBe(
      '商品分组至少需要选择一个商品分类',
    );
    expect(
      getProductGroupValidationError({ categoryIds: [1] }),
    ).toBeUndefined();
  });
});
