import type { PageParam, PageResult } from '@vben/request';

import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { merchantRequestClient } from '#/api/request';

export namespace MerchantWorkbenchApi {
  export interface Product extends Record<string, any> {
    brandId?: number;
    categoryId?: number;
    description?: string;
    id?: number;
    name?: string;
    picUrl?: string;
    status?: number;
    price?: number;
    salesCount?: number;
    createTime?: string;
    specType?: boolean;
    skus?: Array<
      Record<string, any> & { id?: number; price?: number; stock?: number }
    >;
  }

  export interface Category {
    id: number;
    name: string;
  }

  export interface Brand {
    id?: number;
    name?: string;
    picUrl?: string;
    status?: number;
    sort?: number;
    description?: string;
  }

  export interface Order {
    id?: number;
    orderId?: number;
    no?: string;
    status?: number;
    productCount?: number;
    payPrice?: number;
    logisticsNo?: string;
    createTime?: string;
    deliveryTime?: string;
  }

  export interface OrderDetail {
    subOrder: Order;
    orderNo?: string;
    buyerRemark?: string;
    receiver?: { detailAddress?: string; mobile?: string; name?: string };
    items: Array<{ count?: number; id: number; spuName?: string }>;
  }

  export interface AfterSale {
    id?: number;
    no?: string;
    status?: number;
    type?: number;
    way?: number;
    orderNo?: string;
    spuName?: string;
    refundPrice?: number;
    createTime?: string;
  }

  export interface ShopProfile {
    merchantId?: number;
    storeName: string;
    logoUrl?: string;
    description?: string;
  }

  export interface SfConfigUpdate {
    monthlyCard?: string;
    serviceCode?: string;
    defaultWeightKg?: number;
    paperWidthMm?: number;
    paperHeightMm?: number;
    dpi?: number;
    senderName?: string;
    senderPhone?: string;
    senderProvince?: string;
    senderCity?: string;
    senderDistrict?: string;
    senderAddress?: string;
    returnSameAsSender?: boolean;
    returnName?: string;
    returnPhone?: string;
    returnProvince?: string;
    returnCity?: string;
    returnDistrict?: string;
    returnAddress?: string;
  }

  export interface SfConfig extends Omit<SfConfigUpdate, 'monthlyCard'> {
    monthlyCardMasked?: string;
    configured: boolean;
    supportedPaperSpecs: string[];
  }

  export interface DeliveryRequest {
    id: number;
    subOrderId: number;
    logisticsId: number;
    logisticsNo?: string;
  }

  export interface AfterSaleDisagreeRequest {
    id: number;
    auditReason: string;
  }

  export interface AfterSaleRefuseRequest {
    id: number;
    refuseMemo: string;
  }
}

export function getMerchantProductPage(
  params: PageParam & Record<string, any>,
) {
  return merchantRequestClient.get<PageResult<MerchantWorkbenchApi.Product>>(
    '/product/merchant/spu/page',
    { params },
  );
}

export function createMerchantProduct(data: Record<string, any>) {
  return merchantRequestClient.post<number>(
    '/product/merchant/spu/create',
    data,
  );
}

export function getMerchantProductDetail(id: number) {
  return merchantRequestClient.get<MerchantWorkbenchApi.Product>(
    `/product/merchant/spu/get-detail?id=${id}`,
  );
}

export function getMerchantProductCategories() {
  return merchantRequestClient.get<MerchantWorkbenchApi.Category[]>(
    '/product/merchant/spu/category-list',
  );
}

export function uploadMerchantProductImage(file: File) {
  return merchantRequestClient.upload<string>(
    '/infra/file/product-image-upload',
    { file },
  );
}

export function updateMerchantProduct(data: Record<string, any>) {
  return merchantRequestClient.put('/product/merchant/spu/update', data);
}

export function updateMerchantProductStatus(data: {
  id: number;
  status: number;
}) {
  return merchantRequestClient.put('/product/merchant/spu/update-status', data);
}

export function deleteMerchantProduct(id: number) {
  return merchantRequestClient.delete(`/product/merchant/spu/delete?id=${id}`);
}

export function getMerchantBrandPage(params: PageParam & Record<string, any>) {
  return merchantRequestClient.get<PageResult<MerchantWorkbenchApi.Brand>>(
    '/product/merchant/brand/page',
    { params },
  );
}

