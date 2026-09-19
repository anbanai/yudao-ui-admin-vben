/* eslint-disable vue/one-component-per-file */
import { createApp, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import GroupSelect from './group-select.vue';

const api = vi.hoisted(() => ({ getGroups: vi.fn() }));
vi.mock('#/api/mall/product/group', () => ({
  getSimpleGroupList: api.getGroups,
}));
vi.mock('ant-design-vue', () => ({
  Alert: {
    props: ['message'],
    template: '<div>{{ message }}<slot name="description" /></div>',
  },
  Button: { template: '<button><slot /></button>' },
  Select: {
    props: ['options'],
    template:
      '<select><option v-for="item in options" :value="item.value" :disabled="item.disabled">{{ item.label }}</option></select>',
  },
}));

describe('storefront group selector', () => {
  const cleanup: Array<() => void> = [];
  afterEach(() => {
    cleanup.splice(0).forEach((dispose) => dispose());
    vi.clearAllMocks();
  });

  it('offers only public enabled groups, retains named invalid selections and allows explicit removal', async () => {
    api.getGroups.mockResolvedValue([
      { id: 1, name: '公开', status: 0, storefrontVisible: true },
      { id: 2, name: '内部活动', status: 0, storefrontVisible: false },
      { id: 3, name: '未选内部', status: 0, storefrontVisible: false },
      { id: 4, name: '停用组', status: 1, storefrontVisible: true },
    ]);
    const update = vi.fn();
    const host = document.createElement('div');
    const app = createApp(GroupSelect, {
      modelValue: [2, 4, 99],
      'onUpdate:modelValue': update,
    });
    app.mount(host);
    cleanup.push(() => app.unmount());
    await Promise.resolve();
    await nextTick();
    const options = [...host.querySelectorAll('option')];
    expect(options.map((option) => option.value)).toEqual([
      '1',
      '2',
      '4',
      '99',
    ]);
    expect(
      options
        .filter((option) => !option.disabled)
        .map((option) => option.value),
    ).toEqual(['1']);
    expect(host.textContent).toContain('内部活动（仅内部使用）');
    expect(host.textContent).toContain('停用组（已禁用）');
    expect(host.textContent).toContain('分组 99（已删除或不可访问）');
    expect(update).not.toHaveBeenCalled();
    [...host.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === '移除')!
      .click();
    expect(update).toHaveBeenCalledWith([4, 99]);
  });

  it('keeps ids untouched when loading fails and lets an operator retry', async () => {
    api.getGroups
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([]);
    const update = vi.fn();
    const host = document.createElement('div');
    const app = createApp(GroupSelect, {
      modelValue: [99],
      'onUpdate:modelValue': update,
    });
    app.mount(host);
    cleanup.push(() => app.unmount());
    await Promise.resolve();
    await nextTick();
    expect(host.textContent).toContain('分组加载失败');
    expect(update).not.toHaveBeenCalled();
    host.querySelector('button')!.click();
    await Promise.resolve();
    await nextTick();
    expect(host.textContent).toContain('分组 99（已删除或不可访问）');
    expect(update).not.toHaveBeenCalled();
  });
});
