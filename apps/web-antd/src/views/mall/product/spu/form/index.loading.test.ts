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
      route: { name: 'ProductSpuDetail', params: { id: '1' }, query: {} } as {
        name: string;
        params: Record<string, string>;
        query?: Record<string, string>;
      },
    },
    submitAllFormMock: vi.fn(async () => ({})),
  }),
);

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, ...productFormTestState.route }),
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
            slots.default?.(), slots.multiSkuList?.(),
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
  withOperationFeedback: (operation: () => Promise<unknown>) => operation(),
}));

vi.mock('#/api/mall/product/youzan-import', () => ({ result: vi.fn(), supplement: vi.fn() }));

vi.mock('#/views/mall/product/spu/components', () => ({
  getPropertyList: () => [],
  SkuList: defineComponent({
    props: ['propFormData'],
    setup(props, { expose }) {
      expose({ validateSku: () => {} });
      return () => h('input', { 'data-testid': 'price', onInput: (event: Event) => {
        props.propFormData.skus[0].price = Number((event.target as HTMLInputElement).value);
      } });
    },
  }),
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
  let formInstance: { handleSubmit: () => Promise<void>; markUnsavedChanges: () => void };

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

  async function openForm() {
    app?.unmount();
    host?.remove();
    host = document.createElement('div');
    document.body.append(host);
    app = createApp((await import('./index.vue')).default);
    const root = app.mount(host);
    formInstance = (root.$ as unknown as { setupState: typeof formInstance }).setupState;
    await flushVueUpdates();
    return host;
  }

  function saveButton(page: HTMLElement) {
    return [...page.querySelectorAll('button')].find(button => button.textContent?.replaceAll(/\s/g, '') === '保存');
  }

  function changePrice(page: HTMLElement, value: string) {
    const input = page.querySelector<HTMLInputElement>('[data-testid="price"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('导入补资料慢响应及返回后都不能再次保存或切到普通写接口', async () => {
    const { result, supplement } = await import('#/api/mall/product/youzan-import');
    const { createSpu, updateSpu } = await import('#/api/mall/product/spu');
    const snapshot = (bindingState: 'BOUND' | 'UNBOUND') => ({ batchId: 'batch', confirmed: true, unusedColumns: [], lines: [{
      action: 'PENDING', bindingState, row: { number: 2, item: { key: { sku: 'S', product: 'P' }, hints: {}, name: '合成茶', specification: '', cents: 500, stock: 1 } },
    }] });
    productFormTestState.route = { name: 'ProductSpuAdd', params: {}, query: { yzProduct: 'P', yzBatch: 'batch', yzMerchant: '2' } };
    vi.mocked(result).mockResolvedValueOnce(snapshot('UNBOUND')).mockResolvedValueOnce(snapshot('BOUND'));
    let finish!: (id: number) => void;
    vi.mocked(supplement).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    submitAllFormMock.mockResolvedValue({ name: '合成茶' });
    const page = await openForm();
    const select = page.querySelector('select')!;
    select.value = 'S'; select.dispatchEvent(new Event('change'));
    await nextTick();
    const save = saveButton(page)!;
    save.click(); save.click();
    await vi.waitFor(() => expect(supplement).toHaveBeenCalledTimes(1));
    changePrice(page, '99');
    await nextTick();
    expect(save.disabled).toBe(true);
    save.click();
    finish(42);
    await vi.waitFor(() => expect(page.textContent).toContain('来源商品已绑定'));
    expect(saveButton(page)).toBeUndefined();
    expect(page.querySelector('[data-testid="price"]')).toBeNull();
    submitAllFormMock.mockResolvedValue({ name: '修改后的合成商品' });
    formInstance.markUnsavedChanges();
    const validations = submitAllFormMock.mock.calls.length;
    await formInstance.handleSubmit();
    expect(submitAllFormMock).toHaveBeenCalledTimes(validations);
    const returned = await openForm();
    await vi.waitFor(() => expect(returned.textContent).toContain('来源商品已绑定'));
    expect(saveButton(returned)).toBeUndefined();
    await formInstance.handleSubmit();
    expect(result).toHaveBeenCalledTimes(2);
    expect(supplement).toHaveBeenCalledTimes(1);
    expect(createSpu).not.toHaveBeenCalled(); expect(updateSpu).not.toHaveBeenCalled();
  });

  it('普通编辑入口修改价格仍调用 updateSpu', async () => {
    const { supplement } = await import('#/api/mall/product/youzan-import');
    const { createSpu, updateSpu } = await import('#/api/mall/product/spu');
    productFormTestState.route = { name: 'ProductSpuEdit', params: { id: '42' } };
    getSpuMock.mockResolvedValue({ id: 42, name: '合成茶', skus: [{ price: 500, stock: 1 }], sliderPicUrls: [] });
    submitAllFormMock.mockResolvedValue({ id: 42, name: '合成茶' });
    const page = await openForm();
    await vi.waitFor(() => expect(page.textContent).toContain('合成茶'));
    await flushVueUpdates();
    changePrice(page, '7');
    await nextTick();
    saveButton(page)!.click();
    await vi.waitFor(() => expect(updateSpu).toHaveBeenCalledWith(expect.objectContaining({ id: 42, skus: [expect.objectContaining({ price: 700 })] })));
    expect(createSpu).not.toHaveBeenCalled(); expect(supplement).not.toHaveBeenCalled();
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
