import type { NavigationBarProperty } from './components/mobile/navigation-bar/config';
import type { PageConfigProperty } from './components/mobile/page-config/config';
import type { TabBarProperty } from './components/mobile/tab-bar/config';
import type {
  ComponentStyle,
  DiyComponentLibrary,
  PageComponent,
} from './types';

export type {
  ComponentStyle,
  DiyComponent,
  DiyComponentLibrary,
  PageComponent,
} from './types';

/** 吸顶菜单需要越过组件容器，其余场景继续裁剪圆角内容。 */
export function getComponentOverflow(componentId: string, sticky: boolean) {
  return componentId === 'ProductGroup' && sticky ? 'visible' : 'hidden';
}

/** 将组件背景配置转换为稳定的 CSS 样式，避免 background 简写覆盖颜色。 */
export function getComponentBackgroundStyle(style?: ComponentStyle) {
  if (!style) return {};
  return style.bgType === 'color'
    ? { backgroundColor: style.bgColor, backgroundImage: 'none' }
    : {
        backgroundColor: 'transparent',
        backgroundImage: `url(${style.bgImg})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
      };
}

/** 将页面背景配置转换为稳定的 CSS 样式。 */
export function getPageBackgroundStyle(
  style?: Pick<PageConfigProperty, 'backgroundColor' | 'backgroundImage'>,
) {
  if (!style) return {};
  return {
    backgroundColor: style.backgroundColor || 'transparent',
    backgroundImage: style.backgroundImage
      ? `url(${style.backgroundImage})`
      : 'none',
  };
}

/** 页面配置 */
export interface PageConfig {
  page: PageConfigProperty; // 页面属性
  navigationBar: NavigationBarProperty; // 顶部导航栏属性
  tabBar?: TabBarProperty; // 底部导航菜单属性

  components: PageComponent[]; // 页面组件列表
}

/** 页面组件库 */
export const PAGE_LIBS = [
  {
    name: '基础组件',
    extended: true,
    components: [
      'SearchBar',
      'NoticeBar',
      'MenuSwiper',
      'MenuGrid',
      'MenuList',
      'Popover',
      'FloatingActionButton',
    ],
  },
  {
    name: '图文组件',
    extended: true,
    components: [
      'ImageBar',
      'Carousel',
      'TitleBar',
      'VideoPlayer',
      'Divider',
      'MagicCube',
      'HotZone',
    ],
  },
  {
    name: '商品组件',
    extended: true,
    components: ['ProductCard', 'ProductList', 'ProductGroup'],
  },
  {
    name: '用户组件',
    extended: true,
    components: ['UserCard', 'UserOrder', 'UserWallet', 'UserCoupon'],
  },
  {
    name: '营销组件',
    extended: true,
    components: [
      'PromotionCombination',
      'PromotionSeckill',
      'PromotionPoint',
      'CouponCard',
      'PromotionArticle',
    ],
  },
] as DiyComponentLibrary[];
