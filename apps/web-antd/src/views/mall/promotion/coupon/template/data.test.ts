import { PromotionProductScopeEnum } from '@vben/constants';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  expandProductScopeValues,
  getProductScopeValues,
  useFormSchema,
} from './data';

describe('coupon template product scope', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('derives persisted values from the active selector only', () => {
    const values = {
      productCategoryIds: 3,
      productSpuIds: [1, 2],
    };

    expect(
      getProductScopeValues({
        ...values,
        productScope: PromotionProductScopeEnum.ALL.scope,
      }),
    ).toEqual([]);
    expect(
      getProductScopeValues({
        ...values,
        productScope: PromotionProductScopeEnum.SPU.scope,
      }),
    ).toEqual([1, 2]);
    expect(
      getProductScopeValues({
        ...values,
        productScope: PromotionProductScopeEnum.CATEGORY.scope,
      }),
    ).toEqual([3]);
  });

  it('expands category scope to the single-select field', () => {
    expect(
      expandProductScopeValues({
        productScope: PromotionProductScopeEnum.CATEGORY.scope,
        productScopeValues: [3],
      }),
    ).toMatchObject({
      productCategoryIds: 3,
      productSpuIds: [],
    });
    expect(
      expandProductScopeValues({
        productScope: PromotionProductScopeEnum.SPU.scope,
        productScopeValues: [1, 2],
      }),
    ).toMatchObject({
      productCategoryIds: undefined,
      productSpuIds: [1, 2],
    });
  });

  it('does not use field-writing dependency triggers for scope switching', () => {
    const scopeFieldNames = new Set([
      'productCategoryIds',
      'productScopeValues',
      'productSpuIds',
    ]);
    const scopeSchemas = useFormSchema().filter(({ fieldName }) =>
      scopeFieldNames.has(fieldName),
    );

    expect(scopeSchemas.map(({ fieldName }) => fieldName)).toEqual([
      'productSpuIds',
      'productCategoryIds',
    ]);
    expect(
      scopeSchemas.every(
        ({ dependencies }) =>
          !dependencies || !Reflect.has(dependencies, 'trigger'),
      ),
    ).toBe(true);
  });
});
