import { describe, expect, it, vi } from 'vitest';

import { createBrand, getBrand, updateBrand } from '#/api/mall/product/brand';
import { requestClient } from '#/api/request';

import { useFormSchema } from './data';

vi.mock('#/api/request', () => ({
  requestClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
vi.mock('@vben/hooks', () => ({ getDictOptions: () => [] }));

describe('商品详情品牌展示', () => {
  it('新增品牌时默认不展示', () => {
    expect(
      useFormSchema().find((field) => field.fieldName === 'showInDetail'),
    ).toMatchObject({ component: 'Switch', defaultValue: false });
  });

  it('保留布尔开关，使用现有的新增、回显和更新接口', async () => {
    const brand = {
      name: '测试品牌',
      picUrl: '',
      status: 0,
      showInDetail: false,
    };
    await createBrand(brand);
    expect(requestClient.post).toHaveBeenCalledWith(
      '/product/brand/create',
      brand,
    );
    const saved = { ...brand, id: 7, showInDetail: true };
    vi.mocked(requestClient.get).mockResolvedValueOnce(saved);
    expect(await getBrand(7)).toEqual(saved);
    await updateBrand({ ...saved, showInDetail: false });
    expect(requestClient.put).toHaveBeenCalledWith('/product/brand/update', {
      ...saved,
      showInDetail: false,
    });
  });
});
