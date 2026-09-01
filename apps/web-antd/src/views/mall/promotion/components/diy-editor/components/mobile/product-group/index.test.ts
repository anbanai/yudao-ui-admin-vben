import type { ProductGroupProperty } from './config';

import { createApp, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

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

describe('ProductGroup', () => {
  const hosts: HTMLDivElement[] = [];

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
});
