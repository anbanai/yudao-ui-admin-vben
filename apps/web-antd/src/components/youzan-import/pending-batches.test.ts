import { createApp, h } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import PendingBatches from './pending-batches.vue';

let app: ReturnType<typeof createApp>;
let host: HTMLElement;

function mount(loadPage: (before?: string) => Promise<string[]>, busy = false) {
  const onSelect = vi.fn();
  host = document.createElement('div');
  document.body.append(host);
  app = createApp({
    render: () => h(PendingBatches, { busy, loadPage, onSelect }),
  });
  app.mount(host);
  return onSelect;
}

function button(label: string) {
  return [...document.querySelectorAll('button')].find(
    (item) =>
      item.textContent?.trim().replaceAll(' ', '') ===
      label.replaceAll(' ', ''),
  );
}

afterEach(() => {
  app.unmount();
  host.remove();
});

describe('pending batches', () => {
  it('retains loaded rows on pagination error, retries the cursor and emits the exact selected ID', async () => {
    const first = Array.from({ length: 20 }, (_, i) => String(100 - i));
    const id = '9007199254740993';
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce([id])
      .mockResolvedValueOnce([]);
    const onSelect = mount(loadPage);
    button('待分配批次')!.click();
    await vi.waitFor(() => expect(button('加载更多')).toBeDefined());
    button('加载更多')!.click();
    await vi.waitFor(() => expect(button('重试')).toBeDefined());
    expect(button('批次 100')).toBeDefined();
    button('重试')!.click();
    await vi.waitFor(() => expect(button(`批次 ${id}`)).toBeDefined());
    expect(button('加载更多')).toBeUndefined();
    button(`批次 ${id}`)!.click();
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(id);
    button('待分配批次')!.click();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('暂无待分配批次'),
    );
    expect(loadPage.mock.calls).toEqual([
      [undefined],
      ['81'],
      ['81'],
      [undefined],
    ]);
  });

  it('ignores a dismissed request that resolves after the modal reopens', async () => {
    let resolveFirst!: (ids: string[]) => void;
    const first = new Promise<string[]>((resolve) => {
      resolveFirst = resolve;
    });
    const loadPage = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce(['12']);
    const onSelect = mount(loadPage);
    button('待分配批次')!.click();
    await vi.waitFor(() =>
      expect(document.querySelector('.ant-modal-close')).not.toBeNull(),
    );
    document.querySelector<HTMLElement>('.ant-modal-close')!.click();
    button('待分配批次')!.click();
    await vi.waitFor(() => expect(button('批次 12')).toBeDefined());
    resolveFirst(['13']);
    await first;
    await Promise.resolve();
    expect(button('批次 13')).toBeUndefined();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('disables opening while the parent is busy', () => {
    const loadPage = vi.fn();
    mount(loadPage, true);
    expect(button('待分配批次')!.disabled).toBe(true);
    button('待分配批次')!.click();
    expect(loadPage).not.toHaveBeenCalled();
  });
});
