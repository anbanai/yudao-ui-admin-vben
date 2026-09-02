import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';
import type { MallOrderApi } from '#/api/mall/trade/order';

import { DeliveryTypeEnum, TradeOrderStatusEnum } from '@vben/constants';

import { isPrintTaskQueued } from '../logistics/sf/delivery-status';

export type DeviceConnectionState = 'offline' | 'online' | 'unconnected';

export interface BatchResultSummary {
  total: number;
  queued: number;
  reused: number;
  failed: number;
}

export function isBatchSfOrderSelectable(order: MallOrderApi.Order) {
  return (
    order.status === TradeOrderStatusEnum.UNDELIVERED.status &&
    order.deliveryType === DeliveryTypeEnum.EXPRESS.type &&
    order.refundStatus === 0
  );
}

export function isBatchSizeValid(count: number) {
  return count > 0 && count <= 100;
}

export function getDeviceConnectionState(
  device: Pick<MallSfLogisticsApi.Device, 'lastPollTime'>,
  now = Date.now(),
): DeviceConnectionState {
  if (!device.lastPollTime) return 'unconnected';
  const lastPollTime = Date.parse(device.lastPollTime);
  if (Number.isNaN(lastPollTime)) return 'offline';
  return now - lastPollTime <= 60_000 && now >= lastPollTime
    ? 'online'
    : 'offline';
}

export function summarizeBatchResults(
  results: MallSfLogisticsApi.Waybill[],
): BatchResultSummary {
  let queued = 0;
  let reused = 0;
  let failed = 0;
  for (const result of results) {
    if (!isPrintTaskQueued(result.printStatus)) {
      failed += 1;
    } else if (result.reused) {
      reused += 1;
    } else {
      queued += 1;
    }
  }
  return { total: results.length, queued, reused, failed };
}
