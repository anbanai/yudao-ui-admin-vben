import { createMemoryHistory, createRouter } from 'vue-router';

import { describe, expect, it } from 'vitest';

import { removeAccessRoutes } from './remove-access-routes';

describe('identity route cleanup', () => {
  it('removes saved dynamic children before the root is re-registered', () => {
    const component = { template: '<div />' };
    const adminRoute = { name: 'AdminProducts', path: 'mall', component };
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          name: 'Root',
          path: '/',
          component,
          children: [{ name: 'CoreHome', path: 'home', component }, adminRoute],
        },
      ],
    });
    removeAccessRoutes(router, [adminRoute]);
    const root = router.getRoutes().find((route) => route.name === 'Root')!;
    router.addRoute({
      ...root,
      children: [
        ...root.children,
        { name: 'MerchantWorkbench', path: 'merchant/workbench', component },
      ],
    });
    expect(router.hasRoute('AdminProducts')).toBe(false);
    expect(router.hasRoute('CoreHome')).toBe(true);
    expect(router.hasRoute('MerchantWorkbench')).toBe(true);
  });
});
