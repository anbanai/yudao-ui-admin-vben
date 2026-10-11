import type { AuthApi } from '#/api/core/auth';

import {
  merchantBaseRequestClient,
  merchantRequestClient,
} from '#/api/request';

export namespace MerchantAuthApi {
  export interface RegisterParams {
    username: string;
    nickname: string;
    mobile: string;
    password: string;
  }

  export interface LoginParams {
    username: string;
    password: string;
  }

  export interface LoginResult extends AuthApi.LoginResult {
    merchantId: number;
    userType: number | string;
  }

  export interface Profile {
    account?: string;
    avatar?: string;
    email?: string;
    id?: number;
    merchantId?: number;
    merchantName?: string;
    name?: string;
    nickname?: string;
    realName?: string;
    userId?: number;
    username?: string;
  }
}

export function registerMerchant(data: MerchantAuthApi.RegisterParams) {
  return merchantRequestClient.post<MerchantAuthApi.LoginResult>(
    '/system/auth/register',
    data,
  );
}

export function loginMerchant(data: MerchantAuthApi.LoginParams) {
  return merchantRequestClient.post<MerchantAuthApi.LoginResult>(
    '/system/auth/login',
    data,
    { headers: { isEncrypt: false } },
  );
}

export function getMerchantProfile() {
  return merchantRequestClient.get<MerchantAuthApi.Profile>(
    '/system/auth/profile',
  );
}

export function logoutMerchant(accessToken: string) {
  return merchantBaseRequestClient.post(
    '/system/auth/logout',
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}
