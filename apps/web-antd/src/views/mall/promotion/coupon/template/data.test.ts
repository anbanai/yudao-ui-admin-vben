import { PromotionProductScopeEnum } from '@vben/constants';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createCouponFormController,
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

  it('keeps scope switching bounded and clears inactive selectors', async () => {
    const controller = createCouponFormController();
    const scopeProps = useFormSchema(controller.changeProductScope).find(
      ({ fieldName }) => fieldName === 'productScope',
    )?.componentProps as { onChange: (scope: number) => Promise<void> };
    expect(controller.values.productScope).toBe(
      PromotionProductScopeEnum.ALL.scope,
    );

    for (let round = 0; round < 50; round++) {
      await scopeProps.onChange(PromotionProductScopeEnum.SPU.scope);
      controller.values.productSpuIds = [round, round + 1];
      await scopeProps.onChange(PromotionProductScopeEnum.CATEGORY.scope);
      controller.values.productCategoryIds = round;
      await scopeProps.onChange(PromotionProductScopeEnum.ALL.scope);
    }

    expect(controller.values).toMatchObject({
      productCategoryIds: undefined,
      productScope: PromotionProductScopeEnum.ALL.scope,
      productSpuIds: [],
    });
    expect(controller.metrics).toEqual({ resolves: 150, writes: 150 });
  });

  it('excludes hidden product selectors from required validation', async () => {
    const schemas = useFormSchema();
    async function isVisible(fieldName: string, productScope: number) {
      const schema = schemas.find((item) => item.fieldName === fieldName);
      const dependencies = schema?.dependencies;
      if (!dependencies || !('resolve' in dependencies)) return false;
      const result = await dependencies.resolve?.({
        actions: {},
        controller: {},
        schema,
        values: { productScope },
      } as never);
      return result?.show;
    }

    await expect(
      isVisible('productSpuIds', PromotionProductScopeEnum.CATEGORY.scope),
    ).resolves.toBe(false);
    await expect(
      isVisible('productCategoryIds', PromotionProductScopeEnum.SPU.scope),
    ).resolves.toBe(false);
    await expect(
      isVisible('productSpuIds', PromotionProductScopeEnum.SPU.scope),
    ).resolves.toBe(true);
  });

  it('hydrates each API scope without leaking inactive values', async () => {
    const controller = createCouponFormController();
    await controller.hydrate({
      discountLimitPrice: 300,
      discountPrice: 1250,
      id: 7,
      productScope: PromotionProductScopeEnum.SPU.scope,
      productScopeValues: [4, 5],
      usePrice: 5000,
    });
    expect(controller.values).toMatchObject({
      discountLimitPrice: '3.00',
      discountPrice: '12.50',
      productCategoryIds: undefined,
      productSpuIds: [4, 5],
      usePrice: '50.00',
    });

    await controller.hydrate({
      discountLimitPrice: 0,
      discountPrice: 100,
      productScope: PromotionProductScopeEnum.CATEGORY.scope,
      productScopeValues: [9],
      usePrice: 0,
    });
    expect(controller.values).toMatchObject({
      productCategoryIds: 9,
      productSpuIds: [],
    });
  });

  it('submits the exact active-scope payload and converts all money fields', async () => {
    const controller = createCouponFormController();
    await controller.hydrate({
      discountLimitPrice: 0,
      discountPrice: 0,
      productScope: PromotionProductScopeEnum.SPU.scope,
      productScopeValues: [1, 2],
      usePrice: 0,
    });
    Object.assign(controller.values, {
      discountLimitPrice: 6.5,
      discountPercent: 8.5,
      discountPrice: 12.34,
      takeType: 1,
      takeLimitCount: 2,
      totalCount: 20,
      usePrice: 30,
      validTimes: [new Date(10), new Date(20)],
    });
    expect(await controller.toPayload()).toEqual({
      discountLimitPrice: 650,
      discountPercent: 85,
      discountPrice: 1234,
      productCategoryIds: undefined,
      productScope: PromotionProductScopeEnum.SPU.scope,
      productScopeValues: [1, 2],
      productSpuIds: [1, 2],
      takeLimitCount: 2,
      takeType: 1,
      totalCount: 20,
      usePrice: 3000,
      validEndTime: new Date(20),
      validStartTime: new Date(10),
      validTimes: [new Date(10), new Date(20)],
    });
  });

  it('resets on close/reopen and unlocks without losing state on API failure', async () => {
    const controller = createCouponFormController();
    controller.values.productSpuIds = [8];
    await controller.close();
    await controller.open();
    expect(controller.values).toEqual({
      productCategoryIds: undefined,
      productScope: PromotionProductScopeEnum.ALL.scope,
      productSpuIds: [],
    });

    controller.values.productSpuIds = [3];
    const before = structuredClone(controller.values);
    await expect(
      controller.submit(async () => Promise.reject(new Error('network'))),
    ).rejects.toThrow('network');
    expect(controller.locked).toBe(false);
    expect(controller.values).toEqual(before);
  });
});
