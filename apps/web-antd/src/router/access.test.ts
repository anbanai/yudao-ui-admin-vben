import { createMemoryHistory, createRouter } from 'vue-router';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  access: { accessMenus: [] as any[] },
  preferences: { app: { accessMode: 'backend' } },
  tabbar: { tabs: [] as any[], _bulkCloseByKeys: vi.fn() },
}));

vi.mock('@vben/preferences', () => ({ preferences: mocks.preferences }));
vi.mock('@vben/stores', () => ({
  getTabKey: (tab: { path: string }) => tab.path,
  useAccessStore: () => mocks.access,
  useTabbarStore: () => mocks.tabbar,
}));
vi.mock('#/layouts', () => ({ BasicLayout: {}, IFrameView: {} }));

import { generateAccess } from './access';

describe('merchant route generation', () => {
  beforeEach(() => {
    mocks.tabbar.tabs = [
      { path: '/dashboard/analytics', meta: { affixTab: true } },
      { path: '/merchant/products' },
      { path: '/merchant/workbench' },
    ];
    mocks.tabbar._bulkCloseByKeys.mockClear();
    mocks.tabbar._bulkCloseByKeys.mockImplementation(async (keys: string[]) => {
      mocks.tabbar.tabs = mocks.tabbar.tabs.filter(
        (tab) => !keys.includes(tab.path),
      );
    });
    mocks.access.accessMenus = [
      {
        id: -100,
        name: '商家工作台',
        path: '/merchant',
        visible: true,
        children: [
          {
            id: -101,
            name: '入驻申请',
            path: 'workbench',
            component: 'mall/merchant/workbench',
            parentId: -100,
            visible: true,
          },
        ],
      },
    ];
  });

  it.each(['backend', 'frontend', 'mixed'])(
    'excludes platform routes in %s mode',
    async (mode) => {
      mocks.preferences.app.accessMode = mode;
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ name: 'Root', path: '/', component: {}, children: [] }],
      });
      const { accessibleMenus } = await generateAccess({
        merchant: true,
        roles: ['merchant'],
        router,
        routes: [
          {
            name: 'PlatformFunds',
            path: '/pay/fund',
            component: {},
            meta: { title: '资金运营' },
          },
        ],
      });
      expect(router.hasRoute('PlatformFunds')).toBe(false);
      expect(router.resolve('/merchant/workbench').matched).toHaveLength(3);
      expect(accessibleMenus.map((item) => item.path)).toEqual(['/merchant']);
      expect(mocks.tabbar.tabs.map((tab) => tab.path)).toEqual([
        '/merchant/workbench',
      ]);
    },
  );
});
