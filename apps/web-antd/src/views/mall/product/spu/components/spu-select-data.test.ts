import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCategoryList = vi.hoisted(() => vi.fn());

vi.mock('#/api/mall/product/category', () => ({
  getCategoryList,
}));

describe('商品选择分类筛选', () => {
  const categories = [
    { id: 1, parentId: 0, name: '食品' },
    { id: 2, parentId: 1, name: '零食' },
  ];

  beforeEach(() => {
    getCategoryList.mockReset();
    getCategoryList.mockResolvedValue(categories);
  });

  it('通过异步 api 加载分类树并返回原始分类列表', async () => {
    const { useGridFormSchema } = await import('./spu-select-data');
    const onLoaded = vi.fn();
    const categoryField = useGridFormSchema(onLoaded).find(
      (field) => field.fieldName === 'categoryId',
    );
    const componentProps = categoryField?.componentProps as {
      api?: () => Promise<unknown[]>;
    };

    expect(categoryField?.component).toBe('ApiTreeSelect');
    expect(componentProps.api).toEqual(expect.any(Function));
    await expect(componentProps.api!()).resolves.toEqual([
      {
        id: 1,
        parentId: 0,
        name: '食品',
        children: [{ id: 2, parentId: 1, name: '零食' }],
      },
    ]);
    expect(getCategoryList).toHaveBeenCalledWith({});
    expect(onLoaded).toHaveBeenCalledWith(categories);
    expect(onLoaded.mock.calls[0]?.[0]).toBe(categories);
    expect(categories[0]).not.toHaveProperty('children');
    expect(componentProps).toMatchObject({
      labelField: 'name',
      valueField: 'id',
      childrenField: 'children',
      placeholder: '请选择商品分类',
      allowClear: true,
      showSearch: true,
      treeNodeFilterProp: 'label',
    });
  });
});
