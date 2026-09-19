/* eslint-disable vue/one-component-per-file */
import type { ProductGroupProperty } from './config';

import { createApp, nextTick, reactive } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { component } from './config';
import ProductGroup from './index.vue';

const { getGroupSpuPageMock, getSimpleGroupListMock } = vi.hoisted(() => ({
  getGroupSpuPageMock: vi.fn().mockResolvedValue({ list: [], total: 0 }),
  getSimpleGroupListMock: vi.fn().mockResolvedValue([
    { id: 1, name: '黄茶', sort: 2, status: 0 },
    { id: 2, name: '绿茶', sort: 1, status: 0 },
  ]),
}));

vi.mock('#/api/mall/product/group', () => ({
  getGroupSpuPage: getGroupSpuPageMock,
  getSimpleGroupList: getSimpleGroupListMock,
}));

vi.mock('../product-list/index.vue', () => ({
  default: { template: '<div class="product-list-stub" />' },
}));

describe('product group', () => {
  const hosts: HTMLDivElement[] = [];

  async function settle() {
    for (let i = 0; i < 8; i++) {
      await Promise.resolve();
      await nextTick();
    }
  }

  afterEach(() => {
    for (const host of hosts.splice(0)) host.remove();
    getGroupSpuPageMock.mockClear();
    getSimpleGroupListMock.mockClear();
  });

  it('renders a vertical category rail with configurable active colors', async () => {
    const property = {
      badge: { imgUrl: '', show: false },
      borderRadiusBottom: 8,
      borderRadiusTop: 8,
      fields: {
        name: { color: '#000000', show: true },
        price: { color: '#ff3000', show: true },
      },
      groupIds: [1, 2],
      layoutType: 'threeCol',
      menu: {
        activeBackgroundColor: '#fff1f0',
        activeColor: '#a8071a',
        backgroundColor: '#f5f5f5',
        color: '#434343',
        layout: 'vertical',
      },
      pageSize: 10,
      showAll: false,
      sortType: 'default',
      space: 8,
      sticky: false,
      style: {} as ProductGroupProperty['style'],
    } satisfies ProductGroupProperty;
    const host = document.createElement('div');
    hosts.push(host);
    document.body.append(host);
    const app = createApp(ProductGroup, { property });

    app.mount(host);
    await Promise.resolve();
    await nextTick();
    await Promise.resolve();
    await nextTick();

    const rail = host.querySelector<HTMLElement>('[aria-label="商品分组"]');
    const buttons = rail?.querySelectorAll<HTMLButtonElement>('button');
    expect(host.querySelector('.product-group--vertical')).toBeTruthy();
    expect(rail?.style.backgroundColor).toBe('#f5f5f5');
    expect(buttons?.length).toBe(2);
    expect(buttons?.item(0).style.color).toBe('#a8071a');
    expect(buttons?.item(0).style.backgroundColor).toBe('#fff1f0');
    expect(buttons?.item(1).style.color).toBe('#434343');

    buttons?.item(1).click();
    await nextTick();

    expect(buttons?.item(0).style.color).toBe('#434343');
    expect(buttons?.item(1).style.color).toBe('#a8071a');
    expect(buttons?.item(1).style.backgroundColor).toBe('#fff1f0');

    app.unmount();
  });

  it('preserves internal and deleted ids while excluding them from the all tab query', async () => {
    getSimpleGroupListMock.mockResolvedValueOnce([
      { id: 1, name: '公开组', sort: 1, status: 0 },
      { id: 2, name: '内部组', sort: 2, status: 0, storefrontVisible: false },
    ]);
    const property = {
      ...component.property,
      groupIds: [1, 2, 99],
      showAll: true,
    };
    const host = document.createElement('div');
    hosts.push(host);
    const app = createApp(ProductGroup, { property });
    app.mount(host);
    await settle();
    expect(getGroupSpuPageMock).toHaveBeenCalledWith({
      groupIds: [1],
      pageNo: 1,
      pageSize: 10,
    });
    expect(host.textContent).toContain('内部组（仅内部使用）');
    expect(host.textContent).toContain('分组 99（已删除或不可访问）');
    expect(property.groupIds).toEqual([1, 2, 99]);
    app.unmount();
  });

  it('refetches dynamic products when sorting changes or the preview is refreshed', async () => {
    const property = reactive({ ...component.property, groupIds: [1] });
    const host = document.createElement('div');
    hosts.push(host);
    const app = createApp(ProductGroup, { property });
    app.mount(host);
    await settle();
    property.sortType = 'sales';
    await settle();
    expect(getGroupSpuPageMock).toHaveBeenLastCalledWith({
      groupIds: [1],
      pageNo: 1,
      pageSize: 10,
      sortAsc: false,
      sortField: 'salesCount',
    });
    host.querySelector('button')!.click();
    await settle();
    expect(getGroupSpuPageMock).toHaveBeenCalledTimes(3);
    app.unmount();
  });
});
