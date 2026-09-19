import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getWxaQrcode } from './index';

const requestMocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({
  requestClient: { post: requestMocks.post },
}));

describe('小程序码 API', () => {
  beforeEach(() => requestMocks.post.mockReset());

  it('调用 App API 并规范化 base64', async () => {
    requestMocks.post.mockResolvedValue('iVBORw0KGgoAAA');

    await expect(
      getWxaQrcode({
        path: 'pages/index/index',
        scene: 'spm=0.2.88.3.2',
        width: 280,
      }),
    ).resolves.toBe('data:image/png;base64,iVBORw0KGgoAAA');

    expect(requestMocks.post).toHaveBeenCalledWith(
      `${import.meta.env.VITE_BASE_URL}/app-api/member/social-user/wxa-qrcode`,
      {
        autoColor: true,
        checkPath: false,
        hyaline: false,
        path: 'pages/index/index',
        scene: 'spm=0.2.88.3.2',
        width: 280,
      },
    );
  });
});
