import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';
import type { MallOrderApi } from '#/api/mall/trade/order';

import { DeliveryTypeEnum, TradeOrderStatusEnum } from '@vben/constants';

import { describe, expect, it } from 'vitest';

import {
  getDeviceConnectionState,
  isBatchSfOrderSelectable,
  isBatchSizeValid,
  summarizeBatchResults,
} from './batch-shipping';

const baseOrder: MallOrderApi.Order = {
  id: 1,
  status: TradeOrderStatusEnum.UNDELIVERED.status,
  deliveryType: DeliveryTypeEnum.EXPRESS.type,
  refundStatus: 0,
};
const WECHAT_TERMINAL = 20;

describe('order batch SF shipping helpers', () => {
  it('allows undelivered express orders from any channel', () => {
    expect(isBatchSfOrderSelectable({ ...baseOrder, terminal: 1 })).toBe(true);
    expect(
      isBatchSfOrderSelectable({ ...baseOrder, terminal: WECHAT_TERMINAL }),
    ).toBe(true);
  });

  it.each([
    {
      status: TradeOrderStatusEnum.DELIVERED.status,
      deliveryType: DeliveryTypeEnum.EXPRESS.type,
    },
    {
      status: TradeOrderStatusEnum.UNDELIVERED.status,
      deliveryType: DeliveryTypeEnum.PICK_UP.type,
    },
    {
      status: TradeOrderStatusEnum.UNDELIVERED.status,
      deliveryType: DeliveryTypeEnum.EXPRESS.type,
      refundStatus: 10,
    },
    {
      status: TradeOrderStatusEnum.UNDELIVERED.status,
      deliveryType: DeliveryTypeEnum.EXPRESS.type,
      refundStatus: 20,
    },
    {
      status: TradeOrderStatusEnum.UNDELIVERED.status,
      deliveryType: DeliveryTypeEnum.EXPRESS.type,
      refundStatus: undefined,
    },
  ])('rejects non-eligible order %#', (order) => {
    expect(isBatchSfOrderSelectable({ ...baseOrder, ...order })).toBe(false);
  });

  it('accepts at most 100 selected orders', () => {
    expect(isBatchSizeValid(1)).toBe(true);
    expect(isBatchSizeValid(100)).toBe(true);
    expect(isBatchSizeValid(101)).toBe(false);
    expect(isBatchSizeValid(0)).toBe(false);
  });

  it('classifies device heartbeat within 60 seconds as online', () => {
    const now = Date.parse('2026-09-02T00:00:00.000Z');
    expect(
      getDeviceConnectionState(
        { lastPollTime: '2026-09-01T23:59:30.000Z' },
        now,
      ),
    ).toBe('online');
    expect(
      getDeviceConnectionState(
        { lastPollTime: '2026-09-01T23:58:59.000Z' },
        now,
      ),
    ).toBe('offline');
    expect(getDeviceConnectionState({}, now)).toBe('unconnected');
  });

  it('summarizes newly queued, reused, and failed results', () => {
    const result = summarizeBatchResults([
      { printStatus: 'PENDING', reused: false },
      { printStatus: 'ACCEPTED', reused: true },
      { status: 'FAILED', errorMessage: '取号失败', reused: false },
      { status: 'UNKNOWN', reused: false },
    ] as MallSfLogisticsApi.Waybill[]);

    expect(result).toEqual({ total: 4, queued: 1, reused: 1, failed: 2 });
  });
});
