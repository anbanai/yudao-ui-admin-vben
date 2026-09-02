import type { ProductCategoryProperty } from './config';

import { createApp, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProductCategory from './index.vue';

const { getCategoryListMock, getSpuPageMock } = vi.hoisted(() => ({
  getCategoryListMock: vi.fn(),
  getSpuPageMock: vi.fn(),
}));

vi.mock('#/api/mall/product/category', () => ({
  getCategoryList: getCategoryListMock,
}));

vi.mock('#/api/mall/product/spu', () => ({
  getSpuPage: getSpuPageMock,
}));

vi.mock('../product-list/index.vue', () => ({
  default: { template: '<div class="product-list-stub" />' },
}));

async function flushAsyncUpdates() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

describe('productCategory', () => {
  const apps: ReturnType<typeof createApp>[] = [];
  const hosts: HTMLDivElement[] = [];

  function mountProductCategory(property: ProductCategoryProperty) {
    const host = document.createElement('div');
    hosts.push(host);
    document.body.append(host);
    const app = createApp(ProductCategory, { property });
    apps.push(app);
    const vm = app.mount(host) as unknown as {
      $: { setupState: { availableCategories: unknown[] } };
    };
    return { app, host, vm };
  }

  beforeEach(() => {
    getCategoryListMock.mockReset();
    getSpuPageMock.mockReset();
    getSpuPageMock.mockResolvedValue({ list: [], total: 0 });
  });

  afterEach(() => {
    for (const app of apps.splice(0)) app.unmount();
    for (const host of hosts.splice(0)) host.remove();
  });

  it('retries category loading after a failed request when query settings change', async () => {
    getCategoryListMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce([{ id: 1, name: '绿茶', parentId: 0, status: 0 }]);
    const property = reactive({
      badge: { imgUrl: '', show: false },
      borderRadiusBottom: 8,
      borderRadiusTop: 8,
      categoryIds: [1],
      fields: {
        name: { color: '#000000', show: true },
        price: { color: '#ff3000', show: true },
      },
      layoutType: 'twoCol',
      pageSize: 10,
      showAll: false,
      sortType: 'default',
      space: 8,
      sticky: false,
      style: {} as ProductCategoryProperty['style'],
    } satisfies ProductCategoryProperty);
    const { host } = mountProductCategory(property);
    await flushAsyncUpdates();

    expect(getCategoryListMock).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('商品加载失败');

    property.pageSize = 11;
    await flushAsyncUpdates();

    expect(getCategoryListMock).toHaveBeenCalledTimes(2);
    expect(getSpuPageMock).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 1, pageSize: 11 }),
    );
  });

  it('keeps the loading state while a category retry is pending', async () => {
    let resolveCategories!: (categories: unknown[]) => void;
    getCategoryListMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCategories = resolve;
          }),
      );
    const property = reactive({
      badge: { imgUrl: '', show: false },
      borderRadiusBottom: 8,
      borderRadiusTop: 8,
      categoryIds: [1],
      fields: {
        name: { color: '#000000', show: true },
        price: { color: '#ff3000', show: true },
      },
      layoutType: 'twoCol',
      pageSize: 10,
      showAll: false,
      sortType: 'default',
      space: 8,
      sticky: false,
      style: {} as ProductCategoryProperty['style'],
    } satisfies ProductCategoryProperty);
    const { host } = mountProductCategory(property);
    await flushAsyncUpdates();
    property.pageSize = 11;
    await flushAsyncUpdates();
    property.sortType = 'latest';
    await flushAsyncUpdates();

    expect(getCategoryListMock).toHaveBeenCalledTimes(2);
    expect(host.textContent).not.toContain('暂无可用分类');
    expect(host.querySelector('.ant-skeleton')).toBeTruthy();

    resolveCategories([{ id: 1, name: '绿茶', parentId: 0, status: 0 }]);
    await flushAsyncUpdates();
  });

  it('does not request products when an in-flight category request resolves after unmount', async () => {
    let resolveCategories!: (categories: unknown[]) => void;
    getCategoryListMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCategories = resolve;
        }),
    );
    const property = reactive({
      badge: { imgUrl: '', show: false },
      borderRadiusBottom: 8,
      borderRadiusTop: 8,
      categoryIds: [1],
      fields: {
        name: { color: '#000000', show: true },
        price: { color: '#ff3000', show: true },
      },
      layoutType: 'twoCol',
      pageSize: 10,
      showAll: false,
      sortType: 'default',
      space: 8,
      sticky: false,
      style: {} as ProductCategoryProperty['style'],
    } satisfies ProductCategoryProperty);
    const { app, vm } = mountProductCategory(property);
    apps.splice(apps.indexOf(app), 1);
    app.unmount();
    resolveCategories([{ id: 1, name: '绿茶', parentId: 0, status: 0 }]);
    await flushAsyncUpdates();

    expect(vm.$.setupState.availableCategories).toEqual([]);
    expect(getSpuPageMock).not.toHaveBeenCalled();
  });
});
