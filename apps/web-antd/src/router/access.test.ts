import { createMemoryHistory, createRouter } from 'vue-router';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateAccess } from './access';
import infraRoutes from './routes/modules/infra';
import memberRoutes from './routes/modules/member';

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
vi.mock('#/views/infra/share-cover/index.vue', () => ({
  default: { name: 'ShareCoverTestView' },
}));

it('keeps share cover and member import inside their server menu directories', async () => {
  mocks.preferences.app.accessMode = 'backend';
  mocks.access.accessMenus = [
    {
      id: 1,
      name: '商城',
      path: '/mall',
      parentId: 0,
      visible: true,
      children: [
        {
          id: 2,
          name: '营销中心',
          path: 'promotion',
          parentId: 1,
          visible: true,
          children: [
            {
              id: 3,
              name: '小程序分享封面',
              path: 'share-cover',
              parentId: 2,
              component: 'infra/share-cover/index',
              componentName: 'InfraShareCover',
              visible: true,
            },
          ],
        },
      ],
    },
    {
      id: 4,
      name: '会员中心',
      path: '/member',
      parentId: 0,
      visible: true,
      children: [
        {
          id: 5,
          name: '有赞客户积分导入',
          path: 'youzan-import',
          parentId: 4,
          component: 'member/youzan-import/index',
          componentName: 'MemberYouzanImport',
          visible: true,
        },
      ],
    },
  ];
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ name: 'Root', path: '/', component: {}, children: [] }],
  });
  const { accessibleMenus } = await generateAccess({
    roles: [],
    router,
    routes: [...infraRoutes, ...memberRoutes],
  });
  expect(accessibleMenus.map((menu) => menu.path)).toEqual([
    '/mall',
    '/member',
  ]);
  expect(accessibleMenus[0]?.children?.[0]?.children?.[0]?.path).toBe(
    '/mall/promotion/share-cover',
  );
  expect(accessibleMenus[1]?.children?.[0]?.path).toBe('/member/youzan-import');
  await router.push('/infra/share-cover?tab=config');
  expect(router.currentRoute.value.fullPath).toBe(
    '/mall/promotion/share-cover?tab=config',
  );
  expect(router.currentRoute.value.matched.at(-1)?.components?.default).toEqual(
    expect.objectContaining({ name: 'ShareCoverTestView' }),
  );
});

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
