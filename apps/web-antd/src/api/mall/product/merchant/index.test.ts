import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('#/api/request', () => ({
  requestClient: { get: mocks.get },
  merchantRequestClient: {},
}));

import { getSimpleMerchantList, MerchantStatus } from './index';

describe('approved merchant options', () => {
  beforeEach(() => vi.resetAllMocks());

  it('loads all pages so merchants beyond the first 200 remain selectable', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => ({
      id: index + 1,
      name: `商家 ${index + 1}`,
    }));
    mocks.get.mockResolvedValueOnce({ list: firstPage, total: 201 });
    mocks.get.mockResolvedValueOnce({
      list: [{ id: 201, name: '商家 201', storeName: '第 201 家店铺' }],
      total: 201,
    });
    const result = await getSimpleMerchantList();
    expect(result).toHaveLength(201);
    expect(result[0]?.storeName).toBe('商家 1');
    expect(result.at(-1)?.storeName).toBe('第 201 家店铺');
    expect(mocks.get).toHaveBeenLastCalledWith('/product/merchant/page', {
      params: { pageNo: 2, pageSize: 200, status: MerchantStatus.APPROVED },
    });
  });

  it('returns an empty list without requesting further pages', async () => {
    mocks.get.mockResolvedValueOnce({ list: [], total: 0 });
    expect(await getSimpleMerchantList()).toEqual([]);
    expect(mocks.get).toHaveBeenCalledOnce();
  });
});
