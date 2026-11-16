import type { MallProductGroupApi } from '#/api/mall/product/group';

export function buildSpuGroupUpdate(
  spuIds: number[],
  groupIds: number[],
  operation: 'add' | 'remove',
): MallProductGroupApi.SpuBatchUpdateRequest {
  const products = [...new Set(spuIds)];
  const groups = [...new Set(groupIds)];
  if (products.length === 0 || products.length > 200) {
    throw new Error('请选择1至200件商品');
  }
  if (groups.length === 0 || groups.length > 15) {
    throw new Error('请选择1至15个分组');
  }
  return { spuIds: products, groupIds: groups, operation };
}

export function getPublicGroupLink(
  group: Pick<MallProductGroupApi.Group, 'id' | 'status' | 'storefrontVisible'>,
) {
  if (!group.id || group.status !== 0 || !group.storefrontVisible) return;
  return `/pages/goods/group-list?groupIds=${group.id}`;
}
