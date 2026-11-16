import { describe, expect, it } from 'vitest';

import {
  buildH5PromotionUrl,
  buildPromotionCacheKey,
  buildPromotionContext,
  buildPromotionFilename,
  createMemberIdentity,
  createShopIdentity,
} from './promotion-share';

describe('商品推广数据', () => {
  it('使用公共店铺身份', () => {
    expect(createShopIdentity('不忍独享', '/branding/logo-mark.png')).toEqual({
      avatarUrl: '/branding/logo-mark.png',
      kind: 'shop',
      name: '不忍独享',
      shareId: 0,
    });
  });

  it('为资料不全的推广员提供兜底', () => {
    expect(
      createMemberIdentity(
        { id: 27, nickname: '', avatar: '' },
        '/branding/logo-mark.png',
      ),
    ).toEqual({
      avatarUrl: '/branding/logo-mark.png',
      kind: 'member',
      name: '会员 27',
      shareId: 27,
    });
  });

  it('生成一致的小程序和 H5 追踪参数', () => {
    const context = buildPromotionContext({
      h5Domain: 'https://mall.example.com/store?tenant=tea',
      identity: createShopIdentity('不忍独享', '/branding/logo-mark.png'),
      product: {
        id: 88,
        marketPrice: 12_900,
        name: '明前绿茶',
        picUrl: 'https://static.example.com/tea.png',
        price: 9900,
      },
    });

    expect(context.miniProgramScene).toBe('spm=0.2.88.3.2');
    expect(context.h5Url).toBe(
      'https://mall.example.com/store?tenant=tea&spm=0.2.88.1.3',
    );
    expect(context.priceText).toBe('¥99.00');
    expect(context.marketPriceText).toBe('¥129.00');
  });

  it('拒绝缺少商品编号', () => {
    expect(() =>
      buildPromotionContext({
        h5Domain: 'not-a-url',
        identity: createShopIdentity('店铺', '/branding/logo-mark.png'),
        product: { name: '测试商品' },
      }),
    ).toThrow('商品编号不存在');
  });

  it('严格拒绝无效 H5 域名', () => {
    expect(() => buildH5PromotionUrl('not-a-url', 0, 8)).toThrow('H5 域名无效');
    expect(() => buildH5PromotionUrl('ftp://mall.example.com', 0, 8)).toThrow(
      'H5 域名无效',
    );
  });

  it('在 H5 域名无效时仍生成小程序推广数据', () => {
    const context = buildPromotionContext({
      h5Domain: 'not-a-url',
      identity: createShopIdentity('店铺', '/branding/logo-mark.png'),
      product: {
        id: 8,
        name: '测试商品',
        picUrl: '/tea.png',
        price: 100,
      },
    });

    expect(context.h5Url).toBeUndefined();
    expect(context.miniProgramScene).toBe('spm=0.2.8.3.2');
  });

  it('身份、商品详情或素材类型变化时缓存键变化', () => {
    const product = { id: 8, name: '茶', picUrl: '/tea.png', price: 100 };

    expect(buildPromotionCacheKey(product, 0, 'poster')).not.toBe(
      buildPromotionCacheKey(product, 9, 'poster'),
    );
    expect(buildPromotionCacheKey(product, 0, 'poster')).not.toBe(
      buildPromotionCacheKey(product, 0, 'card'),
    );
    expect(buildPromotionCacheKey(product, 0, 'poster')).not.toBe(
      buildPromotionCacheKey({ ...product, price: 101 }, 0, 'poster'),
    );
  });

  it('身份头像和 H5 配置变化时缓存键变化', () => {
    const product = { id: 8, name: '茶', picUrl: '/tea.png', price: 100 };
    const identity = createMemberIdentity(
      { avatar: '/member-a.png', id: 9, nickname: '茶友' },
      '/shop.png',
    );
    const base = buildPromotionCacheKey(product, 9, 'h5', {
      h5Domain: 'https://mall.example.com',
      h5Url: 'https://mall.example.com/product?spm=9.2.8.1.3',
      identity,
    });

    expect(base).not.toBe(
      buildPromotionCacheKey(product, 9, 'h5', {
        h5Domain: 'https://mall.example.com',
        h5Url: 'https://mall.example.com/product?spm=9.2.8.1.3',
        identity: { ...identity, avatarUrl: '/member-b.png' },
      }),
    );
    expect(base).not.toBe(
      buildPromotionCacheKey(product, 9, 'h5', {
        h5Domain: 'https://other.example.com',
        h5Url: 'https://other.example.com/product?spm=9.2.8.1.3',
        identity,
      }),
    );
  });

  it('清理下载文件名非法字符', () => {
    expect(buildPromotionFilename('春茶/礼盒:*?', 'poster')).toBe(
      '春茶-礼盒---商品海报.png',
    );
  });
});
