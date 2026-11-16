import { describe, expect, it } from 'vitest';

import {
  buildStockUpdatePayload,
  createStockDraft,
  getChangedStockValues,
  getSkuDisplayName,
  getStockChangeSummary,
} from './inventory-utils';

const product = {
  id: 10,
  name: '示例商品',
  skus: [
    { id: 101, stock: 3 },
    { id: 102, stock: 7 },
  ],
};

describe('商品库存更新', () => {
  it('只替换指定 SKU 的库存并保留原始商品对象', () => {
    const result = buildStockUpdatePayload(product, { 101: 12 });

    expect(result).toEqual({
      id: 10,
      name: '示例商品',
      skus: [
        { id: 101, stock: 12 },
        { id: 102, stock: 7 },
      ],
    });
    expect(result).not.toBe(product);
    expect(result.skus).not.toBe(product.skus);
    expect(product.skus[0]!.stock).toBe(3);
  });

  it.each([-1, 1.5, Number.NaN])('拒绝非法库存值 %s', (stock) => {
    expect(() => buildStockUpdatePayload(product, { 101: stock })).toThrow(
      '库存必须是非负整数',
    );
  });

  it('拒绝更新不属于当前商品的 SKU', () => {
    expect(() => buildStockUpdatePayload(product, { 999: 1 })).toThrow(
      '商品规格不存在',
    );
  });

  it('生成库存草稿并统计实际发生变化的规格', () => {
    const draft = createStockDraft(product);
    draft[101] = 5;

    expect(draft).toEqual({ 101: 5, 102: 7 });
    expect(getStockChangeSummary(product, draft)).toEqual({
      changeCount: 1,
      stockDelta: 2,
      totalStock: 12,
    });
  });

  it('只提取实际变化的库存，避免覆盖未编辑规格的最新库存', () => {
    expect(getChangedStockValues(product, { 101: 3, 102: 9 })).toEqual({
      102: 9,
    });
  });

  it('优先显示规格值，没有规格值时显示默认规格', () => {
    expect(
      getSkuDisplayName({
        properties: [
          { propertyName: '颜色', valueName: '青色' },
          { propertyName: '容量', valueName: '500ml' },
        ],
      }),
    ).toBe('青色 / 500ml');
    expect(getSkuDisplayName({ properties: [] })).toBe('默认规格');
  });
});
