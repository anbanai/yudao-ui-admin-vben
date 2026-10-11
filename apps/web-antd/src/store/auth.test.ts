import { createMemoryHistory, createRouter } from 'vue-router';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  },
  application: vi.fn(),
  generate: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  profile: vi.fn(),
  reset: vi.fn(),
  router: null as any,
  user: { setUserInfo: vi.fn(), setUserRoles: vi.fn() },
}));

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => mocks.router,
}));
vi.mock('@vben/stores', () => ({
  resetAllStores: mocks.reset,
  useAccessStore: () => mocks.access,
  useUserStore: () => mocks.user,
}));
vi.mock('@vben/preferences', () => ({
  preferences: { app: { defaultHomePath: '/dashboard' } },
}));
vi.mock('ant-design-vue', () => ({ notification: { success: vi.fn() } }));
vi.mock('#/api', () => ({
  getAuthPermissionInfoApi: vi.fn(),
  loginApi: vi.fn(),
  logoutApi: vi.fn(),
  register: vi.fn(),
  smsLogin: vi.fn(),
  socialLogin: vi.fn(),
}));
vi.mock('#/api/mall/product/merchant', () => ({
  MerchantStatus: { APPROVED: 20 },
  getMerchantApplicationMine: mocks.application,
}));
vi.mock('#/api/merchant/auth', () => ({
  getMerchantProfile: mocks.profile,
  loginMerchant: mocks.login,
  logoutMerchant: mocks.logout,
  registerMerchant: vi.fn(),
}));
vi.mock('#/locales', () => ({ $t: (key: string) => key }));
vi.mock('#/router/access', () => ({ generateAccess: mocks.generate }));
vi.mock('#/router/routes', () => ({ accessRoutes: [] }));

import { useAuthStore } from './auth';
import { useMerchantSessionStore } from './merchant-session';

describe('merchant authentication lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('teaworthshare-auth-mode', 'merchant');
    setActivePinia(createPinia());
    mocks.router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { component: {}, name: 'Root', path: '/', children: [] },
        { component: {}, name: 'Login', path: '/auth/login' },
        { component: {}, name: 'Workbench', path: '/merchant/workbench' },
      ],
    });
    mocks.access.accessMenus = [];
    mocks.access.accessRoutes = [];
    mocks.access.isAccessChecked = false;
    mocks.access.loginExpired = false;
    mocks.access.setAccessMenus.mockImplementation((value) => {
      mocks.access.accessMenus = value;
    });
    mocks.access.setAccessRoutes.mockImplementation((value) => {
      mocks.access.accessRoutes = value;
    });
    mocks.access.setIsAccessChecked.mockImplementation((value) => {
      mocks.access.isAccessChecked = value;
    });
    mocks.reset.mockImplementation(() => {
      useAuthStore().$reset();
      useMerchantSessionStore().$reset();
      mocks.access.accessMenus = [];
      mocks.access.accessRoutes = [];
      mocks.access.isAccessChecked = false;
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
