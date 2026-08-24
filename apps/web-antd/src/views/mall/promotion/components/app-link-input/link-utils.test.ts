import { describe, expect, it } from 'vitest';

import { APP_LINK_TYPE_ENUM } from './data';
import {
  appendLinkParam,
  formatAppLinkName,
  getLinkDetailName,
  getLinkParamKey,
  resolveAppLinkName,
} from './link-utils';

describe('app link helpers', () => {
  it('uses the route-specific parameter for category links', () => {
    expect(getLinkParamKey(APP_LINK_TYPE_ENUM.PRODUCT_CATEGORY_LIST)).toBe(
      'id',
    );
    expect(getLinkParamKey(APP_LINK_TYPE_ENUM.PRODUCT_LIST)).toBe('categoryId');
  });

  it('uses id for detail links', () => {
    expect(getLinkParamKey(APP_LINK_TYPE_ENUM.PRODUCT_DETAIL_NORMAL)).toBe(
      'id',
    );
  });

  it('appends a selected id without dropping existing query params', () => {
    expect(appendLinkParam('/pages/goods/list?foo=bar', 'categoryId', 12)).toBe(
      '/pages/goods/list?foo=bar&categoryId=12',
    );
  });

  it('includes the selected record name in the display label', () => {
    expect(formatAppLinkName('商品详情', '测试商品')).toBe(
      '商品详情：测试商品',
    );
  });

  it('prefers the concrete product name for promotion records', () => {
    expect(getLinkDetailName({ name: '拼团活动', spuName: '测试商品' })).toBe(
      '测试商品',
    );
  });

  it('preserves an existing detail name when the record is not reselected', () => {
    expect(resolveAppLinkName('商品详情：已有商品')).toBe(
      '商品详情：已有商品',
    );
  });
});
