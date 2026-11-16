import { describe, expect, it, vi } from 'vitest';

import { useFormSchema } from './data';

vi.mock('#/api/mall/product/merchant', () => ({
  getSimpleMerchantList: vi.fn(),
}));
vi.mock('@vben/hooks', () => ({
  getDictOptions: () => [],
}));

describe('商品品牌表单图片上传策略', () => {
  it('限制品牌图片为商品图片格式和大小', () => {
    const picUrl = useFormSchema().find(
      (field) => field.fieldName === 'picUrl',
    );

    expect(picUrl?.componentProps).toMatchObject({
      maxSize: 3,
      accept: ['jpg', 'jpeg', 'png', 'bmp'],
      scene: 'product',
    });
  });
});
