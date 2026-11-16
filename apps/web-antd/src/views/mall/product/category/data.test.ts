import { describe, expect, it, vi } from 'vitest';

import { useFormSchema, useGridColumns } from './data';

vi.mock('#/api/mall/product/category', () => ({
  getCategoryList: vi.fn(),
}));
vi.mock('@vben/hooks', () => ({
  getDictOptions: () => [],
}));

describe('商品分类配置', () => {
  it('限制移动端分类图为商品图片格式和大小', () => {
    const picUrl = useFormSchema().find(
      (field) => field.fieldName === 'picUrl',
    );

    expect(picUrl?.componentProps).toMatchObject({
      maxSize: 3,
      accept: ['jpg', 'jpeg', 'png', 'bmp'],
      scene: 'product',
    });
  });

  it('提供移动端展示商品数并限制为1到50', () => {
    const displayCount = useFormSchema().find(
      (field) => field.fieldName === 'displayProductCount',
    );

    expect(displayCount?.component).toBe('InputNumber');
    expect(displayCount?.componentProps).toMatchObject({
      min: 1,
      max: 50,
      defaultValue: 6,
    });
  });

  it('在分类列表中展示配置的商品数量', () => {
    expect(useGridColumns()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'displayProductCount',
          title: '展示商品数量',
        }),
      ]),
    );
  });

  it('按数值判断一级分类，兼容选择器返回的字符串值', () => {
    const displayCount = useFormSchema().find(
      (field) => field.fieldName === 'displayProductCount',
    );
    const resolve = displayCount?.dependencies?.resolve as any;

    expect(resolve({ values: { parentId: '0' } })).toMatchObject({
      show: false,
      componentProps: { disabled: true },
    });
    expect(resolve({ values: { parentId: '12' } })).toMatchObject({
      show: true,
      componentProps: { disabled: false },
    });
  });
});
