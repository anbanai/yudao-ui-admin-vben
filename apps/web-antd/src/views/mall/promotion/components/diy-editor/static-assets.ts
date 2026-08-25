const ossBaseUrl = import.meta.env.VITE_OSS_BASE_URL?.replace(/\/+$/, '');

if (!ossBaseUrl) {
  throw new Error('VITE_OSS_BASE_URL is required');
}

const mallDiyAssetUrl = (filename: string) =>
  `${ossBaseUrl}/mall/diy/${filename}`;

export const MALL_DIY_ASSETS = {
  appNavBarMp: mallDiyAssetUrl('app-nav-bar-mp.png'),
  banner01: mallDiyAssetUrl('banner-01.jpg'),
  banner02: mallDiyAssetUrl('banner-02.jpg'),
  noticeIcon: mallDiyAssetUrl('notice-icon.png'),
  statusBar: mallDiyAssetUrl('statusBar.png'),
  tabbar1Active: mallDiyAssetUrl('tabbar-1-active.png'),
  tabbar1Default: mallDiyAssetUrl('tabbar-1-default.png'),
  tabbar2Active: mallDiyAssetUrl('tabbar-2-active.png'),
  tabbar2Default: mallDiyAssetUrl('tabbar-2-default.png'),
  tabbar3Active: mallDiyAssetUrl('tabbar-3-active.png'),
  tabbar3Default: mallDiyAssetUrl('tabbar-3-default.png'),
  tabbar4Active: mallDiyAssetUrl('tabbar-4-active.png'),
  tabbar4Default: mallDiyAssetUrl('tabbar-4-default.png'),
  userCoupon: mallDiyAssetUrl('user-coupon.png'),
  userOrder: mallDiyAssetUrl('user-order.png'),
  userWallet: mallDiyAssetUrl('user-wallet.png'),
} as const;

const LEGACY_MALL_DIY_ASSET_URLS: Readonly<Record<string, string>> = {
  'http://mall.yudao.iocoder.cn/static/images/1-001.png':
    MALL_DIY_ASSETS.tabbar1Default,
  'http://mall.yudao.iocoder.cn/static/images/1-002.png':
    MALL_DIY_ASSETS.tabbar1Active,
  'http://mall.yudao.iocoder.cn/static/images/2-001.png':
    MALL_DIY_ASSETS.tabbar2Default,
  'http://mall.yudao.iocoder.cn/static/images/2-002.png':
    MALL_DIY_ASSETS.tabbar2Active,
  'http://mall.yudao.iocoder.cn/static/images/3-001.png':
    MALL_DIY_ASSETS.tabbar3Default,
  'http://mall.yudao.iocoder.cn/static/images/3-002.png':
    MALL_DIY_ASSETS.tabbar3Active,
  'http://mall.yudao.iocoder.cn/static/images/4-001.png':
    MALL_DIY_ASSETS.tabbar4Default,
  'http://mall.yudao.iocoder.cn/static/images/4-002.png':
    MALL_DIY_ASSETS.tabbar4Active,
  'http://mall.yudao.iocoder.cn/static/images/xinjian.png':
    MALL_DIY_ASSETS.noticeIcon,
  'https://static.iocoder.cn/mall/banner-01.jpg': MALL_DIY_ASSETS.banner01,
  'https://static.iocoder.cn/mall/banner-02.jpg': MALL_DIY_ASSETS.banner02,
};

/** Replace legacy image URLs in persisted DIY JSON without mutating the input. */
export function normalizeMallDiyAssetUrls<T>(value: T): T {
  if (typeof value === 'string') {
    return (LEGACY_MALL_DIY_ASSET_URLS[value] ?? value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeMallDiyAssetUrls(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizeMallDiyAssetUrls(item),
      ]),
    ) as T;
  }

  return value;
}
