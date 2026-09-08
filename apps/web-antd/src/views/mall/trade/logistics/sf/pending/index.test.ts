import { createApp } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import PendingOrdersRedirect from './index.vue';

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => routerMocks,
}));

describe('legacy SF pending orders route', () => {
  let app: ReturnType<typeof createApp> | undefined;
  let host: HTMLDivElement | undefined;

  afterEach(() => {
    app?.unmount();
    host?.remove();
    app = undefined;
    host = undefined;
    vi.clearAllMocks();
  });

  it('redirects to the paginated order list', async () => {
    host = document.createElement('div');
    document.body.append(host);
    app = createApp(PendingOrdersRedirect);
    app.mount(host);

    await vi.waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith({
        path: '/mall/trade/order',
      });
    });
  });
});
