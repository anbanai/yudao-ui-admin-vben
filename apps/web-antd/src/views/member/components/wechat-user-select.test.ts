import { createApp, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import WechatUserSelect from './wechat-user-select.vue';

const apiMocks = vi.hoisted(() => ({
  getMemberUserPage: vi.fn(),
  getSocialUserPage: vi.fn(),
}));

vi.mock('#/api/member/user', () => ({
  getUserPage: apiMocks.getMemberUserPage,
}));

vi.mock('#/api/system/social/user', () => ({
  getSocialUserPage: apiMocks.getSocialUserPage,
}));

describe('wechat user select', () => {
  const mountedApps: Array<ReturnType<typeof createApp>> = [];

  beforeEach(() => {
    apiMocks.getMemberUserPage.mockReset();
    apiMocks.getSocialUserPage.mockReset();
    apiMocks.getMemberUserPage.mockResolvedValue({ list: [], total: 0 });
    apiMocks.getSocialUserPage.mockResolvedValue({
      list: [
        {
          avatar: 'https://example.com/avatar.png',
          nickname: 'Tea Printer',
          openid: 'wx-openid',
          type: 1,
        },
      ],
      total: 1,
    });
  });

  afterEach(() => {
    for (const app of mountedApps) {
      app.unmount();
    }
    mountedApps.length = 0;
    document.body.innerHTML = '';
  });

  it('loads selectable printers from the mini-program social-user API', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp(WechatUserSelect);
    mountedApps.push(app);
    const component = app.mount(host) as unknown as {
      userMap: Map<string, unknown>;
    };

    await nextTick();
    await Promise.resolve();
    await nextTick();

    expect(apiMocks.getSocialUserPage).toHaveBeenCalledWith({
      pageNo: 1,
      pageSize: 50,
      type: 1,
    });
    expect(apiMocks.getMemberUserPage).not.toHaveBeenCalled();
    expect(component.userMap.has('wx-openid')).toBe(true);
  });
});
