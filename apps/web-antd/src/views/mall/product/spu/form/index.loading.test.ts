/* eslint-disable vue/one-component-per-file */
import type { Component } from 'vue';

import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

const { getSpuMock } = vi.hoisted(() => ({
  getSpuMock: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'ProductSpuDetail', params: { id: '1' } }),
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
      submitAllForm: vi.fn(async () => ({})),
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
  useDescriptionFormSchema: () => [],
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
    vi.clearAllMocks();
  });

  it('详情骨架开启时仍能完成表单回填并显示内容', async () => {
    getSpuMock.mockResolvedValue({
      id: 1,
      name: '测试商品',
      skus: [],
      sliderPicUrls: [],
    });
    const ProductForm = (await import('./index.vue')).default as Component;
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
});
