import type { PropertyAndValues } from './type';

import type { MallSpuApi } from '#/api/mall/product/spu';

/** 创建一行可编辑的空 SKU。 */
export function createEmptySku(): MallSpuApi.Sku {
  return {
    name: '',
    price: 0,
    marketPrice: 0,
    costPrice: 0,
    barCode: '',
    picUrl: '',
    stock: 0,
    weight: 0,
    volume: 0,
    firstBrokeragePrice: 0,
    secondBrokeragePrice: 0,
  };
}

/**
 * Return a stable identity for a SKU combination.
 * Property order is presentation-only, so keys are sorted before joining.
 */
export function getSkuKey(properties: MallSpuApi.Property[] = []): string {
  return properties
    .map((property) => `${property.propertyId ?? ''}:${property.valueId ?? ''}`)
    .toSorted()
    .join('|');
}

/** 判断已有 SKU 是否能被新的组合表示（用于识别新增属性维度）。 */
export function isSkuPropertiesSubset(
  existingProperties: MallSpuApi.Property[] = [],
  nextProperties: MallSpuApi.Property[] = [],
): boolean {
  if (existingProperties.length === 0) {
    return false;
  }
  const nextKeys = new Set(
    nextProperties.map((property) => getSkuKey([property])),
  );
  return existingProperties.every((property) =>
    nextKeys.has(getSkuKey([property])),
  );
}

function cloneSku(sku: MallSpuApi.Sku): MallSpuApi.Sku {
  return {
    ...sku,
    properties: sku.properties?.map((property) => ({ ...property })),
  };
}

function buildCombinations(
  propertyList: PropertyAndValues[],
): MallSpuApi.Property[][] {
  if (
    propertyList.length === 0 ||
    propertyList.some((property) => !property.values?.length)
  ) {
    return [];
  }

  let combinations: MallSpuApi.Property[][] = [[]];
  for (const property of propertyList) {
    const nextCombinations: MallSpuApi.Property[][] = [];
    for (const combination of combinations) {
      for (const value of property.values ?? []) {
        nextCombinations.push([
          ...combination,
          {
            propertyId: property.id,
            propertyName: property.name,
            valueId: value.id,
            valueName: value.name,
          },
        ]);
      }
    }
    combinations = nextCombinations;
  }
  return combinations;
}

/**
 * Reconcile the complete SKU table with the current property/value matrix.
 * Existing rows are reused by combination key so user-entered fields survive
 * property edits. Rows for removed combinations are intentionally discarded.
 */
export function reconcileSkus(
  propertyList: PropertyAndValues[],
  existingSkus: MallSpuApi.Sku[] = [],
): MallSpuApi.Sku[] {
  if (propertyList.some((property) => !property.values?.length)) {
    return existingSkus.map((sku) => cloneSku(sku));
  }

  const existingByKey = new Map(
    existingSkus.map((sku) => [getSkuKey(sku.properties), sku]),
  );

  return buildCombinations(propertyList).map((properties) => {
    const existing = existingByKey.get(getSkuKey(properties));
    if (existing) {
      return { ...cloneSku(existing), properties };
    }

    const fallbackCandidates = existingSkus.filter((sku) =>
      isSkuPropertiesSubset(sku.properties, properties),
    );
    if (fallbackCandidates.length === 1) {
      return { ...cloneSku(fallbackCandidates[0]!), properties };
    }

    return { ...createEmptySku(), properties };
  });
}
