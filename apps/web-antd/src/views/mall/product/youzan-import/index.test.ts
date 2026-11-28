import type { Slots } from 'vue';

import type { Batch } from '#/api/mall/product/youzan-import';

import { createApp, h } from 'vue';

import { expect, it, vi } from 'vitest';

import * as api from '#/api/mall/product/youzan-import';

import ProductImport from './index.vue';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@vben/access', () => ({
  useAccess: () => ({ hasAccessByCodes: () => true }),
}));
vi.mock('@vben/common-ui', () => ({
  Page: (_: unknown, { slots }: { slots: Slots }) =>
    h('main', [slots.extra?.(), slots.default?.()]),
}));
vi.mock('#/api/mall/product/youzan-import', () => ({
  assignProductBatch: vi.fn(),
  confirmBatch: vi.fn(),
  preview: vi.fn(),
  result: vi.fn(),
  getAuthorizedYouzanProductMerchants: vi.fn(),
  listPendingProductBatches: vi.fn(),
}));

it('saves a product batch without a merchant and reopens it for explicit assignment', async () => {
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
  const pending = { ...batch, confirmed: true };
  vi.mocked(api.preview).mockResolvedValue(batch);
  vi.mocked(api.confirmBatch).mockResolvedValue(pending);
  vi.mocked(api.listPendingProductBatches).mockResolvedValue([batch.batchId]);
  vi.mocked(api.result).mockResolvedValue(pending);
  vi.mocked(api.getAuthorizedYouzanProductMerchants).mockResolvedValue([
    { id: '1', name: '平台自营' },
  ]);
  vi.mocked(api.assignProductBatch).mockResolvedValue({
    ...pending,
    merchantId: '1',
    lines: pending.lines.map((line) => ({ ...line, bindingState: 'UNBOUND' })),
  });

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
      expect(host.textContent).toContain('已导入，待分配商家'),
    );
    expect(api.confirmBatch).toHaveBeenCalledWith(batch.batchId);
    expect(button('确认分配').disabled).toBe(true);

    app.unmount();
    app = createApp(ProductImport);
    app.mount(host);
    button('待分配批次').click();
    await vi.waitFor(() =>
      expect(button(`批次 ${batch.batchId}`)).toBeDefined(),
    );
    button(`批次 ${batch.batchId}`).click();
    await vi.waitFor(() => expect(button('确认分配')).toBeDefined());
    expect(api.result).toHaveBeenCalledWith(undefined, batch.batchId);
    expect(button('确认分配').disabled).toBe(true);
    host
      .querySelector('.ant-select-selector')!
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await vi.waitFor(() =>
      expect(document.querySelector('.ant-select-item-option')).toBeTruthy(),
    );
    document.querySelector<HTMLElement>('.ant-select-item-option')!.click();
    await vi.waitFor(() => expect(button('确认分配').disabled).toBe(false));
    button('确认分配').click();
    await vi.waitFor(() => expect(button('补资料')).toBeDefined());
    expect(api.assignProductBatch).toHaveBeenCalledWith(batch.batchId, '1');
  } finally {
    app.unmount();
    host.remove();
  }
});
