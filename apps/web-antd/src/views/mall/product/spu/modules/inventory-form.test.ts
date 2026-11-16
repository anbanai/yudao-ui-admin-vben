/* eslint-disable vue/one-component-per-file */
import type { Component } from 'vue';

import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  getSpu: vi.fn(),
  messageError: vi.fn(),
  messageInfo: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
  modalApi: {
    close: vi.fn(async () => undefined),
    getData: vi.fn(() => ({ id: 10 })),
    lock: vi.fn(),
    unlock: vi.fn(),
  },
  modalOptions: undefined as
    | undefined
    | {
        onConfirm?: () => Promise<void> | void;
        onOpenChange?: (open: boolean) => Promise<void> | void;
      },
  updateSpu: vi.fn(),
}));

vi.mock('@vben/common-ui', () => ({
  useVbenModal: (options: typeof testState.modalOptions) => {
    testState.modalOptions = options;
    return [
      defineComponent({
        setup(_, { slots }) {
          return () => h('section', slots.default?.());
        },
      }),
      testState.modalApi,
    ] as const;
  },
}));

vi.mock('@vben/icons', () => ({
  IconifyIcon: defineComponent(() => () => h('span')),
}));

vi.mock('ant-design-vue', () => {
  const SlotComponent = defineComponent({
    setup(_, { slots }) {
      return () => h('div', slots.default?.());
    },
  });
  const InputNumber = defineComponent({
    props: { value: { default: undefined, type: Number } },
    emits: ['update:value'],
    setup(props, { emit }) {
      return () =>
        h('input', {
          class: 'stock-input',
          onInput: (event: Event) => {
            emit(
              'update:value',
              Number((event.target as HTMLInputElement).value),
            );
          },
          value: props.value,
        });
    },
  });
  const Table = defineComponent({
    props: {
      columns: { default: () => [], type: Array },
      dataSource: { default: () => [], type: Array },
    },
    setup(props, { slots }) {
      return () =>
        h(
          'div',
          props.dataSource.flatMap((record) =>
            props.columns.map((column) =>
              h('div', slots.bodyCell?.({ column, record })),
            ),
          ),
        );
    },
  });
  return {
    Alert: SlotComponent,
    Image: SlotComponent,
    InputNumber,
    message: {
      error: testState.messageError,
      info: testState.messageInfo,
      success: testState.messageSuccess,
      warning: testState.messageWarning,
    },
    Table,
    Tag: SlotComponent,
  };
});

vi.mock('#/api/mall/product/spu', () => ({
  getSpu: testState.getSpu,
  updateSpu: testState.updateSpu,
}));

async function flushVueUpdates() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

describe('商品库存管理弹窗', () => {
  let app: ReturnType<typeof createApp> | undefined;
  let host: HTMLDivElement | undefined;

  afterEach(() => {
    app?.unmount();
    host?.remove();
    app = undefined;
    host = undefined;
    testState.modalOptions = undefined;
    vi.clearAllMocks();
  });

  async function mountInventoryForm() {
    const { default: InventoryForm } = await import('./inventory-form.vue');
    host = document.createElement('div');
    document.body.append(host);
    app = createApp(InventoryForm as Component);
    app.mount(host);
    await nextTick();
  }

  it('保存时重新获取商品并保留未编辑 SKU 的最新库存', async () => {
    testState.getSpu
      .mockResolvedValueOnce({
        id: 10,
        name: '测试商品',
        skus: [
          { id: 101, stock: 30 },
          { id: 102, stock: 20 },
        ],
      })
      .mockResolvedValueOnce({
        id: 10,
        name: '测试商品',
        skus: [
          { id: 101, stock: 30 },
          { id: 102, stock: 32 },
        ],
      });
    testState.updateSpu.mockResolvedValue(undefined);
    await mountInventoryForm();

    await testState.modalOptions?.onOpenChange?.(true);
    await flushVueUpdates();
    const inputs = host!.querySelectorAll<HTMLInputElement>('.stock-input');
    expect(inputs).toHaveLength(2);
    inputs[0]!.value = '60';
    inputs[0]!.dispatchEvent(new Event('input'));
    await nextTick();

    await testState.modalOptions?.onConfirm?.();

    expect(testState.getSpu).toHaveBeenNthCalledWith(2, 10);
    expect(testState.updateSpu).toHaveBeenCalledOnce();
    expect(testState.updateSpu.mock.calls[0]?.[0].skus).toEqual([
      { id: 101, stock: 60 },
      { id: 102, stock: 32 },
    ]);
  });

  it('详情加载失败时给出错误提示并关闭弹窗', async () => {
    testState.getSpu.mockRejectedValueOnce(new Error('network error'));
    await mountInventoryForm();

    await expect(
      testState.modalOptions?.onOpenChange?.(true),
    ).resolves.toBeUndefined();

    expect(testState.messageError).toHaveBeenCalledWith(
      '商品详情加载失败，请稍后重试',
    );
    expect(testState.modalApi.close).toHaveBeenCalledOnce();
  });

  it('保存时已编辑 SKU 被删除则提示冲突并刷新最新规格', async () => {
    testState.getSpu
      .mockResolvedValueOnce({
        id: 10,
        name: '测试商品',
        skus: [
          { id: 101, stock: 30 },
          { id: 102, stock: 20 },
        ],
      })
      .mockResolvedValueOnce({
        id: 10,
        name: '测试商品',
        skus: [{ id: 102, stock: 32 }],
      });
    await mountInventoryForm();

    await testState.modalOptions?.onOpenChange?.(true);
    await flushVueUpdates();
    const firstInput = host!.querySelector<HTMLInputElement>('.stock-input');
    expect(firstInput).not.toBeNull();
    firstInput!.value = '60';
    firstInput!.dispatchEvent(new Event('input'));
    await nextTick();

    await expect(
      testState.modalOptions?.onConfirm?.(),
    ).resolves.toBeUndefined();
    await flushVueUpdates();

    expect(testState.updateSpu).not.toHaveBeenCalled();
    expect(testState.messageWarning).toHaveBeenCalledWith(
      '商品规格已发生变化，请重新调整库存',
    );
    const refreshedInputs =
      host!.querySelectorAll<HTMLInputElement>('.stock-input');
    expect(refreshedInputs).toHaveLength(1);
    expect(refreshedInputs[0]?.value).toBe('32');
  });

  it('保存请求失败时保留库存草稿并解除弹窗锁定', async () => {
    testState.getSpu.mockResolvedValue({
      id: 10,
      name: '测试商品',
      skus: [{ id: 101, stock: 30 }],
    });
    testState.updateSpu.mockRejectedValueOnce(new Error('save failed'));
    await mountInventoryForm();

    await testState.modalOptions?.onOpenChange?.(true);
    await flushVueUpdates();
    const input = host!.querySelector<HTMLInputElement>('.stock-input');
    expect(input).not.toBeNull();
    input!.value = '60';
    input!.dispatchEvent(new Event('input'));
    await nextTick();
    testState.modalApi.unlock.mockClear();

    await expect(testState.modalOptions?.onConfirm?.()).rejects.toThrow(
      'save failed',
    );
    await flushVueUpdates();

    expect(testState.modalApi.close).not.toHaveBeenCalled();
    expect(testState.modalApi.unlock).toHaveBeenCalledOnce();
    expect(host!.querySelector<HTMLInputElement>('.stock-input')?.value).toBe(
      '60',
    );
  });
});
