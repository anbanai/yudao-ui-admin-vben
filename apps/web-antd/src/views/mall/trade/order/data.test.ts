import { describe, expect, it, vi } from 'vitest';

import { useGridFormSchema } from './data';

vi.mock('@vben/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vben/hooks')>()),
  getDictOptions: () => [],
}));

vi.mock('#/components/area', () => ({
  AreaCascader: {},
}));

vi.mock('#/api/mall/trade/delivery/express', () => ({
  getSimpleDeliveryExpressList: vi.fn().mockResolvedValue([]),
}));

vi.mock('#/api/mall/trade/delivery/pickUpStore', () => ({
  getSimpleDeliveryPickUpStoreList: vi.fn().mockResolvedValue([]),
}));

describe('trade order search form', () => {
  it('supports filtering by product name', () => {
    const productNameField = useGridFormSchema().find(
      (field) => field.fieldName === 'spuName',
    );

    expect(productNameField).toMatchObject({
      component: 'Input',
      label: '商品名称',
    });
    expect(productNameField?.componentProps).toMatchObject({
      placeholder: '请输入商品名称',
    });
  });
});
