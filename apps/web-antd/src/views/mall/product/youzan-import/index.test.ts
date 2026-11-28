import type { Slots } from 'vue';

import type { Batch } from '#/api/mall/product/youzan-import';

import { createApp, h } from 'vue';

import { expect, it, vi } from 'vitest';

import * as api from '#/api/mall/product/youzan-import';

import ProductImport from './index.vue';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));
vi.mock('@vben/access', () => ({
  useAccess: () => ({
    hasAccessByCodes: (codes: string[]) =>
      codes.includes('product:youzan:import'),
  }),
}));
vi.mock('@vben/common-ui', () => ({
  Page: (_: unknown, { slots }: { slots: Slots }) =>
    h('main', [slots.extra?.(), slots.default?.()]),
}));
vi.mock('#/api/mall/product/youzan-import', () => ({
  confirmBatch: vi.fn(),
  preview: vi.fn(),
  result: vi.fn(),
  getAuthorizedYouzanProductMerchants: vi.fn(),
  listPendingProductBatches: vi.fn(),
}));

it('saves a product batch without a merchant and reopens it directly as an editable product draft', async () => {
  const batch: Batch = {
    batchId: '12345678-aaaa-aaaa-aaaa-123456789abc',
    confirmed: false,
    unusedColumns: [],
    lines: [
      {
        action: 'PENDING',
        row: {
          number: 2,
          item: {
            key: { product: 'P1', sku: 'S1' },
            name: '测试商品',
            specification: '单盒',
            stock: 1,
            cents: 100,
            hints: {},
          },
        },
      },
    ],
  };
  const pending: Batch = {
    ...batch,
    confirmed: true,
    lines: batch.lines.map((line) => ({ ...line, bindingState: 'UNBOUND' })),
  };
  vi.mocked(api.preview).mockResolvedValue(batch);
  vi.mocked(api.confirmBatch).mockResolvedValue(pending);
  vi.mocked(api.listPendingProductBatches).mockResolvedValue([batch.batchId]);
  vi.mocked(api.result).mockResolvedValue(pending);
  vi.mocked(api.getAuthorizedYouzanProductMerchants).mockResolvedValue([
    { id: '1', name: '平台自营' },
  ]);
  const host = document.createElement('div');
  document.body.append(host);
  let app = createApp(ProductImport);
  const button = (label: string) =>
    [...document.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === label,
    )!;
  try {
    app.mount(host);
    const file = new File(['fixture'], '商品.xlsx');
    const input = host.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(button('上传并预览').disabled).toBe(false));
    button('上传并预览').click();
    await vi.waitFor(() => expect(host.textContent).toContain('测试商品'));
    expect(api.preview).toHaveBeenCalledWith(file);
    expect(api.getAuthorizedYouzanProductMerchants).not.toHaveBeenCalled();
    button('确认导入').click();
    await vi.waitFor(() =>
      expect(host.textContent).toContain('已导入，可编辑商品草稿'),
    );
    expect(api.confirmBatch).toHaveBeenCalledWith(batch.batchId);
    expect(button('编辑草稿')).toBeDefined();

    app.unmount();
    app = createApp(ProductImport);
    app.mount(host);
    button('商品草稿批次').click();
    await vi.waitFor(() =>
      expect(button(`批次 ${batch.batchId}`)).toBeDefined(),
    );
    button(`批次 ${batch.batchId}`).click();
    await vi.waitFor(() => expect(button('编辑草稿')).toBeDefined());
    expect(api.result).toHaveBeenCalledWith(undefined, batch.batchId);
    button('编辑草稿').click();
    expect(push).toHaveBeenCalledWith({
      name: 'ProductSpuAdd',
      query: { yzBatch: batch.batchId, yzProduct: 'P1' },
    });
    expect(api.getAuthorizedYouzanProductMerchants).not.toHaveBeenCalled();
    vi.mocked(api.result).mockResolvedValueOnce({
      ...pending,
      lines: pending.lines.map((line) => ({ ...line, bindingState: 'BOUND' })),
    });
    button('刷新结果').click();
    await vi.waitFor(() =>
      expect(host.textContent).toContain('商品草稿已全部发布'),
    );
    expect(button('编辑草稿')).toBeUndefined();
  } finally {
    app.unmount();
    host.remove();
  }
});
