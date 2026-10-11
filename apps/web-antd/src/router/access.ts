import type {
  AppRouteRecordRaw,
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { getTabKey, useAccessStore, useTabbarStore } from '@vben/stores';
import { convertServerMenuToRouteRecordStringComponent } from '@vben/utils';

import { BasicLayout, IFrameView } from '#/layouts';
import { isMerchantPathAllowed } from '#/router/merchant-access';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(
  options: GenerateMenuAndRoutesOptions & { merchant?: boolean },
) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');
  const accessStore = useAccessStore();

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  const result = await generateAccessible(
    options.merchant ? 'backend' : preferences.app.accessMode,
    {
      ...options,
      // The shared backend generator also appends every supplied static route.
      routes: options.merchant ? [] : options.routes,
      fetchMenuListAsync: async () => {
        // 由于 yudao 通过 accessStore 读取，所以不在进行 message.loading 提示
        // 补充说明：accessStore.accessMenus 一开始是 AppRouteRecordRaw 类型（后端加载），后面被赋值成 MenuRecordRaw 类型（前端转换）
        const accessMenus = accessStore.accessMenus as AppRouteRecordRaw[];
        return convertServerMenuToRouteRecordStringComponent(accessMenus);
      },
      // 可以指定没有权限跳转403页面
      forbiddenComponent,
      // 如果 route.meta.menuVisibleWithForbidden = true
      layoutMap,
      pageMap,
    },
  );
  if (options.merchant) {
    const tabbarStore = useTabbarStore();
    const revokedKeys = tabbarStore.tabs
      .filter(
        (tab) =>
          !isMerchantPathAllowed(tab.path) ||
          !options.router
            .resolve(tab.path)
            .matched.some((route) => isMerchantPathAllowed(route.path)),
      )
      .map(getTabKey);
    if (revokedKeys.length) await tabbarStore._bulkCloseByKeys(revokedKeys);
  }
  return result;
}

export { generateAccess };
