import { describe, expect, it, vi } from 'vitest';

import {
  buildProductCategoryQuery,
  buildTreeSelectCategoryValues,
  createProductCategoryPreviewLoader,
  getProductCategoryPreviewState,
  getProductCategoryValidationError,
  normalizeCategoryIds,
  normalizeTreeSelectCategoryIds,
} from './utils';

describe('product category utils', () => {
  it('normalizes tree selections without changing category semantics', () => {
    expect(
      normalizeTreeSelectCategoryIds([{ value: '2' }, 1, 2, 0, -1, 'x']),
    ).toEqual([2, 1]);
    expect(
      buildTreeSelectCategoryValues(
        [2, 1],
        [
          { id: 1, name: '绿茶' },
          { id: 2, name: '红茶' },
        ],
      ),
    ).toEqual([
      { label: '红茶', value: 2 },
      { label: '绿茶', value: 1 },
    ]);
  });

  it('builds the existing category SPU query for all and one tab', () => {
    expect(
      buildProductCategoryQuery(
        { categoryIds: [2, 1, 2], pageSize: 99, sortType: 'latest' },
        'all',
      ),
    ).toEqual({
      categoryIds: [2, 1],
      pageNo: 1,
      pageSize: 50,
      tabType: 0,
      sortAsc: false,
      sortField: 'createTime',
    });
    expect(
      buildProductCategoryQuery(
        { categoryIds: [2, 1], pageSize: 10, sortType: 'default' },
        2,
      ),
    ).toEqual({
      categoryId: 2,
      pageNo: 1,
      pageSize: 10,
      tabType: 0,
    });
  });

  it('limits category selections to fifteen ids', () => {
    expect(
      normalizeCategoryIds(Array.from({ length: 20 }, (_, i) => i + 1)),
    ).toHaveLength(15);
  });

  it('requires at least one category', () => {
    expect(getProductCategoryValidationError({ categoryIds: [] })).toBe(
      '商品分类至少需要选择一个分类',
    );
    expect(
      getProductCategoryValidationError({ categoryIds: [1] }),
    ).toBeUndefined();
  });

  it('distinguishes loading, failure, and empty preview states', () => {
    expect(
      getProductCategoryPreviewState({
        categoryCount: 1,
        failed: false,
        hasLoaded: false,
        loading: true,
        productCount: 0,
      }),
    ).toBe('loading');
    expect(
      getProductCategoryPreviewState({
        categoryCount: 1,
        failed: true,
        hasLoaded: true,
        loading: false,
        productCount: 0,
      }),
    ).toBe('failed');
    expect(
      getProductCategoryPreviewState({
        categoryCount: 0,
        failed: false,
        hasLoaded: true,
        loading: false,
        productCount: 0,
      }),
    ).toBe('emptyCategory');
    expect(
      getProductCategoryPreviewState({
        categoryCount: 1,
        failed: false,
        hasLoaded: true,
        loading: false,
        productCount: 0,
      }),
    ).toBe('emptyProduct');
  });

  it('reports failed preview requests', async () => {
    const loader = createProductCategoryPreviewLoader(async () => {
      throw new Error('network error');
    });
    await expect(loader.load('1', { categoryId: 1 })).resolves.toEqual({
      accepted: true,
      failed: true,
      list: [],
    });
  });

  it('reuses an in-flight request when switching back to the same category', async () => {
    const resolvers = new Map<string, (items: string[]) => void>();
    const requestPage = vi.fn(
      (query: { key: string }) =>
        new Promise<string[]>((resolve) => {
          resolvers.set(query.key, resolve);
        }),
    );
    const loader = createProductCategoryPreviewLoader(requestPage);

    const firstA = loader.load('a', { key: 'a' });
    const firstB = loader.load('b', { key: 'b' });
    const secondA = loader.load('a', { key: 'a' });

    expect(requestPage).toHaveBeenCalledTimes(2);
    resolvers.get('a')?.(['A']);
    resolvers.get('b')?.(['B']);
    await expect(firstA).resolves.toEqual({
      accepted: false,
      failed: false,
      list: [],
    });
    await expect(firstB).resolves.toEqual({
      accepted: false,
      failed: false,
      list: [],
    });
    await expect(secondA).resolves.toEqual({
      accepted: true,
      failed: false,
      list: ['A'],
    });
  });
});
