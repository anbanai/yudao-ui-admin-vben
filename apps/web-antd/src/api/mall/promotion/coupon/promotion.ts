import { requestClient } from '#/api/request';

export interface CouponPromotion {
  id: number;
  templateId: number;
  source: string;
  channel: string;
  shortCode: string;
  miniProgramPath: string;
  takeCount: number;
}
export function createCouponPromotion(data: {
  channel?: string;
  idempotencyKey: string;
  source?: string;
  templateId: number;
}) {
  return requestClient.post<CouponPromotion>(
    '/promotion/coupon-promotion/create',
    data,
  );
}
