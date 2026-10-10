import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace MerchantOnboardingApi {
  export interface Task {
    onboardingId: number;
    merchantId: number;
    merchantName?: string;
    merchantApprovalTime?: string;
    businessRole: 'SETTLED_MERCHANT' | 'SHARE_MERCHANT';
    state: string;
    materialsVersion: number;
    onboardingStatus?: number;
    attemptCount: number;
    nextRetryTime?: string;
    lastError?: string;
    missingMaterials?: string[];
    signUrl?: string;
    authUrl?: string;
  }

  export interface PageQuery extends PageParam {
    merchantId?: number;
    onboardingId?: number;
    state?: string;
  }

  export interface Materials {
    onboardingId: number;
    businessRole: Task['businessRole'];
    materials: Record<string, unknown>;
    fileReferences: Record<string, number>;
  }
}

const prefix = '/product/merchant/pay-onboarding';

export function getMerchantOnboardingPage(
  params: MerchantOnboardingApi.PageQuery,
) {
  return requestClient.get<PageResult<MerchantOnboardingApi.Task>>(
    `${prefix}/page`,
    {
      params,
    },
  );
}

export function getMerchantOnboarding(onboardingId: number) {
  return requestClient.get<MerchantOnboardingApi.Task>(`${prefix}/get`, {
    params: { onboardingId },
  });
}

export function enqueueMerchantOnboarding(merchantId: number) {
  return requestClient.post<number>(`${prefix}/enqueue`, undefined, {
    params: { merchantId },
  });
}

export function saveMerchantOnboardingMaterials(
  data: MerchantOnboardingApi.Materials,
) {
  return requestClient.post<boolean>(`${prefix}/materials`, data);
}

export function uploadMerchantPrivateFile(onboardingId: number, file: File) {
  return requestClient.upload<number>(`${prefix}/private-file`, {
    onboardingId,
    file,
  });
}
