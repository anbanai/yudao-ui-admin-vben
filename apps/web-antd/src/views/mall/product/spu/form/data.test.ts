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

describe('商品详情表单', () => {
  it('把富文本图片上传状态转发给商品表单', async () => {
    const { useDescriptionFormSchema } = await import('./data');
    const onUploadingChange = vi.fn();
    const descriptionField = useDescriptionFormSchema(onUploadingChange).find(
      (item) => item.fieldName === 'description',
    );

    const componentProps = descriptionField?.componentProps as
      | Record<string, any>
      | undefined;
    componentProps?.onUploadingChange(true);

    expect(onUploadingChange).toHaveBeenCalledWith(true);
  });
});

describe('商品规格表单', () => {
  it('属性值不完整时不显示批量设置和规格列表', async () => {
    const { useSkuFormSchema } = await import('./data');
    const schema = useSkuFormSchema([
      {
        id: 1,
        name: '颜色',
        values: [],
      },
    ]);
    const batchField = schema.find((item) => item.fieldName === 'batchSkuList');
    const multiField = schema.find((item) => item.fieldName === 'multiSkuList');
    const resolveBatch = batchField?.dependencies?.resolve as any;
    const resolveMulti = multiField?.dependencies?.resolve as any;

    expect(resolveBatch({ values: { specType: true } }).show).toBe(false);
    expect(resolveMulti({ values: { specType: true } }).show).toBe(false);
  });
});
