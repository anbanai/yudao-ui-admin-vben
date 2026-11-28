import { createMemoryHistory, createRouter } from 'vue-router';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createRouterGuard } from '#/router/guard';

import { useAuthStore } from './auth';
import { useMerchantSessionStore } from './merchant-session';

const mocks = vi.hoisted(() => ({
  access: {
    accessMenus: [] as any[],
    accessRoutes: [] as any[],
    accessToken: null as null | string,
    isAccessChecked: false,
    loginExpired: false,
    refreshToken: null as null | string,
    setAccessCodes: vi.fn(),
    setAccessMenus: vi.fn(),
    setAccessRoutes: vi.fn(),
    setAccessToken: vi.fn(),
    setIsAccessChecked: vi.fn(),
    setLoginExpired: vi.fn(),
    setRefreshToken: vi.fn(),
    setTenantId: vi.fn(),
    tenantId: null as null | number,
  },
  adminPermissions: vi.fn(),
  adminLogin: vi.fn(),
  application: vi.fn(),
  generate: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  profile: vi.fn(),
  selectPlatform: vi.fn(),
  reset: vi.fn(),
  router: null as any,
  setDictCacheByApi: vi.fn(),
  user: { setUserInfo: vi.fn(), setUserRoles: vi.fn() },
}));

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => mocks.router,
}));
vi.mock('@vben/stores', () => ({
  resetAllStores: mocks.reset,
  useAccessStore: () => mocks.access,
  useDictStore: () => ({ setDictCacheByApi: mocks.setDictCacheByApi }),
  useUserStore: () => mocks.user,
}));
vi.mock('@vben/preferences', () => ({
  preferences: {
    app: { defaultHomePath: '/dashboard' },
    transition: { progress: false },
  },
}));
vi.mock('ant-design-vue', () => ({
  message: { loading: () => vi.fn() },
  notification: { success: vi.fn() },
}));
vi.mock('#/api', () => ({
  getAuthPermissionInfoApi: mocks.adminPermissions,
  loginApi: mocks.adminLogin,
  logoutApi: vi.fn(),
  register: vi.fn(),
  smsLogin: vi.fn(),
  socialLogin: vi.fn(),
}));
vi.mock('#/api/system/dict/data', () => ({ getSimpleDictDataList: vi.fn() }));
vi.mock('#/api/mall/product/merchant', () => ({
  MerchantStatus: { APPROVED: 20 },
  getMerchantApplicationMine: mocks.application,
}));
vi.mock('#/api/merchant/auth', () => ({
  getMerchantProfile: mocks.profile,
  loginMerchant: mocks.login,
  logoutMerchant: mocks.logout,
  registerMerchant: vi.fn(),
  selectMerchantPlatform: mocks.selectPlatform,
}));
vi.mock('#/locales', () => ({ $t: (key: string) => key }));
vi.mock('#/router/access', () => ({ generateAccess: mocks.generate }));
vi.mock('#/router/routes', () => ({
  accessRoutes: [],
  coreRouteNames: ['Login', 'Root'],
}));

