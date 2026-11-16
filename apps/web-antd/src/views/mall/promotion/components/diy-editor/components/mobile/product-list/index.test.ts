import type { ProductListProperty } from './config';

import { createApp, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { component } from './config';
import ProductList from './index.vue';

const api = vi.hoisted(() => ({
  groups: vi.fn(),
  groupProducts: vi.fn(),
  products: vi.fn(),
}));
vi.mock('#/api/mall/product/group', () => ({
  getSimpleGroupList: api.groups,
  getGroupSpuPage: api.groupProducts,
}));
vi.mock('#/api/mall/product/spu', () => ({ getSpuDetailList: api.products }));
vi.mock('ant-design-vue', () => ({
  Button: { template: '<button><slot /></button>' },
  Image: { template: '<img />' },
}));

async function settle() {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
    await nextTick();
  }
}

describe('product list preview', () => {
  const cleanups: Array<() => void> = [];
  function mount(property: ProductListProperty) {
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp(ProductList, { property });
    app.mount(host);
    cleanups.push(() => {
      app.unmount();
      host.remove();
    });
    return host;
  }
  beforeEach(() => {
    api.groups.mockResolvedValue([
      { id: 1, name: '公开组', status: 0, storefrontVisible: true },
      { id: 2, name: '内部组', status: 0, storefrontVisible: false },
    ]);
    api.groupProducts.mockResolvedValue({
      list: [{ id: 3, name: '分组商品' }],
    });
    api.products.mockResolvedValue([
      { id: 1, name: '商品甲' },
      { id: 2, name: '商品乙' },
    ]);
  });
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    vi.clearAllMocks();
  });

  it('preserves saved manual choices and order across source switches', async () => {
    const property = reactive<ProductListProperty>({
      ...component.property,
      sourceType: undefined,
      spuIds: [2, 1],
      groupIds: [1],
    });
    const host = mount(property);
    await settle();
    expect(host.textContent!.indexOf('商品乙')).toBeLessThan(
      host.textContent!.indexOf('商品甲'),
    );
    property.sourceType = 'group';
    await settle();
    expect(host.textContent).toContain('分组商品');
    expect(api.groupProducts).toHaveBeenCalledWith({
      groupIds: [1],
      pageNo: 1,
      pageSize: 10,
    });
    property.sourceType = 'manual';
    await settle();
    expect(property.spuIds).toEqual([2, 1]);
    expect(host.textContent!.indexOf('商品乙')).toBeLessThan(
      host.textContent!.indexOf('商品甲'),
    );
  });

  it('does not request products for empty or unavailable groups and preserves their ids', async () => {
    const property = reactive({
      ...component.property,
      sourceType: 'group' as const,
      groupIds: [] as number[],
    });
    const host = mount(property);
    await settle();
    expect(api.groupProducts).not.toHaveBeenCalled();
    property.groupIds = [2, 99];
    await settle();
    expect(api.groupProducts).not.toHaveBeenCalled();
    expect(property.groupIds).toEqual([2, 99]);
    expect(host.textContent).toContain('内部组（仅内部使用）');
    expect(host.textContent).toContain('分组 99（已删除或不可访问）');
  });

  it('clears stale products during new requests, surfaces failures, and retries', async () => {
    api.groupProducts.mockRejectedValueOnce(new Error('offline'));
    const host = mount({
      ...component.property,
      sourceType: 'group',
      groupIds: [1],
      showMore: true,
    });
    await settle();
    expect(host.textContent).toContain('商品加载失败');
    const retry = [...host.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === '重试',
    );
    retry!.click();
    await settle();
    expect(host.textContent).toContain('分组商品');
    expect(host.textContent).toContain('查看更多');
    expect(api.groupProducts).toHaveBeenCalledTimes(2);
  });

  it('ignores an old manual response after switching to dynamic groups', async () => {
    let resolve!: (products: Array<{ id: number; name: string }>) => void;
    api.products.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const property = reactive({
      ...component.property,
      sourceType: 'manual' as 'group' | 'manual',
      spuIds: [1],
      groupIds: [1],
    });
    const host = mount(property);
    property.sourceType = 'group';
    await settle();
    resolve([{ id: 1, name: '过期商品' }]);
    await settle();
    expect(host.textContent).toContain('分组商品');
    expect(host.textContent).not.toContain('过期商品');
  });
});
