import { PromotionProductScopeEnum } from '@vben/constants';

import { describe, expect, it, vi } from 'vitest';

import {
  syncProductCategoryIds,
  syncProductScopeValues,
  syncProductSpuIds,
} from './data';

describe('reward activity product scope dependencies', () => {
  it('does not write product ids when they already match the scope values', () => {
    const setFieldValue = vi.fn();
    const values = {
      productScope: PromotionProductScopeEnum.SPU.scope,
      productScopeValues: [1, 2],
      productSpuIds: [],
    };

    syncProductSpuIds({ ...values, productSpuIds: [1, 2] }, setFieldValue);

    expect(setFieldValue).toHaveBeenCalledTimes(0);
  });

  it('does not write product scope values when they already match selected products', () => {
    const setFieldValue = vi.fn();

    syncProductScopeValues(
      {
        productScope: PromotionProductScopeEnum.SPU.scope,
        productScopeValues: [1, 2],
        productSpuIds: [1, 2],
      },
      setFieldValue,
    );

    expect(setFieldValue).toHaveBeenCalledTimes(0);
  });

  it('synchronizes changed product and category selections once', () => {
    const setFieldValue = vi.fn();
    const spuValues = {
      productScope: PromotionProductScopeEnum.SPU.scope,
      productScopeValues: [1, 2],
      productSpuIds: [] as number[],
    };
    const categoryValues = {
      productScope: PromotionProductScopeEnum.CATEGORY.scope,
      productScopeValues: [3, 4],
      productCategoryIds: [] as number[],
    };

    syncProductSpuIds(spuValues, (field, value) => {
      setFieldValue(field, value);
      spuValues.productSpuIds = value as number[];
    });
    syncProductSpuIds(spuValues, setFieldValue);

    syncProductCategoryIds(categoryValues, (field, value) => {
      setFieldValue(field, value);
      categoryValues.productCategoryIds = value as number[];
    });
    syncProductCategoryIds(categoryValues, setFieldValue);

    expect(setFieldValue).toHaveBeenCalledTimes(2);
    expect(setFieldValue).toHaveBeenNthCalledWith(1, 'productSpuIds', [1, 2]);
    expect(setFieldValue).toHaveBeenNthCalledWith(
      2,
      'productCategoryIds',
      [3, 4],
    );
  });

  it('synchronizes category scope values without repeating the write', () => {
    const setFieldValue = vi.fn();
    const values = {
      productScope: PromotionProductScopeEnum.CATEGORY.scope,
      productScopeValues: [] as number[],
      productCategoryIds: [3, 4] as number[],
    };

    syncProductScopeValues(values, (field, value) => {
      setFieldValue(field, value);
      values.productScopeValues = value as number[];
    });
    syncProductScopeValues(values, setFieldValue);

    expect(setFieldValue).toHaveBeenCalledTimes(1);
    expect(setFieldValue).toHaveBeenCalledWith('productScopeValues', [3, 4]);
  });
});