describe('authentication lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('teaworthshare-auth-mode', 'merchant');
    setActivePinia(createPinia());
    mocks.router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { name: 'Root', path: '/', redirect: '/dashboard', children: [] },
        { component: {}, name: 'Dashboard', path: '/dashboard' },
        { component: {}, name: 'Login', path: '/auth/login' },
        { component: {}, name: 'Workbench', path: '/merchant/workbench' },
      ],
    });
    mocks.access.accessMenus = [];
    mocks.access.accessRoutes = [];
    mocks.access.accessToken = null;
    mocks.access.isAccessChecked = false;
    mocks.access.loginExpired = false;
    mocks.access.refreshToken = null;
    mocks.access.tenantId = null;
    mocks.access.setAccessMenus.mockImplementation((value) => {
      mocks.access.accessMenus = value;
    });
    mocks.access.setAccessRoutes.mockImplementation((value) => {
      mocks.access.accessRoutes = value;
    });
    mocks.access.setIsAccessChecked.mockImplementation((value) => {
      mocks.access.isAccessChecked = value;
    });
    mocks.access.setLoginExpired.mockImplementation((value) => {
      mocks.access.loginExpired = value;
    });
    mocks.access.setAccessToken.mockImplementation((value) => {
      mocks.access.accessToken = value;
    });
    mocks.access.setRefreshToken.mockImplementation((value) => {
      mocks.access.refreshToken = value;
    });
    mocks.access.setTenantId.mockImplementation((value) => {
      mocks.access.tenantId = value;
    });
    mocks.reset.mockImplementation(() => {
      useAuthStore().$reset();
      useMerchantSessionStore().$reset();
      mocks.access.accessMenus = [];
      mocks.access.accessRoutes = [];
      mocks.access.accessToken = null;
      mocks.access.isAccessChecked = false;
      mocks.access.refreshToken = null;
      mocks.access.tenantId = null;
    });
    mocks.login.mockResolvedValue({
      accessToken: 'new',
      refreshToken: 'refresh',
    });
    mocks.logout.mockResolvedValue(undefined);
    mocks.profile.mockResolvedValue({ id: 1, nickname: '商家' });
    mocks.application.mockResolvedValue({ merchantStatus: 20 });
    mocks.generate.mockResolvedValue({
      accessibleMenus: [],
      accessibleRoutes: [],
    });
  });

  it('replaces the unscoped merchant tokens after platform selection', async () => {
    const merchant = useMerchantSessionStore();
    merchant.setAccessToken('unscoped');
    merchant.setRefreshToken('unscoped-refresh');
    mocks.selectPlatform.mockResolvedValue({
      accessToken: 'platform-access',
      refreshToken: 'platform-refresh',
    });
    const auth = useAuthStore();

    await auth.confirmMerchantPlatform(7);

    expect(merchant.accessToken).toBe('platform-access');
    expect(merchant.refreshToken).toBe('platform-refresh');
  });

  it('skips tenant-scoped application requests until the merchant chooses a platform', async () => {
    mocks.profile.mockResolvedValueOnce({
      id: 1,
      onboardingPlatforms: [{ id: 7, name: '好茶引力', recommended: true }],
    });
    const auth = useAuthStore();
    await auth.fetchUserInfo();
    expect(mocks.application).not.toHaveBeenCalled();
    expect(auth.onboardingPlatforms?.[0]?.id).toBe(7);
  });

  it('returns a saved merchant session with a forbidden profile to login on startup', async () => {
    const merchant = useMerchantSessionStore();
    merchant.setAccessToken('saved-access');
    merchant.setRefreshToken('saved-refresh');
    mocks.profile.mockRejectedValueOnce({ code: 403, msg: '没有该操作权限' });
    createRouterGuard(mocks.router);
    mocks.router.onError(() => {});

    await mocks.router.push('/');

    expect(mocks.router.currentRoute.value.path).toBe('/auth/login');
    expect(merchant.accessToken).toBeNull();
    expect(merchant.refreshToken).toBeNull();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('returns a saved administrator session with forbidden permissions to login', async () => {
    useAuthStore().setAuthMode('admin');
    mocks.access.accessToken = 'saved-admin';
    mocks.adminPermissions.mockRejectedValueOnce({ code: 403 });
    createRouterGuard(mocks.router);
    mocks.router.onError(() => {});

    await mocks.router.push('/dashboard');

    expect(mocks.router.currentRoute.value.path).toBe('/auth/login');
    expect(mocks.access.accessToken).toBeNull();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.setDictCacheByApi).not.toHaveBeenCalled();
  });

  it('discards newly issued tokens when the first profile request is forbidden', async () => {
    const merchant = useMerchantSessionStore();
    mocks.profile.mockRejectedValueOnce({ code: 403 });

    await expect(
      useAuthStore().authLogin('username', {}),
    ).rejects.toMatchObject({
      code: 403,
    });

    expect(merchant.accessToken).toBeNull();
    expect(merchant.refreshToken).toBeNull();
  });

  it('returns to the login page if the login-expired modal receives forbidden permissions', async () => {
    await mocks.router.push('/merchant/workbench');
    mocks.access.loginExpired = true;
    mocks.profile.mockRejectedValueOnce({ code: 403 });

    await expect(useAuthStore().authLogin('username', {})).rejects.toEqual({
      code: 403,
    });

    expect(mocks.router.currentRoute.value.path).toBe('/auth/login');
    expect(mocks.access.loginExpired).toBe(false);
  });

  it('keeps the selected administrator login tenant so the form can retry a forbidden login', async () => {
    const auth = useAuthStore();
    auth.setAuthMode('admin');
    mocks.access.setTenantId(42);
    mocks.adminLogin.mockImplementation(async () => {
      expect(mocks.access.tenantId).toBe(42);
      return { accessToken: 'admin-access', refreshToken: 'admin-refresh' };
    });
    mocks.adminPermissions
      .mockRejectedValueOnce({ code: 403 })
      .mockResolvedValueOnce({
        user: { id: 1 },
        roles: [],
        menus: [],
        permissions: [],
      });

    await expect(auth.authLogin('username', {})).rejects.toEqual({ code: 403 });
    expect(mocks.access.accessToken).toBeNull();
    expect(mocks.access.refreshToken).toBeNull();

    await expect(auth.authLogin('username', {}, () => {})).resolves.toEqual({
      userInfo: { id: 1 },
    });
  });

  it('preserves a new login when an earlier profile request returns forbidden', async () => {
    const auth = useAuthStore();
    let rejectProfile!: (error: object) => void;
    const requested = new Promise<void>((resolve) => {
      mocks.profile.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectProfile = reject;
            resolve();
          }),
      );
    });
    mocks.login.mockResolvedValueOnce({
      accessToken: 'old',
      refreshToken: 'old-refresh',
    });
    const pending = auth.authLogin('username', {});
    await requested;
    await auth.authLogin('username', {}, () => {});
    rejectProfile({ code: 403 });

    await expect(pending).rejects.toEqual({ code: 403 });
    expect(useMerchantSessionStore().accessToken).toBe('new');
    expect(mocks.reset).not.toHaveBeenCalled();
  });

  it('shows fulfillment menus to operating merchants and hides them after freezing', async () => {
    const auth = useAuthStore();
    await auth.fetchUserInfo();
    expect(mocks.access.accessMenus[0].children).toContainEqual(
      expect.objectContaining({ path: 'sf-settings' }),
    );
    expect(mocks.access.accessMenus[0].children).toContainEqual(
      expect.objectContaining({ path: 'orders' }),
    );
    mocks.application.mockResolvedValue({ merchantStatus: 40 });
    await auth.fetchUserInfo();
    expect(mocks.access.accessMenus[0].children).not.toContainEqual(
      expect.objectContaining({ path: 'sf-settings' }),
    );
    expect(mocks.access.accessMenus[0].children).not.toContainEqual(
      expect.objectContaining({ path: 'orders' }),
    );
  });

  it('keeps the current menu and routes when approval status is unchanged', async () => {
    const auth = useAuthStore();
    await auth.fetchUserInfo();
    const menus = [{ name: 'Converted menu' }];
    mocks.access.accessMenus = menus;
    mocks.access.isAccessChecked = true;
    await auth.refreshMerchantAccess();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.access.accessMenus).toBe(menus);
  });

  it('rebuilds menus to revoke operating routes after freezing', async () => {
    const auth = useAuthStore();
    await auth.fetchUserInfo();
    mocks.access.isAccessChecked = true;
    mocks.application.mockResolvedValue({ merchantStatus: 40 });
    await auth.refreshMerchantAccess();
    expect(mocks.generate).toHaveBeenCalledOnce();
  });

  it('does not install merchant tokens after switching to administrator login', async () => {
    const auth = useAuthStore();
    let finish!: (value: object) => void;
    mocks.login.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const pending = auth.authLogin('username', {});
    auth.setAuthMode('admin');
    finish({ accessToken: 'old', refreshToken: 'old-refresh' });
    await expect(pending).rejects.toThrow(/session changed/);
    expect(useMerchantSessionStore().accessToken).toBeNull();
    expect(mocks.access.setAccessToken).not.toHaveBeenCalled();
  });

  it('ignores an old profile response after resetting the session', async () => {
    const auth = useAuthStore();
    let finish!: (value: object) => void;
    mocks.profile.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const pending = auth.fetchUserInfo();
    auth.$reset();
    finish({ id: 2, nickname: '旧商家' });
    await expect(pending).rejects.toThrow(/session changed/);
    expect(mocks.user.setUserInfo).not.toHaveBeenCalled();
  });

  it('preserves a new login when an earlier logout request finishes', async () => {
    const auth = useAuthStore();
    useMerchantSessionStore().setAccessToken('old');
    let finish!: () => void;
    mocks.logout.mockReturnValue(
      new Promise<void>((resolve) => (finish = resolve)),
    );
    const pending = auth.logout();
    await auth.authLogin('username', {}, () => {});
    finish();
    await pending;
    expect(useMerchantSessionStore().accessToken).toBe('new');
    expect(mocks.reset).not.toHaveBeenCalled();
  });
});
