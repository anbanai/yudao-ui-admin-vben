import { createApp, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import BatchAssignment from './batch-assignment.vue';

let app: ReturnType<typeof createApp>;
let host: HTMLElement;

function mount(loadOptions: () => Promise<{ label: string; value: string }[]>) {
  const busy = ref(false);
  const onAssign = vi.fn();
  host = document.createElement('div');
  document.body.append(host);
  app = createApp({
    render: () =>
      h(BatchAssignment, {
        busy: busy.value,
        loadOptions,
        onAssign,
        scopeLabel: '会员来源',
      }),
  });
  app.mount(host);
  return { busy, onAssign };
}

afterEach(() => {
  app.unmount();
  host.remove();
});

describe('batch assignment', () => {
  it('requires manual selection of the sole grant and an explicit submit', async () => {
    const value = '9007199254740993';
    const { busy, onAssign } = mount(async () => [{ label: '来源一', value }]);
    await vi.waitFor(() =>
      expect(host.querySelector('.ant-select-loading')).toBeNull(),
    );
    const submit = host.querySelector('button')!;
    expect(submit.disabled).toBe(true);
    host
      .querySelector('.ant-select-selector')!
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await vi.waitFor(() =>
      expect(document.querySelector('.ant-select-item-option')).not.toBeNull(),
    );
    document.querySelector<HTMLElement>('.ant-select-item-option')!.click();
    await vi.waitFor(() => expect(submit.disabled).toBe(false));
    expect(onAssign).not.toHaveBeenCalled();
    busy.value = true;
    await nextTick();
    expect(submit.disabled).toBe(true);
    busy.value = false;
    await nextTick();
    submit.click();
    expect(onAssign).toHaveBeenCalledExactlyOnceWith(value);
  });

  it('retries a failed request and explains missing grants', async () => {
    const loadOptions = vi
      .fn()
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValue([]);
    const { onAssign } = mount(loadOptions);
    await vi.waitFor(() =>
      expect(host.textContent).toContain('会员来源列表加载失败'),
    );
    host.querySelector('button')!.click();
    await vi.waitFor(() =>
      expect(host.textContent).toContain('当前账号没有可分配的会员来源'),
    );
    expect(host.querySelector('button')).toBeNull();
    expect(onAssign).not.toHaveBeenCalled();
  });
});
