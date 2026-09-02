/* eslint-disable vue/one-component-per-file */
import type { Component } from 'vue';

import { globalShareState } from '@vben/common-ui';
import { PromotionProductScopeEnum } from '@vben/constants';
import { createPinia, setActivePinia } from 'pinia';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  COMPONENT_BIND_EVENT_MAP,
  COMPONENT_MAP,
} from '../../../../../../../../packages/@core/ui-kit/form-ui/src/config';
import { initSetupVbenForm, useVbenForm } from '#/adapter/form';

import {
  createCouponScopeChangeHandler,
  createDefaultCouponFormData,
  processCouponLoadData,
  processCouponSubmitData,
  submitCouponTemplateForm,
  syncCouponTemplateFormOpen,
  useFormSchema,
} from './data';

const RadioGroup = defineComponent({
  emits: ['change', 'update:value'],
  setup(_props, { emit }) {
    return () =>
      h(
        'div',
        [
          PromotionProductScopeEnum.ALL.scope,
          PromotionProductScopeEnum.SPU.scope,
          PromotionProductScopeEnum.CATEGORY.scope,
        ].map((scope) =>
          h(
            'button',
            {
              'data-scope': scope,
              onClick: () => {
                emit('update:value', scope);
                emit('change', { target: { value: scope } });
              },
              type: 'button',
            },
            String(scope),
          ),
        ),
      );
  },
});

const Input = defineComponent({
  props: { value: null },
  setup: (props) => () =>
    h('output', { 'data-value': JSON.stringify(props.value) }),
});

const originalComponents = globalShareState.getComponents();
const originalRadio = COMPONENT_MAP.RadioGroup;
const originalInput = COMPONENT_MAP.Input;
const originalRadioEvent = COMPONENT_BIND_EVENT_MAP.RadioGroup;
const originalInputEvent = COMPONENT_BIND_EVENT_MAP.Input;

