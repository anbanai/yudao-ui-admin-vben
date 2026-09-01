import { describe, expect, it, vi } from 'vitest';

vi.mock('#/api/mall/product/brand', () => ({
  getSimpleBrandList: vi.fn(),
}));
vi.mock('#/api/mall/product/category', () => ({
  getCategoryList: vi.fn(),
}));
vi.mock('#/api/mall/product/group', () => ({
  getSelectableGroupList: vi.fn(),
}));
vi.mock('#/api/mall/trade/delivery/expressTemplate', () => ({
  getSimpleTemplateList: vi.fn(),
}));

describe('商品基础信息表单', () => {
  it('保留必填单分类并增加可选多分组', async () => {
    const { useInfoFormSchema } = await import('./data');
    const schema = useInfoFormSchema();
    const categoryField = schema.find(
      (item) => item.fieldName === 'categoryId',
    );
    const groupField = schema.find((item) => item.fieldName === 'groupIds');

    expect(categoryField).toMatchObject({
      component: 'ApiTreeSelect',
      rules: 'required',
    });
    expect(groupField).toMatchObject({
      component: 'ApiSelect',
      label: '商品分组',
    });
    expect(groupField?.rules).toBeUndefined();
    expect(groupField?.componentProps).toMatchObject({
      mode: 'multiple',
      labelField: 'name',
      valueField: 'id',
    });
  });
});
