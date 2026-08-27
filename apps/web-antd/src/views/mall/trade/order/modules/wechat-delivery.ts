import type { MallWechatLogisticsApi } from '#/api/mall/trade/logistics/wechat';

export interface WechatDeliveryDependencies {
  confirmPrint: (id: number) => Promise<MallWechatLogisticsApi.Waybill>;
  createWaybill: (orderId: number) => Promise<MallWechatLogisticsApi.Waybill>;
  onWaybillCreated?: (waybill: MallWechatLogisticsApi.Waybill) => void;
}

export async function createAndConfirmWechatWaybill(
  orderId: number,
  { confirmPrint, createWaybill, onWaybillCreated }: WechatDeliveryDependencies,
): Promise<MallWechatLogisticsApi.Waybill> {
  const waybill = await createWaybill(orderId);
  if (waybill.status !== 'CREATED') {
    throw new Error(
      waybill.errorMessage || '微信物流订单创建失败，请查看后台错误码后重试',
    );
  }
  if (!waybill.id) {
    throw new Error('微信物流订单创建成功，但未返回运单编号');
  }

  onWaybillCreated?.(waybill);
  return await confirmPrint(waybill.id);
}
