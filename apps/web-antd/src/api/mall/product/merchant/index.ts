import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace MallMerchantApi {
  /** 商家信息 */
  export interface Merchant {
    id?: number;
    name: string;
    storeName?: string;
    logoUrl?: string;
    companyName?: string;
    creditCode?: string;
    legalPerson?: string;
    contactName?: string;
    contactMobile?: string;
    status?: number;
    rejectReason?: string;
    createTime?: Date;
  }

  export interface Qualification {
    id?: number;
    merchantId: number;
    type: string;
    certificateNo?: string;
    fileUrl: string;
    validStart?: string;
    validEnd?: string;
    status?: number;
    reviewerId?: number;
    reviewReason?: string;
    createTime?: Date;
  }
}

export const MerchantStatus = {
  DRAFT: 0,
  PENDING: 10,
  APPROVED: 20,
  REJECTED: 30,
  FROZEN: 40,
} as const;

/** 查询商家分页 */
export function getMerchantPage(params: PageParam) {
  return requestClient.get<PageResult<MallMerchantApi.Merchant>>(
    '/product/merchant/page',
    { params },
  );
}

/** 查询商家详情 */
export function getMerchant(id: number) {
  return requestClient.get<MallMerchantApi.Merchant>(
    `/product/merchant/get?id=${id}`,
  );
}

export function createMerchant(data: MallMerchantApi.Merchant) {
  return requestClient.post<number>('/product/merchant/create', data);
}

export function updateMerchant(data: MallMerchantApi.Merchant) {
  return requestClient.put('/product/merchant/update', data);
}

export function submitMerchantReview(id: number) {
  return requestClient.post('/product/merchant/submit-review', undefined, {
    params: { id },
  });
}

export function approveMerchant(id: number) {
  return requestClient.post('/product/merchant/approve', undefined, {
    params: { id },
  });
}

export function rejectMerchant(id: number, reason?: string) {
  return requestClient.post('/product/merchant/reject', { id, reason });
}

export function freezeMerchant(id: number) {
  return requestClient.post('/product/merchant/freeze', undefined, {
    params: { id },
  });
}

export function unfreezeMerchant(id: number) {
  return requestClient.post('/product/merchant/unfreeze', undefined, {
    params: { id },
  });
}

export function getMerchantQualifications(merchantId: number) {
  return requestClient.get<MallMerchantApi.Qualification[]>(
    '/product/merchant-qualification/list',
    { params: { merchantId } },
  );
}

export function createMerchantQualification(
  data: MallMerchantApi.Qualification,
) {
  return requestClient.post<number>(
    '/product/merchant-qualification/create',
    data,
  );
}

export function updateMerchantQualification(
  data: MallMerchantApi.Qualification,
) {
  return requestClient.put('/product/merchant-qualification/update', data);
}

export function deleteMerchantQualification(id: number) {
  return requestClient.delete(
    `/product/merchant-qualification/delete?id=${id}`,
  );
}

export function approveMerchantQualification(id: number) {
  return requestClient.post(
    '/product/merchant-qualification/approve',
    undefined,
    { params: { id } },
  );
}

export function rejectMerchantQualification(id: number, reason?: string) {
  return requestClient.post(
    '/product/merchant-qualification/reject',
    undefined,
    {
      params: { id, reason },
    },
  );
}

/** 查询已审核商家的下拉选项 */
export async function getSimpleMerchantList() {
  const result = await getMerchantPage({
    pageNo: 1,
    pageSize: 1000,
    status: 20,
  });
  return result.list.map((merchant) => ({
    ...merchant,
    storeName: merchant.storeName || merchant.name,
  }));
}
