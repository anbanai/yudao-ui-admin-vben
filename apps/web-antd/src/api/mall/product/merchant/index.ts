import type { PageParam, PageResult } from '@vben/request';

import type { MerchantApplicationTerms } from './application-contract';

import { merchantRequestClient, requestClient } from '#/api/request';

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
    fileId?: number;
    fileName?: string;
    fileUrl?: string;
    previewUrl?: string;
    previewUnavailable?: boolean;
    validStart?: string;
    validEnd?: string;
    status?: number;
    reviewerId?: number;
    reviewReason?: string;
    createTime?: Date;
  }

  export interface QualificationRequirement {
    code: string;
    name: string;
    required: boolean;
    certificateNoRequired: boolean;
    certificateNoPattern?: string;
    validityRequired: boolean;
    enabled?: boolean;
    sort?: number;
  }

  export interface ApplicationQualification {
    code: string;
    name?: string;
    certificateNo?: string;
    fileId?: number;
    fileName?: string;
    previewUrl?: string;
    previewUnavailable?: boolean;
    validStart?: string;
    validEnd?: string;
  }

  export interface BusinessType {
    id: number;
    code: string;
    name: string;
    enabled?: boolean;
    sort?: number;
    requirements: QualificationRequirement[];
  }

  export interface BusinessTypeConfig extends Omit<BusinessType, 'id'> {
    id?: number;
  }

  export interface ApplicationDraftReqVO {
    businessTypes?: string[];
    name?: string;
    storeName?: string;
    logoUrl?: string;
    companyName?: string;
    creditCode?: string;
    legalPerson?: string;
    contactName?: string;
    contactMobile?: string;
    qualifications?: ApplicationQualification[];
  }

  export interface Application {
    id?: number;
    merchantId?: number;
    ownerAccountId?: number;
    currentOwnerAccountId?: number;
    versionNo?: number;
    type?: 'CHANGE' | 'INITIAL' | 'NEW' | string;
    businessType?: string;
    merchantStatus?: number;
    name: string;
    storeName: string;
    logoUrl?: string;
    companyName?: string;
    creditCode?: string;
    legalPerson?: string;
    contactName?: string;
    contactMobile?: string;
    businessTypes: string[];
    qualifications: ApplicationQualification[];
    status?: number;
    rejectReason?: string;
    submittedTime?: Date;
    agreementVersion?: string;
    privacyPolicyVersion?: string;
    consentAccepted?: boolean;
    consentTime?: Date;
    reviewTime?: Date;
    createTime?: Date;
    updateTime?: Date;
  }

  export interface ReviewRecord {
    id?: number;
    applicationId?: number;
    versionNo?: number;
    action?: string;
    reason?: string;
    reviewerId?: number;
    reviewTime?: Date;
  }
}

export const MerchantStatus = {
  DRAFT: 0,
  PENDING: 10,
  APPROVED: 20,
  REJECTED: 30,
  FROZEN: 40,
  CHANGE_PENDING: 50,
  CHANGE_REJECTED: 60,
} as const;

/** 查询商家分页 */
export function getMerchantPage(params: PageParam) {
  return requestClient.get<PageResult<MallMerchantApi.Merchant>>(
    '/product/merchant/page',
    { params },
  );
}

/** 查询商家详情 */
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

/** 查询已审核商家的下拉选项 */
export async function getSimpleMerchantList() {
  const merchants: MallMerchantApi.Merchant[] = [];
  let pageNo = 1;
  while (true) {
    const result = await getMerchantPage({
      pageNo,
      pageSize: 200,
      status: MerchantStatus.APPROVED,
    });
    merchants.push(...result.list);
    if (result.list.length === 0 || merchants.length >= result.total) break;
    pageNo++;
  }
  return merchants.map((merchant) => ({
    ...merchant,
    storeName: merchant.storeName || merchant.name,
  }));
}

export function getMerchantApplicationMine() {
  return merchantRequestClient.get<MallMerchantApi.Application | null>(
    '/product/merchant/application/mine',
  );
}

export function getMerchantApplicationTerms() {
  return merchantRequestClient.get<MerchantApplicationTerms>(
    '/product/merchant/application/terms',
  );
}

export function saveMerchantApplicationDraft(
  data: MallMerchantApi.ApplicationDraftReqVO,
) {
  return merchantRequestClient.post(
    '/product/merchant/application/draft',
    data,
  );
}

export function submitMerchantApplication(data: {
  accepted: boolean;
  agreementVersion: string;
  privacyPolicyVersion: string;
}) {
  return merchantRequestClient.post(
    '/product/merchant/application/submit',
    data,
  );
}

export function getMerchantApplicationHistory() {
  return merchantRequestClient.get<MallMerchantApi.Application[]>(
    '/product/merchant/application/history',
  );
}

export function getMerchantBusinessTypeList() {
  return merchantRequestClient.get<MallMerchantApi.BusinessType[]>(
    '/product/merchant/business-type/list',
  );
}

export function uploadMerchantQualification(file: File) {
  return merchantRequestClient.upload<{
    fileId: number;
    previewUrl: string;
  }>('/infra/file/qualification-upload', { file });
}

export function getMerchantApplicationPage(
  params: PageParam & Record<string, any>,
) {
  return requestClient.get<PageResult<MallMerchantApi.Application>>(
    '/product/merchant/application/page',
    { params },
  );
}

export function getMerchantApplication(id: number) {
  return requestClient.get<MallMerchantApi.Application>(
    `/product/merchant/application/get?id=${id}`,
  );
}

export function approveMerchantApplication(id: number) {
  return requestClient.post(
    '/product/merchant/application/approve',
    undefined,
    { params: { id } },
  );
}

export function rejectMerchantApplication(
  applicationId: number,
  reason: string,
) {
  return requestClient.post('/product/merchant/application/reject', {
    applicationId,
    reason,
  });
}

export function getMerchantApplicationReviewRecords(merchantId: number) {
  return requestClient.get<MallMerchantApi.ReviewRecord[]>(
    '/product/merchant/application/review-records',
    { params: { merchantId } },
  );
}

export function getMerchantBusinessTypePage(params: PageParam) {
  return requestClient.get<PageResult<MallMerchantApi.BusinessTypeConfig>>(
    '/product/merchant/business-type/page',
    { params },
  );
}

export function saveMerchantBusinessType(
  data: MallMerchantApi.BusinessTypeConfig,
) {
  return requestClient.post('/product/merchant/business-type/save', data);
}

export function deleteMerchantBusinessType(id: number) {
  return requestClient.delete(
    `/product/merchant/business-type/delete?id=${id}`,
  );
}

export function getAdminMerchantApplicationHistory(merchantId: number) {
  return requestClient.get<MallMerchantApi.Application[]>(
    '/product/merchant/application/history',
    { params: { merchantId } },
  );
}

export function bindLegacyMerchantAccount(
  merchantId: number,
  accountId: number,
) {
  return requestClient.post(
    '/product/merchant/application/bind-legacy-account',
    { merchantId, accountId },
  );
}
