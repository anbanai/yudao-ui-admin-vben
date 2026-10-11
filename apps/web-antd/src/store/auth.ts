import type { AuthPermissionInfo, Recordable, UserInfo } from '@vben/types';

import type { AuthApi } from '#/api';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { CanceledError } from '@vben/request';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { notification } from 'ant-design-vue';
import { defineStore } from 'pinia';

import {
  getAuthPermissionInfoApi,
  loginApi,
  logoutApi,
  register,
  smsLogin,
  socialLogin,
} from '#/api';
import { getMerchantApplicationMine } from '#/api/mall/product/merchant';
import {
  getMerchantProfile,
  loginMerchant,
  logoutMerchant,
  registerMerchant,
} from '#/api/merchant/auth';
import { $t } from '#/locales';
import { generateAccess } from '#/router/access';
import { canAccessMerchantOperations } from '#/router/merchant-access';
import { removeAccessRoutes } from '#/router/remove-access-routes';
import { accessRoutes } from '#/router/routes';

import { useMerchantSessionStore } from './merchant-session';

export type AuthMode = 'admin' | 'merchant';

const AUTH_MODE_STORAGE_KEY = 'teaworthshare-auth-mode';

function readAuthMode(): AuthMode {
  return localStorage.getItem(AUTH_MODE_STORAGE_KEY) === 'merchant'
    ? 'merchant'
    : 'admin';
}

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const merchantSessionStore = useMerchantSessionStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);
  const authMode = ref<AuthMode>(readAuthMode());
  const sessionVersion = ref(0);
  let merchantMenuSignature = '';

  function setAuthMode(mode: AuthMode) {
    if (mode !== authMode.value) {
      removeAccessRoutes(router, accessStore.accessRoutes);
      merchantMenuSignature = '';
      resetAllStores();
    }
    authMode.value = mode;
    localStorage.setItem(AUTH_MODE_STORAGE_KEY, mode);
  }

  function getActiveAccessToken() {
    return authMode.value === 'merchant'
      ? merchantSessionStore.accessToken
      : accessStore.accessToken;
  }

  async function registerMerchantAccount(params: {
    mobile: string;
    nickname: string;
    password: string;
    username: string;
  }) {
    return registerMerchant(params);
  }

  /**
   * 异步处理登录操作
   * Asynchronously handle the login process
   * @param type 登录类型
   * @param params 登录表单数据
   * @param onSuccess 登录成功后的回调函数
   */
  async function authLogin(
    type: 'mobile' | 'register' | 'social' | 'username',
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    const mode = authMode.value;
    const version = ++sessionVersion.value;
    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      let loginResult: AuthApi.LoginResult;
      loginLoading.value = true;
      if (mode === 'merchant' && type !== 'username') {
        throw new Error('商家账号仅支持账号密码登录');
      }
      if (mode === 'merchant' && type === 'username') {
        loginResult = await loginMerchant({
          username: params.username,
          password: params.password,
        });
      } else
        switch (type) {
          case 'mobile': {
            loginResult = await smsLogin(params as AuthApi.SmsLoginParams);
            break;
          }
          case 'register': {
            loginResult = await register(params as AuthApi.RegisterParams);
            break;
          }
          case 'social': {
            loginResult = await socialLogin(
              params as AuthApi.SocialLoginParams,
            );
            break;
          }
          default: {
            loginResult = await loginApi(params);
          }
        }
      const { accessToken, refreshToken } = loginResult;
      requireCurrentSession(version);

      // 如果成功获取到 accessToken
      if (accessToken) {
        if (mode === 'merchant') {
          merchantSessionStore.setAccessToken(accessToken);
          merchantSessionStore.setRefreshToken(refreshToken);
        } else {
          accessStore.setAccessToken(accessToken);
          accessStore.setRefreshToken(refreshToken);
        }

        // 获取用户信息并存储到 userStore、accessStore 中
        // TODO @芋艿：清理掉 accessCodes 相关的逻辑
        // const [fetchUserInfoResult, accessCodes] = await Promise.all([
        //   fetchUserInfo(),
        //   // getAccessCodesApi(),
        // ]);
        const fetchUserInfoResult = await fetchUserInfo();

        userInfo = fetchUserInfoResult.user;

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          // oxlint-disable-next-line no-unused-expressions
          onSuccess
            ? await onSuccess?.()
            : await router.push(
                userInfo.homePath || preferences.app.defaultHomePath,
              );
        }

        if (userInfo?.nickname) {
          notification.success({
            description: `${$t('authentication.loginSuccessDesc')}:${userInfo?.nickname}`,
            duration: 3,
            message: $t('authentication.loginSuccess'),
          });
        }
      }
    } finally {
      if (sessionVersion.value === version) loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  async function logout(redirect: boolean = true) {
    const version = ++sessionVersion.value;
    try {
      const accessToken = getActiveAccessToken() as string;
      if (accessToken) {
        await (authMode.value === 'merchant'
          ? logoutMerchant(accessToken)
          : logoutApi(accessToken));
      }
    } catch {
      // 不做任何处理
    }
    if (sessionVersion.value !== version) return;
    removeAccessRoutes(router, accessStore.accessRoutes);
    resetAllStores();
    accessStore.setLoginExpired(false);

    // 回登录页带上当前路由地址
    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
            redirect: encodeURIComponent(router.currentRoute.value.fullPath),
          }
        : {},
    });
  }

  async function fetchUserInfo() {
    const version = sessionVersion.value;
    let authPermissionInfo: AuthPermissionInfo | null;
    if (authMode.value === 'merchant') {
      const profile = await getMerchantProfile();
      let merchantApplication: null | {
        merchantStatus?: number;
        status?: number;
        type?: string;
      } = null;
      try {
        merchantApplication = await getMerchantApplicationMine();
      } catch {
        // New merchant accounts do not have an application record yet.
      }
      const profileUser = (profile as any)?.user ?? profile;
      requireCurrentSession(version);
      merchantMenuSignature = `${Boolean(merchantApplication)}:${canAccessMerchantOperations(merchantApplication)}`;
      const displayName =
        profileUser.nickname ??
        profileUser.name ??
        profileUser.account ??
        profileUser.username ??
        profile.merchantName ??
        '商家';
      const merchantChildren = [
        {
          id: -101,
          name: '入驻申请',
          path: 'workbench',
          component: 'mall/merchant/workbench',
          parentId: -100,
          visible: true,
          keepAlive: true,
          sort: 0,
        },
        ...(canAccessMerchantOperations(merchantApplication)
          ? [
              {
                id: -102,
                name: '商品与品牌',
                path: 'products',
                component: 'mall/merchant/operations',
                parentId: -100,
                visible: true,
                keepAlive: true,
                sort: 10,
              },
            ]
          : []),
        ...(merchantApplication
          ? [
              {
                id: -103,
                name: '店铺资料',
                path: 'profile',
                component: 'mall/merchant/profile',
                parentId: -100,
                visible: true,
                keepAlive: true,
                sort: 20,
              },
            ]
          : []),
      ];
      authPermissionInfo = {
        user: {
          ...profileUser,
          avatar: profileUser.avatar,
          homePath: '/merchant/workbench',
          id: profileUser.id ?? profileUser.userId ?? profile.merchantId ?? 0,
          nickname: displayName,
          realName: profileUser.realName ?? profile.merchantName ?? displayName,
          username: profileUser.username ?? profileUser.account ?? '',
        } as UserInfo,
        roles: ['merchant'],
        permissions: [],
        menus: [
          {
            id: -100,
            name: '商家工作台',
            path: 'merchant',
            component: 'Layout',
            parentId: 0,
            visible: true,
            sort: 0,
            children: merchantChildren,
          },
        ] as AuthPermissionInfo['menus'],
      };
    } else {
      authPermissionInfo = await getAuthPermissionInfoApi();
    }
    requireCurrentSession(version);
    // userStore
    userStore.setUserInfo(authPermissionInfo.user);
    userStore.setUserRoles(authPermissionInfo.roles);
    // accessStore
    accessStore.setAccessMenus(authPermissionInfo.menus);
    accessStore.setAccessCodes(authPermissionInfo.permissions);
    return authPermissionInfo;
  }

  async function refreshMerchantAccess() {
    if (authMode.value !== 'merchant') return;
    const previousSignature = merchantMenuSignature;
    const previousMenus = accessStore.accessMenus;
    await fetchUserInfo();
    if (
      accessStore.isAccessChecked &&
      previousSignature === merchantMenuSignature
    ) {
      accessStore.setAccessMenus(previousMenus);
      return;
    }
    removeAccessRoutes(router, accessStore.accessRoutes);
    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      merchant: true,
      roles: ['merchant'],
      router,
      routes: accessRoutes,
    });
    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);
  }

  function $reset() {
    sessionVersion.value++;
    loginLoading.value = false;
    merchantMenuSignature = '';
  }

  function requireCurrentSession(version: number) {
    if (version !== sessionVersion.value) {
      throw new CanceledError('The login session changed');
    }
  }

  return {
    $reset,
    authMode,
    authLogin,
    fetchUserInfo,
    getActiveAccessToken,
    loginLoading,
    logout,
    registerMerchantAccount,
    refreshMerchantAccess,
    sessionVersion,
    setAuthMode,
  };
});
