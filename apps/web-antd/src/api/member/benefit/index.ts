import type { PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace MemberBenefitApi {
  export interface Definition {
    id?: number;
    code: string;
    name: string;
    type: number;
    description?: string;
    icon?: string;
    actionType: number;
    couponTemplateId?: number;
    status: number;
    sort: number;
  }

  export interface LevelBinding {
    id?: number;
    levelId: number;
    benefitId: number;
    quantity: number;
    periodType: number;
    claimType: number;
    validityDays?: number;
    status: number;
    sort: number;
  }

  export interface UserAccount {
    id: number;
    userId: number;
    levelId: number;
    benefitId: number;
    periodStart: string;
    periodEnd: string;
    grantedQuantity: number;
    availableQuantity: number;
    usedQuantity: number;
    claimStatus: number;
    status: number;
  }

  export interface Ledger {
    id: number;
    userId: number;
    accountId: number;
    benefitId: number;
    eventType: number;
    quantity: number;
    bizId?: string;
    reason?: string;
    operatorId?: number;
    createTime?: string;
  }
}

export function getBenefitDefinitions() {
  return requestClient.get<MemberBenefitApi.Definition[]>(
    '/member/benefit/definition/list',
  );
}

export function createBenefitDefinition(data: MemberBenefitApi.Definition) {
  return requestClient.post('/member/benefit/definition/create', data);
}

export function updateBenefitDefinition(data: MemberBenefitApi.Definition) {
  return requestClient.put('/member/benefit/definition/update', data);
}

export function deleteBenefitDefinition(id: number) {
  return requestClient.delete(`/member/benefit/definition/delete?id=${id}`);
}

export function getLevelBenefitBindings(levelId?: number) {
  return requestClient.get<MemberBenefitApi.LevelBinding[]>(
    '/member/benefit/level-binding/list',
    {
      params: { levelId },
    },
  );
}

export function saveLevelBenefitBinding(data: MemberBenefitApi.LevelBinding) {
  return requestClient.post('/member/benefit/level-binding/save', data);
}

export function deleteLevelBenefitBinding(id: number) {
  return requestClient.delete(`/member/benefit/level-binding/delete?id=${id}`);
}

export function getBenefitAccounts(userId?: number) {
  return requestClient.get<MemberBenefitApi.UserAccount[]>(
    '/member/benefit/account/list',
    {
      params: { userId },
    },
  );
}

export function getBenefitAccountPage(params: {
  pageNo: number;
  pageSize: number;
  userId?: number;
}) {
  return requestClient.get<PageResult<MemberBenefitApi.UserAccount>>(
    '/member/benefit/account/page',
    { params },
  );
}

export function getBenefitLedgers(userId?: number, accountId?: number) {
  return requestClient.get<MemberBenefitApi.Ledger[]>(
    '/member/benefit/ledger/list',
    {
      params: { userId, accountId },
    },
  );
}

export function getBenefitLedgerPage(params: {
  accountId?: number;
  pageNo: number;
  pageSize: number;
  userId?: number;
}) {
  return requestClient.get<PageResult<MemberBenefitApi.Ledger>>(
    '/member/benefit/ledger/page',
    { params },
  );
}

export function grantBenefitAccount(data: {
  accountId: number;
  bizId: string;
  quantity: number;
  reason: string;
}) {
  return requestClient.post('/member/benefit/account/grant', data);
}

export function revokeBenefitAccount(data: {
  accountId: number;
  bizId: string;
  reason: string;
}) {
  return requestClient.post('/member/benefit/account/revoke', data);
}

export function adjustBenefitAccount(data: {
  accountId: number;
  bizId: string;
  quantity: number;
  reason: string;
}) {
  return requestClient.post('/member/benefit/account/adjust', data);
}
