import type { PropertyAndValues } from './type';

import type { MallSpuApi } from '#/api/mall/product/spu';

import { describe, expect, it } from 'vitest';

import { getSkuKey, reconcileSkus } from './sku-reconcile';

function propertyList(
  values: Array<{ id: number; name: string }>,
): PropertyAndValues[] {
  return [
    {
      id: 1,
      name: '颜色',
      values,
    },
  ];
}

function sku(
  properties: MallSpuApi.Property[],
  overrides: Partial<MallSpuApi.Sku> = {},
): MallSpuApi.Sku {
  return {
    name: '商品',
    price: 10,
    marketPrice: 12,
    costPrice: 8,
    barCode: 'barcode',
    picUrl: '/image.png',
    stock: 5,
    weight: 1,
    volume: 2,
    firstBrokeragePrice: 0,
    secondBrokeragePrice: 0,
    properties,
    ...overrides,
  };
}

describe('sku 组合对账', () => {
  it('根据属性值生成所有组合', () => {
    const result = reconcileSkus(
      propertyList([
        { id: 11, name: '红色' },
        { id: 12, name: '蓝色' },
      ]),
      [],
    );

    expect(result).toHaveLength(2);
    expect(result.map((item) => getSkuKey(item.properties))).toEqual([
      '1:11',
      '1:12',
    ]);
  });

  it('新增属性值时保留已有 SKU 字段并创建新行', () => {
    const existing = [
      sku([
        { propertyId: 1, propertyName: '颜色', valueId: 11, valueName: '红色' },
      ]),
    ];

    const result = reconcileSkus(
      propertyList([
        { id: 11, name: '红色' },
        { id: 12, name: '蓝色' },
      ]),
      existing,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      barCode: 'barcode',
      picUrl: '/image.png',
      price: 10,
      stock: 5,
    });
    expect(result[1]).toMatchObject({
      barCode: '',
      picUrl: '',
      price: 0,
      stock: 0,
    });
  });

  it('删除属性值时移除失效组合', () => {
    const existing = [
      sku([{ propertyId: 1, valueId: 11, valueName: '红色' }]),
      sku([{ propertyId: 1, valueId: 12, valueName: '蓝色' }]),
    ];

    const result = reconcileSkus(
      propertyList([{ id: 11, name: '红色' }]),
      existing,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.properties?.[0]?.valueId).toBe(11);
  });

  it('属性顺序变化时仍使用同一个组合 key', () => {
    expect(
      getSkuKey([
        { propertyId: 2, valueId: 22 },
        { propertyId: 1, valueId: 11 },
      ]),
    ).toBe('1:11|2:22');
  });

  it('属性值尚未配置时保留现有 SKU，避免添加属性时先清空数据', () => {
    const existing = [
      sku([
        { propertyId: 1, propertyName: '颜色', valueId: 11, valueName: '红色' },
      ]),
    ];

    const result = reconcileSkus(
      [
        ...propertyList([{ id: 11, name: '红色' }]),
        { id: 2, name: '尺寸', values: [] },
      ],
      existing,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject(existing[0]!);
  });

  it('新增属性维度后从唯一匹配的旧 SKU 继承可编辑字段', () => {
    const existing = [
      sku([
        { propertyId: 1, propertyName: '颜色', valueId: 11, valueName: '红色' },
      ]),
    ];

    const result = reconcileSkus(
      [
        ...propertyList([{ id: 11, name: '红色' }]),
        { id: 2, name: '尺寸', values: [{ id: 21, name: 'M' }] },
      ],
      existing,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      barCode: 'barcode',
      price: 10,
      stock: 5,
    });
    expect(getSkuKey(result[0]?.properties)).toBe('1:11|2:21');
  });
});
