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
vi.mock('#/api/mall/product/merchant', () => ({
  getSimpleMerchantList: vi.fn(),
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
      labelField: 'label',
      valueField: 'id',
      disabledField: 'disabled',
      allowClear: false,
    });
  });

  it('品牌、关键字和简介为可选字段，并提供预售配置', async () => {
    const { useInfoFormSchema } = await import('./data');
    const schema = useInfoFormSchema();
    for (const fieldName of ['brandId', 'keyword', 'introduction']) {
      expect(schema.find((item) => item.fieldName === fieldName)?.rules).toBe(
        undefined,
      );
    }
    expect(schema.find((item) => item.fieldName === 'isPreSale')).toMatchObject(
      {
        component: 'RadioGroup',
      },
    );
    expect(
      schema.find((item) => item.fieldName === 'deliveryDaysPreset'),
    ).toBeDefined();
  });

  it('主图和轮播图限制为 3MB 的 JPG、PNG、BMP', async () => {
    const { useInfoFormSchema } = await import('./data');
    const schema = useInfoFormSchema();
    for (const fieldName of ['picUrl', 'sliderPicUrls']) {
      expect(
        schema.find((item) => item.fieldName === fieldName)?.componentProps,
      ).toMatchObject({
        maxSize: 3,
        accept: ['jpg', 'jpeg', 'png', 'bmp'],
        scene: 'product',
      });
    }
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
    expect(componentProps?.imageUploadScene).toBe('product');
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

    expect(batchField?.hide).toBe(true);
    expect(multiField?.hide).toBe(true);
  });

  it('固定使用多规格，不再暴露单规格切换', async () => {
    const { useSkuFormSchema } = await import('./data');
    const schema = useSkuFormSchema([], false);
    expect(schema.some((item) => item.fieldName === 'specType')).toBe(false);
    expect(schema.some((item) => item.fieldName === 'singleSkuList')).toBe(
      false,
    );
    expect(schema.some((item) => item.fieldName === 'multiSkuList')).toBe(true);
  });

  it('历史单规格商品在迁移属性前仍展示原 SKU 编辑表', async () => {
    const { useSkuFormSchema } = await import('./data');
    const schema = useSkuFormSchema([], false, true);
    expect(schema.some((item) => item.fieldName === 'legacySkuList')).toBe(
      true,
    );
  });
});

describe('商品其它设置表单', () => {
  it('提供限购、等级限购和积分抵扣比例', async () => {
    const { useOtherFormSchema } = await import('./data');
    const schema = useOtherFormSchema();
    expect(schema.find((item) => item.fieldName === 'buyLimit')).toMatchObject({
      component: 'InputNumber',
    });
    expect(
      schema.find((item) => item.fieldName === 'buyLimitLevel'),
    ).toMatchObject({
      component: 'Select',
    });
    expect(
      schema.find((item) => item.fieldName === 'pointDiscountRate'),
    ).toMatchObject({
      component: 'InputNumber',
    });
  });
});
