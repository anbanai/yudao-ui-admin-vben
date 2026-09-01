/* eslint-disable vue/one-component-per-file */
import type { Component } from 'vue';

import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

const { getSpuMock, productFormTestState, submitAllFormMock } = vi.hoisted(
  () => ({
    getSpuMock: vi.fn(),
    productFormTestState: {
      onDescriptionUploadingChange: undefined as
        | ((uploading: boolean) => void)
        | undefined,
      route: { name: 'ProductSpuDetail', params: { id: '1' } } as {
        name: string;
        params: Record<string, string>;
      },
    },
    submitAllFormMock: vi.fn(async () => ({})),
  }),
);

vi.mock('vue-router', () => ({
  useRoute: () => productFormTestState.route,
}));

vi.mock('@vben/common-ui', () => ({
  Page: defineComponent({
    name: 'TestPage',
    setup(_, { slots }) {
      return () => h('main', slots.default?.());
    },
  }),
  useVbenModal: () => [defineComponent(() => () => null), { open: vi.fn() }],
}));

vi.mock('@vben/hooks', () => ({
  useTabs: () => ({ closeCurrentTab: vi.fn() }),
}));

vi.mock('@vben/utils', () => ({
  convertToInteger: (value: number) => value * 100,
  formatToFraction: (value: number) => value / 100,
}));

vi.mock('#/adapter/form', () => ({
  useVbenForm: () => {
    let mounted = false;
    let resolveMounted: (() => void) | undefined;
    const values = ref<Record<string, any>>({});
    const mountedPromise = new Promise<void>((resolve) => {
      resolveMounted = resolve;
    });
    const Form = defineComponent({
      name: 'TestForm',
      setup(_, { slots }) {
        mounted = true;
        resolveMounted?.();
        return () =>
          h('section', { 'data-testid': 'product-form' }, [
            values.value.name,
            slots.default?.(),
          ]);
      },
    });
    const api: Record<string, any> = {
      getValues: vi.fn(async () => ({})),
      merge: vi.fn(() => api),
      setDisabled: vi.fn(),
      setValues: vi.fn(async (fields: Record<string, any>) => {
        if (!mounted) {
          await mountedPromise;
        }
        values.value = fields;
      }),
      submitAllForm: submitAllFormMock,
      updateSchema: vi.fn(),
    };
    return [Form, api];
  },
}));

vi.mock('#/api/mall/product/spu', () => ({
  createSpu: vi.fn(),
  getSpu: getSpuMock,
  updateSpu: vi.fn(),
}));

vi.mock('#/utils/operation-feedback', () => ({
  withOperationFeedback: vi.fn(),
}));

vi.mock('#/views/mall/product/spu/components', () => ({
  getPropertyList: () => [],
  SkuList: defineComponent(() => () => h('div')),
}));

vi.mock('./data', () => ({
  useDeliveryFormSchema: () => [],
  useDescriptionFormSchema: (
    onUploadingChange?: (uploading: boolean) => void,
  ) => {
    productFormTestState.onDescriptionUploadingChange = onUploadingChange;
    return [];
  },
  useInfoFormSchema: () => [],
  useOtherFormSchema: () => [],
  useSkuFormSchema: () => [],
}));

vi.mock('./modules/product-attributes.vue', () => ({
  default: defineComponent(() => () => h('div')),
}));

vi.mock('./modules/product-property-add-form.vue', () => ({
  default: defineComponent(() => () => h('div')),
}));

async function flushVueUpdates() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

describe('商品 SPU 详情加载', () => {
  let app: ReturnType<typeof createApp> | undefined;
  let host: HTMLDivElement | undefined;

  afterEach(() => {
    app?.unmount();
    host?.remove();
    app = undefined;
    host = undefined;
    productFormTestState.onDescriptionUploadingChange = undefined;
    productFormTestState.route = {
      name: 'ProductSpuDetail',
      params: { id: '1' },
    };
    vi.clearAllMocks();
  });

  it('详情骨架开启时仍能完成表单回填并显示内容', async () => {
    getSpuMock.mockResolvedValue({
      id: 1,
      name: '测试商品',
      skus: [],
      sliderPicUrls: [],
    });
    const productFormModule = await import('./index.vue');
    const ProductForm = productFormModule.default as Component;
    host = document.createElement('div');
    document.body.append(host);
    app = createApp(ProductForm);
    app.mount(host);

    await flushVueUpdates();

    expect(getSpuMock).toHaveBeenCalledWith('1');
    expect(host.querySelector('.ant-card-loading')).toBeNull();
    const forms = host.querySelectorAll('[data-testid="product-form"]');
    expect(forms).toHaveLength(5);
    expect([...forms].every((form) => form.textContent === '测试商品')).toBe(
      true,
    );
  });

  it('商品详情图片上传期间禁用保存', async () => {
    productFormTestState.route = { name: 'ProductSpuCreate', params: {} };
    const productFormModule = await import('./index.vue');
    const ProductForm = productFormModule.default as Component;
    host = document.createElement('div');
    document.body.append(host);
    app = createApp(ProductForm);
    app.mount(host);
    await flushVueUpdates();

    const saveButton = [...host.querySelectorAll('button')].find(
      (button) => button.textContent?.replaceAll(/\s/g, '') === '保存',
    );
    expect(saveButton).toBeDefined();
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);

    productFormTestState.onDescriptionUploadingChange?.(true);
    await nextTick();

    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    saveButton?.click();
    expect(submitAllFormMock).not.toHaveBeenCalled();
  });
});