export function createMerchantBrand(data: Record<string, any>) {
  return merchantRequestClient.post<number>(
    '/product/merchant/brand/create',
    data,
  );
}

export function updateMerchantBrand(data: Record<string, any>) {
  return merchantRequestClient.put('/product/merchant/brand/update', data);
}

export function deleteMerchantBrand(id: number) {
  return merchantRequestClient.delete(
    `/product/merchant/brand/delete?id=${id}`,
  );
}

export function getMerchantOrderPage(params: PageParam & Record<string, any>) {
  return merchantRequestClient.get<PageResult<MerchantWorkbenchApi.Order>>(
    '/trade/merchant/order/page',
    { params },
  );
}

export function getMerchantOrderDetail(subOrderId: number) {
  return merchantRequestClient.get<MerchantWorkbenchApi.OrderDetail>(
    `/trade/merchant/order/get-detail?subOrderId=${subOrderId}`,
  );
}

export function deliverMerchantOrder(
  data: MerchantWorkbenchApi.DeliveryRequest,
) {
  return merchantRequestClient.put('/trade/merchant/order/delivery', data);
}

export function getMerchantAfterSalePage(
  params: PageParam & Record<string, any>,
) {
  return merchantRequestClient.get<PageResult<MerchantWorkbenchApi.AfterSale>>(
    '/trade/merchant/after-sale/page',
    { params },
  );
}

export function getMerchantAfterSaleDetail(id: number) {
  return merchantRequestClient.get(
    `/trade/merchant/after-sale/get-detail?id=${id}`,
  );
}

export function agreeMerchantAfterSale(id: number) {
  return merchantRequestClient.put(
    '/trade/merchant/after-sale/agree',
    undefined,
    {
      params: { id },
    },
  );
}

export function disagreeMerchantAfterSale(
  data: MerchantWorkbenchApi.AfterSaleDisagreeRequest,
) {
  return merchantRequestClient.put('/trade/merchant/after-sale/disagree', data);
}

export function receiveMerchantAfterSale(id: number) {
  return merchantRequestClient.put(
    '/trade/merchant/after-sale/receive',
    undefined,
    {
      params: { id },
    },
  );
}

export function refuseMerchantAfterSale(
  data: MerchantWorkbenchApi.AfterSaleRefuseRequest,
) {
  return merchantRequestClient.put('/trade/merchant/after-sale/refuse', data);
}

export function getMerchantShopProfile() {
  return merchantRequestClient.get<MerchantWorkbenchApi.ShopProfile>(
    '/product/merchant/profile/get',
  );
}

export function updateMerchantShopProfile(
  data: MerchantWorkbenchApi.ShopProfile,
) {
  return merchantRequestClient.put('/product/merchant/profile/update', data);
}

const sfBase = '/trade/merchant/logistics/sf';

export function getMerchantSfConfig() {
  return merchantRequestClient.get<MerchantWorkbenchApi.SfConfig>(
    `${sfBase}-config`,
  );
}

export function updateMerchantSfConfig(
  data: MerchantWorkbenchApi.SfConfigUpdate,
) {
  return merchantRequestClient.put(`${sfBase}-config`, data);
}

export function getMerchantPrintDevices() {
  return merchantRequestClient.get<MallSfLogisticsApi.Device[]>(
    `${sfBase}/devices`,
  );
}

export function enrollMerchantPrintDevice() {
  return merchantRequestClient.post<MallSfLogisticsApi.Device>(
    `${sfBase}/devices/enroll`,
  );
}

export function saveMerchantPrintDevice(
  data: Pick<
    MallSfLogisticsApi.Device,
    'defaultFlag' | 'id' | 'printerName' | 'status'
  >,
) {
  return merchantRequestClient.post<MallSfLogisticsApi.Device>(
    `${sfBase}/devices`,
    data,
  );
}

export function testMerchantPrintDevice(
  deviceId: number,
  paper: { paperHeightMm: number; paperWidthMm: number },
) {
  return merchantRequestClient.post<MallSfLogisticsApi.PrintTask>(
    `${sfBase}/devices/${deviceId}/test-print`,
    paper,
  );
}

export function createMerchantSfWaybill(data: { subOrderId: number }) {
  return merchantRequestClient.post<MallSfLogisticsApi.Waybill>(
    `${sfBase}/waybill/create`,
    data,
  );
}
