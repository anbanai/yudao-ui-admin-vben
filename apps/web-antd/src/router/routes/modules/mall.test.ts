import { createMemoryHistory, createRouter } from 'vue-router';

import { describe, expect, it } from 'vitest';

import mallRoutes from './mall';

describe('mall compatibility routes', () => {
  it('redirects the removed SF pending workbench to the order list', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        ...mallRoutes,
        {
          path: '/mall/trade/order',
          component: { template: '<div>orders</div>' },
        },
      ],
    });

    await router.push('/mall/trade/logistics/pending');

    expect(router.currentRoute.value.fullPath).toBe('/mall/trade/order');
  });
});
