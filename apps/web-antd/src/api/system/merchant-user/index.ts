import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace SystemMerchantUserApi {
  /** 商家工作台账号 */
  export interface MerchantUser {
    id: number;
    merchantId: number;
    username: string;
    nickname: string;
    email: string;
    mobile: string;
    sex: number;
    avatar: string;
    status: number;
    loginIp: string;
    loginDate?: Date;
    createTime?: Date;
  }

  export interface MerchantUserPageQuery extends PageParam {
    username?: string;
    nickname?: string;
    mobile?: string;
    merchantId?: number;
    status?: number;
    createTime?: [string, string];
  }
}

/** 查询商家账号分页 */
export function getMerchantUserPage(
  params: SystemMerchantUserApi.MerchantUserPageQuery,
) {
  return requestClient.get<PageResult<SystemMerchantUserApi.MerchantUser>>(
    '/system/merchant-user/page',
    { params },
  );
}

/** 更新商家账号状态 */
export function updateMerchantUserStatus(id: number, status: number) {
  return requestClient.put('/system/merchant-user/update-status', {
    id,
    status,
  });
}

/** 重置商家账号密码 */
export function resetMerchantUserPassword(id: number, password: string) {
  return requestClient.put('/system/merchant-user/update-password', {
    id,
    password,
  });
}
