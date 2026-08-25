import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const appRoot = resolve(process.cwd(), 'apps/web-antd');
const diyEditorRoot = resolve(
  appRoot,
  'src/views/mall/promotion/components/diy-editor',
);
const assetConfigPath = resolve(diyEditorRoot, 'static-assets.ts');

const expectedAssetFiles = [
  'app-nav-bar-mp.png',
  'banner-01.jpg',
  'banner-02.jpg',
  'notice-icon.png',
  'statusBar.png',
  'tabbar-1-active.png',
  'tabbar-1-default.png',
  'tabbar-2-active.png',
  'tabbar-2-default.png',
  'tabbar-3-active.png',
  'tabbar-3-default.png',
  'tabbar-4-active.png',
  'tabbar-4-default.png',
  'user-coupon.png',
  'user-order.png',
  'user-wallet.png',
];

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
  it('defines the OSS base URL in the app environment', () => {
    const envSource = readFileSync(resolve(appRoot, '.env'), 'utf8');

    expect(envSource).toContain(
      'VITE_OSS_BASE_URL=https://teaworthshare.oss-cn-chengdu.aliyuncs.com',
    );
  });

  it('maps every uploaded file through one asset configuration', () => {
    expect(existsSync(assetConfigPath)).toBe(true);

    const configSource = existsSync(assetConfigPath)
      ? readFileSync(assetConfigPath, 'utf8')
      : '';
    expect(configSource).toContain('VITE_OSS_BASE_URL');
    expect(configSource).toContain('/mall/diy');
    for (const filename of expectedAssetFiles) {
      expect(configSource).toContain(filename);
    }
  });

  it('removes legacy remote hosts and bundled image imports from consumers', () => {
    const consumerSource = consumerPaths
      .map((path) => readFileSync(resolve(diyEditorRoot, path), 'utf8'))
      .join('\n');

    expect(consumerSource).not.toMatch(
      /static\.iocoder\.cn|mall\.yudao\.iocoder\.cn|shopro\.sheepjs\.com/,
    );
    expect(consumerSource).not.toMatch(/#\/assets\/imgs\/(?:diy|static)\//);
    expect(consumerSource).toContain('MALL_DIY_ASSETS');
  });
});
