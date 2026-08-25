import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const appRoot = resolve(process.cwd(), 'apps/web-antd');
const diyEditorRoot = resolve(
  appRoot,
  'src/views/mall/promotion/components/diy-editor',
);
const ossBaseUrl = 'https://teaworthshare.oss-cn-chengdu.aliyuncs.com';
const diyAssetBaseUrl = `${ossBaseUrl}/mall/diy`;

const expectedAssets = {
  appNavBarMp: `${diyAssetBaseUrl}/app-nav-bar-mp.png`,
  banner01: `${diyAssetBaseUrl}/banner-01.jpg`,
  banner02: `${diyAssetBaseUrl}/banner-02.jpg`,
  noticeIcon: `${diyAssetBaseUrl}/notice-icon.png`,
  statusBar: `${diyAssetBaseUrl}/statusBar.png`,
  tabbar1Active: `${diyAssetBaseUrl}/tabbar-1-active.png`,
  tabbar1Default: `${diyAssetBaseUrl}/tabbar-1-default.png`,
  tabbar2Active: `${diyAssetBaseUrl}/tabbar-2-active.png`,
  tabbar2Default: `${diyAssetBaseUrl}/tabbar-2-default.png`,
  tabbar3Active: `${diyAssetBaseUrl}/tabbar-3-active.png`,
  tabbar3Default: `${diyAssetBaseUrl}/tabbar-3-default.png`,
  tabbar4Active: `${diyAssetBaseUrl}/tabbar-4-active.png`,
  tabbar4Default: `${diyAssetBaseUrl}/tabbar-4-default.png`,
  userCoupon: `${diyAssetBaseUrl}/user-coupon.png`,
  userOrder: `${diyAssetBaseUrl}/user-order.png`,
  userWallet: `${diyAssetBaseUrl}/user-wallet.png`,
};

const legacyAssets = {
  'http://mall.yudao.iocoder.cn/static/images/1-001.png':
    expectedAssets.tabbar1Default,
  'http://mall.yudao.iocoder.cn/static/images/1-002.png':
    expectedAssets.tabbar1Active,
  'http://mall.yudao.iocoder.cn/static/images/2-001.png':
    expectedAssets.tabbar2Default,
  'http://mall.yudao.iocoder.cn/static/images/2-002.png':
    expectedAssets.tabbar2Active,
  'http://mall.yudao.iocoder.cn/static/images/3-001.png':
    expectedAssets.tabbar3Default,
  'http://mall.yudao.iocoder.cn/static/images/3-002.png':
    expectedAssets.tabbar3Active,
  'http://mall.yudao.iocoder.cn/static/images/4-001.png':
    expectedAssets.tabbar4Default,
  'http://mall.yudao.iocoder.cn/static/images/4-002.png':
    expectedAssets.tabbar4Active,
  'http://mall.yudao.iocoder.cn/static/images/xinjian.png':
    expectedAssets.noticeIcon,
  'https://static.iocoder.cn/mall/banner-01.jpg': expectedAssets.banner01,
  'https://static.iocoder.cn/mall/banner-02.jpg': expectedAssets.banner02,
};

const consumerPaths = [
  'index.vue',
  'components/mobile/carousel/config.ts',
  'components/mobile/navigation-bar/components/cell-property.vue',
  'components/mobile/navigation-bar/index.vue',
  'components/mobile/notice-bar/config.ts',
  'components/mobile/tab-bar/config.ts',
  'components/mobile/user-coupon/index.vue',
  'components/mobile/user-order/index.vue',
  'components/mobile/user-wallet/index.vue',
];

describe('mall DIY static assets', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('defines the OSS base URL in the app environment', () => {
    const envSource = readFileSync(resolve(appRoot, '.env'), 'utf8');
    const ossEnvLine = envSource
      .split(/\r?\n/)
      .find((line) => line.startsWith('VITE_OSS_BASE_URL='));

    expect(ossEnvLine).toBe(`VITE_OSS_BASE_URL=${ossBaseUrl}`);
  });

  it('generates all uploaded asset URLs from the OSS base domain', async () => {
    vi.stubEnv('VITE_OSS_BASE_URL', `${ossBaseUrl}/`);

    const { MALL_DIY_ASSETS } = await import('./static-assets');

    expect(MALL_DIY_ASSETS).toEqual(expectedAssets);
  });

  it('migrates exact legacy asset URLs in persisted DIY data', async () => {
    vi.stubEnv('VITE_OSS_BASE_URL', ossBaseUrl);

    const staticAssets = await import('./static-assets');

    expect(staticAssets.normalizeMallDiyAssetUrls).toEqual(
      expect.any(Function),
    );
    if (!staticAssets.normalizeMallDiyAssetUrls) {
      return;
    }

    const persistedConfig = {
      components: Object.keys(legacyAssets).map((url) => ({ image: { url } })),
      customUrl: 'https://example.com/custom.png',
    };

    expect(staticAssets.normalizeMallDiyAssetUrls(persistedConfig)).toEqual({
      components: Object.values(legacyAssets).map((url) => ({
        image: { url },
      })),
      customUrl: persistedConfig.customUrl,
    });
    expect(persistedConfig.components[0]?.image.url).toBe(
      Object.keys(legacyAssets)[0],
    );
  });

  it('removes legacy remote hosts and bundled image imports from consumers', () => {
    const consumerSource = consumerPaths
      .map((path) => readFileSync(resolve(diyEditorRoot, path), 'utf8'))
      .join('\n');

    expect(consumerSource).not.toMatch(
      /static\.iocoder\.cn|mall\.yudao\.iocoder\.cn|shopro\.sheepjs\.com/,
    );
    expect(consumerSource).not.toMatch(/#\/assets\/imgs\/(?:diy|static)\//);
    for (const assetKey of Object.keys(expectedAssets)) {
      expect(consumerSource).toContain(`MALL_DIY_ASSETS.${assetKey}`);
    }
    expect(consumerSource).toContain('normalizeMallDiyAssetUrls');
  });
});
