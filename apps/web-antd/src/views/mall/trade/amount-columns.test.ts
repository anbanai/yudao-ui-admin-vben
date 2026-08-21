import { fenToYuan } from '@vben/utils';

import { describe, expect, it, vi } from 'vitest';

import { useGridColumns as useBargainActivityColumns } from '../promotion/bargain/activity/data';
import {
  useHelpGridColumns as useBargainHelpColumns,
  useGridColumns as useBargainRecordColumns,
} from '../promotion/bargain/record/data';
import { useGridColumns as useAfterSaleColumns } from './afterSale/data';
import { useGridColumns as useWithdrawColumns } from './brokerage/withdraw/data';
import { useGridColumns as usePickUpOrderColumns } from './delivery/pickUpOrder/data';
import { useGridColumns as useOrderColumns } from './order/data';

vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { id: 1 } }),
}));

vi.mock('#/api/mall/trade/delivery/pickUpStore', () => ({
  getSimpleDeliveryPickUpStoreList: vi.fn(async () => []),
}));

function findColumn(columns: any[] | undefined, field: string) {
  return columns?.find((column) => column.field === field);
}

describe('mall amount columns', () => {
  it('formats cent-denominated values as yuan', () => {
    expect(findColumn(useAfterSaleColumns(), 'refundPrice')?.formatter).toBe(
      'formatFenToYuanAmount',
    );
    expect(findColumn(useOrderColumns(), 'payPrice')?.formatter).toBe(
      'formatFenToYuanAmount',
    );
    expect(findColumn(usePickUpOrderColumns(), 'payPrice')?.formatter).toBe(
      'formatFenToYuanAmount',
    );
    expect(findColumn(useWithdrawColumns(), 'price')?.formatter).toBe(
      'formatFenToYuanAmount',
    );
    expect(findColumn(useWithdrawColumns(), 'feePrice')?.formatter).toBe(
      'formatFenToYuanAmount',
    );
    expect(
      findColumn(useBargainActivityColumns(), 'bargainFirstPrice')?.formatter,
    ).toBe('formatFenToYuanAmount');
    expect(
      findColumn(useBargainActivityColumns(), 'bargainMinPrice')?.formatter,
    ).toBe('formatFenToYuanAmount');
    expect(
      findColumn(useBargainRecordColumns(), 'activity.bargainMinPrice')
        ?.formatter,
    ).toBe('formatFenToYuanAmount');
    expect(
      findColumn(useBargainRecordColumns(), 'bargainPrice')?.formatter,
    ).toBe('formatFenToYuanAmount');
    expect(findColumn(useBargainHelpColumns(), 'reducePrice')?.formatter).toBe(
      'formatFenToYuanAmount',
    );
  });

  it('converts cents with two decimal places', () => {
    expect(fenToYuan(1)).toBe('0.01');
    expect(fenToYuan(100)).toBe('1.00');
  });
});
