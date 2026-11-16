import { describe, expect, it } from 'vitest';

import {
  buildMerchantProductPayload,
  buildMerchantProductUpdatePayload,
} from './product-form';

describe('buildMerchantProductPayload', () => {
  it('builds a single-SKU product request with prices converted to cents', () => {
    expect(
      buildMerchantProductPayload({
        brandId: 12,
        categoryId: 4,
        description: '清香回甘',
        imageUrl: 'https://cdn.example.test/tea.png',
        name: '春茶',
        price: '39.90',
        stock: 50,
      }),
    ).toMatchObject({
      brandId: 12,
      categoryId: 4,
      description: '清香回甘',
      deliveryTypes: [1],
      giveIntegral: 0,
      name: '春茶',
      picUrl: 'https://cdn.example.test/tea.png',
      salesCount: 0,
      skus: [
        {
          name: '春茶',
          picUrl: 'https://cdn.example.test/tea.png',
          price: 3990,
          stock: 50,
        },
      ],
      specType: false,
      subCommissionType: false,
    });
  });

  it('rejects missing product fields and invalid price or stock', () => {
    expect(() =>
      buildMerchantProductPayload({
        brandId: 12,
        categoryId: 4,
        imageUrl: '',
        name: '春茶',
        price: '0',
        stock: -1,
      }),
    ).toThrow();
  });
});

describe('merchant product edits', () => {
  it('preserves all SKU properties, gallery, logistics and marketing configuration', () => {
    const original = {
      id: 7,
      specType: true,
      sliderPicUrls: ['gallery-1', 'gallery-2'],
      deliveryTypes: [1, 2],
      deliveryTemplateId: 12,
      sort: 99,
      giveIntegral: 20,
      subCommissionType: true,
      virtualSalesCount: 100,
      skus: [
        {
          id: 71,
          properties: [{ propertyId: 1, valueId: 2 }],
          price: 1000,
          marketPrice: 1500,
          stock: 5,
          weight: 2,
        },
        {
          id: 72,
          properties: [{ propertyId: 1, valueId: 3 }],
          price: 2000,
          marketPrice: 2500,
          stock: 6,
          weight: 3,
        },
      ],
    };
    const updated = buildMerchantProductUpdatePayload(
      original,
      {
        brandId: 12,
        categoryId: 4,
        name: '春茶新版',
        imageUrl: 'new-image',
        price: 10,
        stock: 5,
      },
      [
        { price: 11, stock: 10 },
        { price: 22, stock: 20 },
      ],
    );
    expect(updated).toMatchObject({
      ...original,
      name: '春茶新版',
      picUrl: 'new-image',
      skus: [
        { ...original.skus[0], price: 1100, stock: 10 },
        { ...original.skus[1], price: 2200, stock: 20 },
      ],
    });
    expect(original.skus[0]?.price).toBe(1000);
    expect(() =>
      buildMerchantProductUpdatePayload(
        original,
        {
          brandId: 12,
          categoryId: 4,
          name: '春茶',
          imageUrl: 'image',
          price: 10,
          stock: 5,
        },
        [{ price: 11, stock: 10 }],
      ),
    ).toThrow('请重新加载完整商品规格');
  });
});
