/* eslint-disable vue/one-component-per-file */
import type { Component, PropType } from 'vue';

import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

const { getSpuMock, productFormTestState, submitAllFormMock } = vi.hoisted(
  () => ({
    getSpuMock: vi.fn(),
    productFormTestState: {
      onDescriptionUploadingChange: undefined as
        | ((uploading: boolean) => void)
        | undefined,
      permissions: [
        'product:youzan:import',
        'product:spu:create',
        'product:spu:update',
      ],
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

vi.mock('@vben/access', () => ({
  useAccess: () => ({
    hasAccessByCodes: (codes: string[]) =>
      codes.some((code) => productFormTestState.permissions.includes(code)),
  }),
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
            slots.multiSkuList?.(),
          ]);
      },
    });
    const api: Record<string, any> = {
      getValues: vi.fn(async () => values.value),
      validate: vi.fn(async () => ({ valid: true })),
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

vi.mock('#/api/mall/product/youzan-import', () => ({
  result: vi.fn(),
  supplement: vi.fn(),
  getProductDraft: vi.fn(),
  saveProductDraft: vi.fn(),
  publishProductDraft: vi.fn(),
  getAuthorizedYouzanProductMerchants: vi.fn(),
}));
vi.mock('#/api/mall/product/brand', () => ({ getSimpleBrandList: vi.fn() }));

vi.mock('#/views/mall/product/spu/components', () => ({
  getPropertyList: () => [],
  SkuList: defineComponent({
    props: {
      propFormData: {
        type: Object as PropType<{ skus: { price: number }[] }>,
        required: true,
      },
    },
    setup(props, { expose }) {
      expose({ validateSku: () => {} });
      return () =>
        h('input', {
          'data-testid': 'price',
          onInput: (event: Event) => {
            const sku = props.propFormData.skus[0]!;
            sku.price = Number((event.target as HTMLInputElement).value);
          },
        });
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
  let formInstance: {
    handleSubmit: () => Promise<void>;
    markUnsavedChanges: () => void;
  };

  afterEach(() => {
    app?.unmount();
    host?.remove();
    app = undefined;
    host = undefined;
    productFormTestState.onDescriptionUploadingChange = undefined;
    productFormTestState.permissions = [
      'product:youzan:import',
      'product:spu:create',
      'product:spu:update',
    ];
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
    const { default: ProductForm } = await import('./index.vue');
    app = createApp(ProductForm);
    const root = app.mount(host);
    formInstance = (root.$ as unknown as { setupState: typeof formInstance })
      .setupState;
    await flushVueUpdates();
    return host;
  }

  function saveButton(page: HTMLElement) {
    return [...page.querySelectorAll('button')].find(
      (button) => button.textContent?.replaceAll(/\s/g, '') === '保存',
    );
  }

  function changePrice(page: HTMLElement, value: string) {
    const input = page.querySelector<HTMLInputElement>(
      '[data-testid="price"]',
    )!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('导入补资料慢响应及返回后都不能再次保存或切到普通写接口', async () => {
    const { result, supplement } =
      await import('#/api/mall/product/youzan-import');
    const { createSpu, updateSpu } = await import('#/api/mall/product/spu');
    const snapshot = (bindingState: 'BOUND' | 'UNBOUND') => ({
      batchId: 'batch',
      merchantId: '2',
      confirmed: true,
      unusedColumns: [],
      lines: [
        {
          action: 'PENDING',
          bindingState,
          row: {
            number: 2,
            item: {
              key: { sku: 'S', product: 'P' },
              hints: {},
              name: '合成茶',
              specification: '',
              cents: 500,
              stock: 1,
            },
          },
        },
      ],
    });
    productFormTestState.route = {
      name: 'ProductSpuAdd',
      params: {},
      query: { yzProduct: 'P', yzBatch: 'batch', yzMerchant: '2' },
    };
    vi.mocked(result)
      .mockResolvedValueOnce(snapshot('UNBOUND'))
      .mockResolvedValueOnce(snapshot('BOUND'));
    let finish!: (id: number) => void;
    vi.mocked(supplement).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    submitAllFormMock.mockResolvedValue({ name: '合成茶' });
    const page = await openForm();
    const select = page.querySelector('select')!;
    select.value = 'S';
    select.dispatchEvent(new Event('change'));
    await nextTick();
    const save = saveButton(page)!;
    save.click();
    save.click();
    await vi.waitFor(() => expect(supplement).toHaveBeenCalledTimes(1));
    changePrice(page, '99');
    await nextTick();
    expect(save.disabled).toBe(true);
    save.click();
    finish(42);
    await vi.waitFor(() =>
      expect(page.textContent).toContain('来源商品已绑定'),
    );
    expect(saveButton(page)).toBeUndefined();
    expect(page.querySelector('[data-testid="price"]')).toBeNull();
    submitAllFormMock.mockResolvedValue({ name: '修改后的合成商品' });
    formInstance.markUnsavedChanges();
    const validations = submitAllFormMock.mock.calls.length;
    await formInstance.handleSubmit();
    expect(submitAllFormMock).toHaveBeenCalledTimes(validations);
    const returned = await openForm();
    await vi.waitFor(() =>
      expect(returned.textContent).toContain('来源商品已绑定'),
    );
    expect(saveButton(returned)).toBeUndefined();
    await formInstance.handleSubmit();
    expect(result).toHaveBeenCalledTimes(2);
    expect(supplement).toHaveBeenCalledTimes(1);
    expect(createSpu).not.toHaveBeenCalled();
    expect(updateSpu).not.toHaveBeenCalled();
  });

  const unassigned = {
    batchId: 'batch',
    confirmed: true,
    unusedColumns: [],
    lines: [
      {
        action: 'PENDING',
        bindingState: 'UNBOUND' as const,
        row: {
          number: 2,
          item: {
            key: { sku: 'S', product: 'P' },
            hints: {},
            name: '合成茶',
            specification: '单盒',
            cents: 500,
            stock: 2,
          },
        },
      },
    ],
  };

  it('保存未填完的草稿并在重新打开时还原商品字段、规格映射和修改的价格', async () => {
    const api = await import('#/api/mall/product/youzan-import');
    const spu = await import('#/api/mall/product/spu');
    productFormTestState.permissions = ['product:youzan:import'];
    productFormTestState.route = {
      name: 'ProductSpuAdd',
      params: {},
      query: { yzProduct: 'P', yzBatch: 'batch' },
    };
    vi.mocked(api.result).mockResolvedValue(unassigned);
    vi.mocked(api.getProductDraft).mockResolvedValueOnce({
      form: null,
      sourceByProperties: {},
      merchantId: null,
      spuId: null,
    });
    const page = await openForm();
    await vi.waitFor(() => expect(page.textContent).toContain('合成茶'));
    expect(page.textContent).not.toContain('发布上架');
    const select = page.querySelector('select')!;
    select.value = 'S';
    select.dispatchEvent(new Event('change'));
    changePrice(page, '9.25');
    await nextTick();
    const save = [...page.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('保存草稿'),
    )!;
    save.click();
    await vi.waitFor(() => expect(api.saveProductDraft).toHaveBeenCalledOnce());
    const [saved] = vi.mocked(api.saveProductDraft).mock.calls[0]!;
    expect(saved).toMatchObject({
      batchId: 'batch',
      product: 'P',
      form: {
        name: '合成茶',
        skus: [expect.objectContaining({ price: 925, stock: 2 })],
      },
      sourceByProperties: { '': 'S' },
    });
    expect(saved.form).not.toHaveProperty('merchantId');
    expect(submitAllFormMock).not.toHaveBeenCalled();
    vi.mocked(api.getProductDraft).mockResolvedValueOnce({
      ...saved,
      form: { ...saved.form, name: '已修改的茶' },
      merchantId: null,
      spuId: null,
    });
    const reopened = await openForm();
    await vi.waitFor(() =>
      expect(reopened.textContent).toContain('已修改的茶'),
    );
    expect(reopened.querySelector('select')!.value).toBe('S');
    expect(api.getAuthorizedYouzanProductMerchants).not.toHaveBeenCalled();
    expect(spu.createSpu).not.toHaveBeenCalled();
    expect(spu.updateSpu).not.toHaveBeenCalled();
  });

  it('只在单件发布时加载商家和品牌，显式确认后发布', async () => {
    const api = await import('#/api/mall/product/youzan-import');
    const { getSimpleBrandList } = await import('#/api/mall/product/brand');
    productFormTestState.route = {
      name: 'ProductSpuAdd',
      params: {},
      query: { yzProduct: 'P', yzBatch: 'batch' },
    };
    vi.mocked(api.result).mockResolvedValue(unassigned);
    vi.mocked(api.getProductDraft).mockResolvedValueOnce({
      form: { name: '已编辑草稿', skus: [{ price: 925, stock: 2 }] },
      sourceByProperties: { '': 'S' },
      merchantId: null,
      spuId: null,
    });
    const merchant = '9007199254740993';
    vi.mocked(api.getAuthorizedYouzanProductMerchants).mockResolvedValueOnce([
      { id: merchant, name: '茶铺' },
    ]);
    vi.mocked(getSimpleBrandList).mockResolvedValueOnce([
      { id: 12, name: '茶品牌', picUrl: '', sort: 0, status: 0 },
    ]);
    const page = await openForm();
    await vi.waitFor(() => expect(page.textContent).toContain('已编辑草稿'));
    expect(api.getAuthorizedYouzanProductMerchants).not.toHaveBeenCalled();
    const button = (name: string) =>
      [...document.querySelectorAll('button')].find(
        (item) => item.textContent?.trim() === name,
      )!;
    button('发布上架').click();
    await vi.waitFor(() => expect(button('确认上架')).toBeDefined());
    expect(button('确认上架').disabled).toBe(true);
    async function selectOption(index: number, label: string) {
      const selects = document.querySelectorAll(
        '.ant-modal .ant-select-selector',
      );
      selects[index]!.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
      const option = () =>
        [
          ...document.querySelectorAll<HTMLElement>('.ant-select-item-option'),
        ].find((item) => item.textContent?.includes(label));
      await vi.waitFor(() => expect(option()).toBeDefined());
      option()!.click();
    }
    await selectOption(0, '茶铺');
    await vi.waitFor(() =>
      expect(getSimpleBrandList).toHaveBeenCalledWith({ merchantId: merchant }),
    );
    await selectOption(1, '茶品牌');
    await vi.waitFor(() => expect(button('确认上架').disabled).toBe(false));
    expect(api.publishProductDraft).not.toHaveBeenCalled();
    button('确认上架').click();
    await vi.waitFor(() => expect(page.textContent).toContain('商品已上架'));
    expect(api.publishProductDraft).toHaveBeenCalledWith(
      merchant,
      expect.objectContaining({
        batchId: 'batch',
        product: 'P',
        form: expect.objectContaining({
          brandId: 12,
          skus: [expect.objectContaining({ price: 925 })],
        }),
      }),
    );
  });

  it('加载失败后阻止普通商品写入，重试后可继续编辑', async () => {
    const api = await import('#/api/mall/product/youzan-import');
    const spu = await import('#/api/mall/product/spu');
    productFormTestState.route = {
      name: 'ProductSpuAdd',
      params: {},
      query: { yzProduct: 'P', yzBatch: 'batch' },
    };
    vi.mocked(api.result).mockResolvedValue(unassigned);
    vi.mocked(api.getProductDraft)
      .mockRejectedValueOnce(new Error('草稿加载失败'))
      .mockResolvedValueOnce({
        form: null,
        sourceByProperties: {},
        merchantId: null,
        spuId: null,
      });
    const page = await openForm();
    await vi.waitFor(() =>
      expect(page.textContent).toContain('商品详情加载失败'),
    );
    await formInstance.handleSubmit();
    expect(api.saveProductDraft).not.toHaveBeenCalled();
    expect(spu.createSpu).not.toHaveBeenCalled();
    const retry = [...page.querySelectorAll('button')].find(
      (item) => item.textContent?.replaceAll(/\s/g, '') === '重试',
    )!;
    retry.click();
    await vi.waitFor(() => expect(page.textContent).toContain('合成茶'));
  });

  it('普通编辑入口修改价格仍调用 updateSpu', async () => {
    const { supplement } = await import('#/api/mall/product/youzan-import');
    const { createSpu, updateSpu } = await import('#/api/mall/product/spu');
    productFormTestState.route = {
      name: 'ProductSpuEdit',
      params: { id: '42' },
    };
    getSpuMock.mockResolvedValue({
      id: 42,
      name: '合成茶',
      skus: [{ price: 500, stock: 1 }],
      sliderPicUrls: [],
    });
    submitAllFormMock.mockResolvedValue({ id: 42, name: '合成茶' });
    const page = await openForm();
    await vi.waitFor(() => expect(page.textContent).toContain('合成茶'));
    await flushVueUpdates();
    changePrice(page, '7');
    await nextTick();
    saveButton(page)!.click();
    await vi.waitFor(() =>
      expect(updateSpu).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 42,
          skus: [expect.objectContaining({ price: 700 })],
        }),
      ),
    );
    expect(createSpu).not.toHaveBeenCalled();
    expect(supplement).not.toHaveBeenCalled();
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
