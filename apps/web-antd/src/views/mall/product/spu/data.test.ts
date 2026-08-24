import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCategoryList = vi.hoisted(() => vi.fn());

vi.mock('#/api/mall/product/category', () => ({
  getCategoryList,
}));

describe('商品列表分类筛选', () => {
  beforeEach(() => {
    getCategoryList.mockReset();
    getCategoryList.mockResolvedValue([
      { id: 1, parentId: 0, name: '食品' },
      { id: 2, parentId: 1, name: '零食' },
    ]);
  });

  it('通过异步 api 加载并转换分类树', async () => {
    const { useGridFormSchema } = await import('./data');
    const categoryField = useGridFormSchema().find(
      (field) => field.fieldName === 'categoryIds',
    );
    const api = (categoryField?.componentProps as { api?: () => Promise<unknown[]> })
      ?.api;

    expect(api).toEqual(expect.any(Function));
    await expect(api!()).resolves.toEqual([
      {
        id: 1,
        parentId: 0,
        name: '食品',
        children: [{ id: 2, parentId: 1, name: '零食' }],
      },
    ]);
    expect(getCategoryList).toHaveBeenCalledWith({});
  });
});
