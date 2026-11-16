import type { MallSpuApi } from '#/api/mall/product/spu';

export interface StockChangeSummary {
  changeCount: number;
  stockDelta: number;
  totalStock: number;
}

export function createStockDraft(product: MallSpuApi.Spu) {
  return Object.fromEntries(
    (product.skus ?? [])
      .filter((sku) => sku.id !== undefined)
      .map((sku) => [sku.id!, sku.stock ?? 0]),
  ) as Record<number, number>;
}

export function getChangedStockValues(
  product: MallSpuApi.Spu,
  stockBySkuId: Record<number, number>,
) {
  const changedStock: Record<number, number> = {};
  for (const sku of product.skus ?? []) {
    if (sku.id === undefined) continue;
    const nextStock = stockBySkuId[sku.id];
    if (nextStock !== undefined && nextStock !== (sku.stock ?? 0)) {
      changedStock[sku.id] = nextStock;
    }
  }
  return changedStock;
}

export function getStockChangeSummary(
  product: MallSpuApi.Spu,
  stockBySkuId: Record<number, number>,
): StockChangeSummary {
  let changeCount = 0;
  let stockDelta = 0;
  let totalStock = 0;

  for (const sku of product.skus ?? []) {
    const currentStock = sku.stock ?? 0;
    const draftStock = sku.id === undefined ? undefined : stockBySkuId[sku.id];
    const nextStock = draftStock === undefined ? currentStock : draftStock;
    if (nextStock !== currentStock) {
      changeCount += 1;
    }
    stockDelta += nextStock - currentStock;
    totalStock += nextStock;
  }

  return { changeCount, stockDelta, totalStock };
}

export function getSkuDisplayName(sku: MallSpuApi.Sku) {
  const values = (sku.properties ?? [])
    .map((property) => property.valueName)
    .filter(Boolean);
  return values.length > 0 ? values.join(' / ') : '默认规格';
}

export function buildStockUpdatePayload(
  product: MallSpuApi.Spu,
  stockBySkuId: Record<number, number>,
): MallSpuApi.Spu {
  const entries = Object.entries(stockBySkuId).map(
    ([skuId, stock]) => [Number(skuId), stock] as const,
  );

  if (entries.some(([, stock]) => !Number.isInteger(stock) || stock < 0)) {
    throw new Error('库存必须是非负整数');
  }

  const skuIds = new Set((product.skus ?? []).map((sku) => sku.id));
  if (entries.some(([skuId]) => !skuIds.has(skuId))) {
    throw new Error('商品规格不存在');
  }

  return {
    ...product,
    skus: (product.skus ?? []).map((sku) => ({
      ...sku,
      stock:
        sku.id === undefined || stockBySkuId[sku.id] === undefined
          ? sku.stock
          : stockBySkuId[sku.id],
    })),
  };
}
