import { createApp } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import { useAccessStore } from './modules/access';
import { useUserStore } from './modules/user';
import { initStores, resetAllStores } from './setup';

vi.mock('secure-ls', () => ({
  default: class SecureLSTestDouble {
    get() {
      return null;
    }

    set() {}
  },
}));

describe('resetAllStores', () => {
  it('resets every initialized store during logout cleanup', async () => {
    const app = createApp({ template: '<div />' });
    await initStores(app, { namespace: 'reset-all-stores-test' });
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    accessStore.setAccessToken('access-token');
    userStore.setUserInfo({ name: 'Jane Doe' } as any);
    userStore.setUserRoles(['admin']);

    resetAllStores();

    expect(accessStore.accessToken).toBeNull();
    expect(userStore.userInfo).toBeNull();
    expect(userStore.userRoles).toEqual([]);
  });
});
