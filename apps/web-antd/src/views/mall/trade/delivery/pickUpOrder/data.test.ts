import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSimpleDeliveryPickUpStoreList = vi.hoisted(() => vi.fn());

vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { id: 7 } }),
}));

vi.mock('#/api/mall/trade/delivery/pickUpStore', () => ({
  getSimpleDeliveryPickUpStoreList,
}));

describe('自提订单门店筛选', () => {
  beforeEach(() => {
    getSimpleDeliveryPickUpStoreList.mockReset();
    getSimpleDeliveryPickUpStoreList.mockResolvedValue([
      { id: 1, name: '可核销门店', verifyUserIds: [7] },
      { id: 2, name: '其它门店', verifyUserIds: [8] },
    ]);
  });

  it('通过 ApiSelect 加载并过滤当前用户可核销门店', async () => {
    const { useGridFormSchema } = await import('./data');
    const storeField = useGridFormSchema().find(
      (field) => field.fieldName === 'pickUpStoreIds',
    );
    const componentProps = storeField?.componentProps as {
      api?: () => Promise<unknown[]>;
      autoSelect?: string;
    };

    expect(storeField?.component).toBe('ApiSelect');
    expect(componentProps.autoSelect).toBe('first');
    await expect(componentProps.api!()).resolves.toEqual([
      { id: 1, name: '可核销门店', verifyUserIds: [7] },
    ]);
  });
});