describe('coupon template real form boundaries', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];

  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => {
    apps.splice(0).forEach((app) => app.unmount());
    globalShareState.setComponents(originalComponents);
    COMPONENT_MAP.RadioGroup = originalRadio as Component;
    COMPONENT_MAP.Input = originalInput as Component;
    COMPONENT_BIND_EVENT_MAP.RadioGroup = originalRadioEvent;
    COMPONENT_BIND_EVENT_MAP.Input = originalInputEvent;
    document.body.innerHTML = '';
  });

  async function mountScopeForm() {
    globalShareState.setComponents({ Input, RadioGroup });
    await initSetupVbenForm();
    let formApi!: ReturnType<typeof useVbenForm>[1];
    let writes = 0;
    const handler = createCouponScopeChangeHandler({
      async setValues(values) {
        writes++;
        await formApi.setValues(values);
      },
    });
    const schema = useFormSchema(handler).filter(({ fieldName }) =>
      ['productCategoryIds', 'productScope', 'productSpuIds'].includes(
        fieldName,
      ),
    );
    let resolutions = 0;
    for (const item of schema) {
      const dependencies = item.dependencies;
      if (dependencies && 'resolve' in dependencies && dependencies.resolve) {
        const resolve = dependencies.resolve;
        dependencies.resolve = async (context) => {
          resolutions++;
          return await resolve(context);
        };
      }
    }
    let Form;
    [Form, formApi] = useVbenForm({ schema, showDefaultActions: false });
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({ render: () => h(Form) });
    apps.push(app);
    app.mount(host);
    await formApi.reset({ values: createDefaultCouponFormData() });
    await nextTick();
    return {
      formApi,
      host,
      resolutions: () => resolutions,
      writes: () => writes,
    };
  }

  async function click(host: HTMLElement, scope: number) {
    host
      .querySelector<HTMLButtonElement>(`button[data-scope="${scope}"]`)
      ?.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await nextTick();
  }

  it('uses Ant RadioChangeEvent and updates real form visibility and payload', async () => {
    const { formApi, host } = await mountScopeForm();
    await click(host, PromotionProductScopeEnum.SPU.scope);
    await formApi.setFieldValue('productSpuIds', [11, 12]);
    expect(await formApi.getValues()).toMatchObject({
      productScope: PromotionProductScopeEnum.SPU.scope,
      productSpuIds: [11, 12],
    });
    expect(
      processCouponSubmitData(await formApi.getValues()).productScopeValues,
    ).toEqual([11, 12]);

    await click(host, PromotionProductScopeEnum.CATEGORY.scope);
    await formApi.setFieldValue('productCategoryIds', 9);
    expect(
      processCouponSubmitData(await formApi.getValues()).productScopeValues,
    ).toEqual([9]);

    await click(host, PromotionProductScopeEnum.ALL.scope);
    expect(
      processCouponSubmitData(await formApi.getValues()).productScopeValues,
    ).toEqual([]);
  });

  it('excludes hidden required selectors from mounted form validation', async () => {
    const { formApi, host } = await mountScopeForm();
    await click(host, PromotionProductScopeEnum.ALL.scope);
    await expect(formApi.validate()).resolves.toMatchObject({ valid: true });
    await click(host, PromotionProductScopeEnum.SPU.scope);
    await expect(formApi.validate()).resolves.toMatchObject({ valid: false });
  });

  it('runs fifty real form-engine rounds within strict resolve/write bounds', async () => {
    const { formApi, host, resolutions, writes } = await mountScopeForm();
    const startResolutions = resolutions();
    const startWrites = writes();
    for (let round = 0; round < 50; round++) {
      await click(host, PromotionProductScopeEnum.SPU.scope);
      await formApi.setFieldValue('productSpuIds', [round, round + 1]);
      await click(host, PromotionProductScopeEnum.CATEGORY.scope);
      await formApi.setFieldValue('productCategoryIds', round + 1);
      await click(host, PromotionProductScopeEnum.ALL.scope);
    }
    expect(writes() - startWrites).toBe(150);
    expect(resolutions() - startResolutions).toBeGreaterThanOrEqual(300);
    expect(resolutions() - startResolutions).toBeLessThanOrEqual(306);
    expect(await formApi.getValues()).toMatchObject({
      productCategoryIds: undefined,
      productScope: PromotionProductScopeEnum.ALL.scope,
      productSpuIds: [],
    });
  });

  it('serializes delayed rapid scope writes so the latest event wins', async () => {
    const releases: Array<() => void> = [];
    const state = createDefaultCouponFormData();
    const handler = createCouponScopeChangeHandler({
      setValues: vi.fn(
        (values) =>
          new Promise<void>((resolve) => {
            releases.push(() => {
              Object.assign(state, values);
              resolve();
            });
          }),
      ),
    });
    const first = handler({
      target: { value: PromotionProductScopeEnum.SPU.scope },
    });
    const second = handler({
      target: { value: PromotionProductScopeEnum.CATEGORY.scope },
    });
    while (releases.length < 1) await Promise.resolve();
    releases[0]?.();
    await first;
    while (releases.length < 2) await Promise.resolve();
    releases[1]?.();
    await second;
    expect(state.productScope).toBe(PromotionProductScopeEnum.CATEGORY.scope);
  });

  it('recovers after a rejected scope write and handles empty and repeated events', async () => {
    const scopes: number[] = [];
    let writes = 0;
    const handler = createCouponScopeChangeHandler({
      async setValues(values) {
        writes++;
        if (writes === 2) throw new Error('scope write failed');
        scopes.push(values.productScope!);
      },
    });
    const results = await Promise.allSettled([
      handler({ target: { value: PromotionProductScopeEnum.SPU.scope } }),
      handler({ target: { value: PromotionProductScopeEnum.SPU.scope } }),
      handler({ target: { value: null } }),
      handler({ target: { value: PromotionProductScopeEnum.CATEGORY.scope } }),
    ]);
    expect(results.map(({ status }) => status)).toEqual([
      'fulfilled',
      'rejected',
      'fulfilled',
      'fulfilled',
    ]);
    expect(writes).toBe(4);
    expect(scopes).toEqual([
      PromotionProductScopeEnum.SPU.scope,
      PromotionProductScopeEnum.ALL.scope,
      PromotionProductScopeEnum.CATEGORY.scope,
    ]);
  });

  it('keeps real lifecycle codecs for hydrate and exact submit payload', () => {
    const loaded = processCouponLoadData({
      discountLimitPrice: 300,
      discountPrice: 1250,
      productScope: PromotionProductScopeEnum.SPU.scope,
      productScopeValues: [4, 5],
      usePrice: 5000,
    });
    expect(loaded).toMatchObject({
      productSpuIds: [4, 5],
      discountPrice: '12.50',
    });
    expect(processCouponSubmitData(loaded).productScopeValues).toEqual([4, 5]);
  });

  it('builds the exact API payload used by the production submit boundary', () => {
    expect(
      processCouponSubmitData({
        discountLimitPrice: 6.5,
        discountPercent: 8.5,
        discountPrice: 12.34,
        productCategoryIds: undefined,
        productScope: PromotionProductScopeEnum.SPU.scope,
        productSpuIds: [1, 2],
        takeLimitCount: 2,
        takeType: 1,
        totalCount: 20,
        usePrice: 30,
        validTimes: [new Date(10), new Date(20)],
      }),
    ).toEqual({
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

  it('unlocks and preserves real form state when submit API fails', async () => {
    const { formApi } = await mountScopeForm();
    await formApi.setValues({
      productScope: PromotionProductScopeEnum.SPU.scope,
      productSpuIds: [21, 22],
    });
    const before = await formApi.getValues();
    const modalApi = { close: vi.fn(), lock: vi.fn(), unlock: vi.fn() };
    await expect(
      submitCouponTemplateForm({
        createCouponTemplate: vi.fn().mockRejectedValue(new Error('network')),
        editingId: undefined,
        formApi,
        modalApi,
        onSuccess: vi.fn(),
        updateCouponTemplate: vi.fn(),
      }),
    ).rejects.toThrow('network');
    expect(modalApi.lock).toHaveBeenCalledOnce();
    expect(modalApi.unlock).toHaveBeenCalledOnce();
    expect(modalApi.close).not.toHaveBeenCalled();
    expect(await formApi.getValues()).toEqual(before);
  });

  it('hydrates edits and resets close/reopen through the real form API', async () => {
    const { formApi } = await mountScopeForm();
    let editingId: number | undefined;
    const modalApi = {
      getData: () => ({ id: 7 }),
      lock: vi.fn(),
      unlock: vi.fn(),
    };
    const boundary = (isOpen: boolean) =>
      syncCouponTemplateFormOpen({
        formApi,
        getCouponTemplate: vi.fn().mockResolvedValue({
          discountLimitPrice: 0,
          discountPrice: 100,
          id: 7,
          productScope: PromotionProductScopeEnum.CATEGORY.scope,
          productScopeValues: [9],
          usePrice: 0,
        }),
        isOpen,
        modalApi,
        setEditingId(value) {
          editingId = value;
        },
      });
    await boundary(true);
    expect(editingId).toBe(7);
    expect(await formApi.getValues()).toMatchObject({
      productCategoryIds: 9,
      productScope: PromotionProductScopeEnum.CATEGORY.scope,
      productSpuIds: [],
    });
    await boundary(false);
    expect(editingId).toBeUndefined();
    expect(await formApi.getValues()).toEqual({
      productScope: PromotionProductScopeEnum.ALL.scope,
      productSpuIds: [],
    });
  });
});
