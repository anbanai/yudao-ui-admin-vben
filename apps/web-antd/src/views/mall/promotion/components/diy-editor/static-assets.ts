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
