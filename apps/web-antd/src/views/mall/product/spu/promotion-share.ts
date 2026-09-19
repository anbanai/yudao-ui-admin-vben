import type { MallSpuApi } from '#/api/mall/product/spu';
import type { MemberUserApi } from '#/api/member/user';

export type PromotionAssetType = 'card' | 'h5' | 'poster';

export interface PromotionIdentity {
  avatarUrl: string;
  kind: 'member' | 'shop';
  name: string;
  shareId: number;
}

export interface PromotionContext {
  h5Url?: string;
  identity: PromotionIdentity;
  marketPriceText?: string;
  miniProgramPath: 'pages/index/index';
  miniProgramScene: string;
  picUrl: string;
  priceText: string;
  productId: number;
  productName: string;
}

const CHANNELS = {
  h5: { from: 3, platform: 1 },
  miniProgram: { from: 2, platform: 3 },
} as const;

export function createShopIdentity(
  name: string,
  avatarUrl: string,
): PromotionIdentity {
  return { avatarUrl, kind: 'shop', name, shareId: 0 };
}

export function createMemberIdentity(
  member: MemberUserApi.User,
  shopAvatarUrl: string,
): PromotionIdentity {
  const shareId = member.id ?? 0;
  return {
    avatarUrl: member.avatar || shopAvatarUrl,
    kind: 'member',
    name: member.nickname || `会员 ${shareId}`,
    shareId,
  };
}

export function buildSpm(
  shareId: number,
  spuId: number,
  channel: keyof typeof CHANNELS,
) {
  const { from, platform } = CHANNELS[channel];
  return `spm=${shareId}.2.${spuId}.${platform}.${from}`;
}

export function buildH5PromotionUrl(
  h5Domain: string | undefined,
  shareId: number,
  spuId: number,
): string {
  try {
    const url = new URL(h5Domain ?? '');
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('H5 域名无效');
    }
    url.searchParams.set('spm', buildSpm(shareId, spuId, 'h5').slice(4));
    return url.toString();
  } catch {
    throw new Error('H5 域名无效');
  }
}

export function buildPromotionContext({
  h5Domain,
  identity,
  product,
}: {
  h5Domain?: string;
  identity: PromotionIdentity;
  product: MallSpuApi.Spu;
}): PromotionContext {
  const productId = requireProductId(product);
  const productName = requireProductString(product.name, '商品名称不存在');
  const picUrl = requireProductString(product.picUrl, '商品图片不存在');
  const price = requireProductPrice(product.price, '商品价格不存在');
  const marketPrice = product.marketPrice;

  let h5Url: string | undefined;
  try {
    h5Url = buildH5PromotionUrl(h5Domain, identity.shareId, productId);
  } catch {
    // H5 configuration is optional for small-program promotion assets.
  }

  return {
    ...(h5Url ? { h5Url } : {}),
    identity,
    ...(isValidPrice(marketPrice) && marketPrice > price
      ? { marketPriceText: formatFen(marketPrice) }
      : {}),
    miniProgramPath: 'pages/index/index',
    miniProgramScene: buildSpm(identity.shareId, productId, 'miniProgram'),
    picUrl,
    priceText: formatFen(price),
    productId,
    productName,
  };
}

export function buildPromotionCacheKey(
  product: MallSpuApi.Spu,
  shareId: number,
  type: PromotionAssetType,
): string {
  return JSON.stringify({
    id: product.id,
    marketPrice: product.marketPrice,
    name: product.name,
    picUrl: product.picUrl,
    price: product.price,
    shareId,
    type,
  });
}

export function buildPromotionFilename(
  productName: string,
  type: PromotionAssetType,
): string {
  const assetName = {
    card: '商品卡片',
    h5: 'H5二维码',
    poster: '商品海报',
  }[type];
  return `${productName.replaceAll(/[\\/:*?"<>|]/g, '-')}${assetName}.png`;
}

function requireProductId(product: MallSpuApi.Spu): number {
  if (
    !Number.isInteger(product.id) ||
    product.id === undefined ||
    product.id <= 0
  ) {
    throw new Error('商品编号不存在');
  }
  return product.id;
}

function requireProductString(
  value: string | undefined,
  message: string,
): string {
  if (!value?.trim()) {
    throw new Error(message);
  }
  return value;
}

function requireProductPrice(
  value: number | undefined,
  message: string,
): number {
  if (!isValidPrice(value)) {
    throw new Error(message);
  }
  return value;
}

function isValidPrice(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function formatFen(price: number): string {
  return `¥${(price / 100).toFixed(2)}`;
}
