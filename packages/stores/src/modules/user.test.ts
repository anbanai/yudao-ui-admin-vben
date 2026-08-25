import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUserStore } from './user';

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('returns correct userInfo', () => {
    const store = useUserStore();
    const userInfo: any = { name: 'Jane Doe', roles: [{ value: 'user' }] };
    store.setUserInfo(userInfo);
    expect(store.userInfo).toEqual(userInfo);
  });

  it('manages user info and roles independently', () => {
    const store = useUserStore();
    store.setUserRoles(['user']);

    store.setUserInfo({ name: 'Jane Doe' } as any);
    expect(store.userInfo).not.toBeNull();
    expect(store.userRoles).toEqual(['user']);

    store.setUserInfo(null);
    expect(store.userInfo).toBeNull();
    expect(store.userRoles).toEqual(['user']);

    store.setUserInfo({ name: 'John Doe' } as any);
    store.setUserRoles(['admin']);
    expect(store.userInfo).toEqual({ name: 'John Doe' });
    expect(store.userRoles).toEqual(['admin']);
  });

  it('resets user info and roles together', () => {
    const store = useUserStore();
    store.setUserInfo({ name: 'Jane Doe' } as any);
    store.setUserRoles(['user']);

    store.$reset();

    expect(store.userInfo).toBeNull();
    expect(store.userRoles).toEqual([]);
  });

  // 测试在没有用户角色时返回空数组
  it('returns an empty array for userRoles if not set', () => {
    const store = useUserStore();
    expect(store.userRoles).toEqual([]);
  });
});
