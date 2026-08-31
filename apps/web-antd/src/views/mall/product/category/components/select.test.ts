/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import ProductCategorySelect from './select.vue';

const { getCategoryListMock } = vi.hoisted(() => ({
  getCategoryListMock: vi.fn().mockResolvedValue([]),
}));

vi.mock('#/api/mall/product/category', () => ({
  getCategoryList: getCategoryListMock,
}));

vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    TreeSelect: defineComponent({
      name: 'TreeSelect',
      props: {
        treeData: {
          type: Array,
          default: () => [],
        },
      },
      setup: (props) => () =>
        h('div', {
          'data-tree-data': JSON.stringify(props.treeData),
        }),
    }),
  };
});

describe('product category select', () => {
  let host: HTMLDivElement | undefined;
  let unmount: (() => void) | undefined;

  afterEach(() => {
    unmount?.();
    host?.remove();
    getCategoryListMock.mockClear();
  });

  it('reloads categories when the parent scope changes', async () => {
    const parentId = ref<number>();
    const Wrapper = defineComponent({
      setup() {
        return () => h(ProductCategorySelect, { parentId: parentId.value });
      },
    });
    host = document.createElement('div');
    document.body.append(host);
    const app = createApp(Wrapper);
    unmount = () => app.unmount();

    app.mount(host);
    await nextTick();
    expect(getCategoryListMock).toHaveBeenLastCalledWith({
      parentId: undefined,
    });

    parentId.value = 0;
    await nextTick();
    expect(getCategoryListMock).toHaveBeenLastCalledWith({ parentId: 0 });
    expect(getCategoryListMock).toHaveBeenCalledTimes(2);
  });

  it('clears stale child categories while the root scope loads', async () => {
    getCategoryListMock
      .mockResolvedValueOnce([
        { id: 1, name: '一级分类', parentId: 0 },
        { id: 2, name: '二级分类', parentId: 1 },
      ])
      .mockImplementationOnce(() => new Promise(() => {}));
    const parentId = ref<number>();
    const Wrapper = defineComponent({
      setup() {
        return () => h(ProductCategorySelect, { parentId: parentId.value });
      },
    });
    host = document.createElement('div');
    document.body.append(host);
    const app = createApp(Wrapper);
    unmount = () => app.unmount();

    app.mount(host);
    await Promise.resolve();
    await nextTick();
    const treeSelect = host.firstElementChild as HTMLElement;
    expect(treeSelect.dataset.treeData).toContain('二级分类');

    parentId.value = 0;
    await nextTick();
    expect(treeSelect.dataset.treeData).toBe('[]');
  });

  it('ignores a superseded category response', async () => {
    type Category = { id: number; name: string; parentId: number };
    let resolveAllCategories!: (categories: Category[]) => void;
    let resolveRootCategories!: (categories: Category[]) => void;
    getCategoryListMock
      .mockImplementationOnce(
        () =>
          new Promise<Category[]>((resolve) => {
            resolveAllCategories = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Category[]>((resolve) => {
            resolveRootCategories = resolve;
          }),
      );
    const parentId = ref<number>();
    const Wrapper = defineComponent({
      setup() {
        return () => h(ProductCategorySelect, { parentId: parentId.value });
      },
    });
    host = document.createElement('div');
    document.body.append(host);
    const app = createApp(Wrapper);
    unmount = () => app.unmount();
    app.mount(host);
    await nextTick();

    parentId.value = 0;
    await nextTick();
    resolveRootCategories([{ id: 1, name: '一级分类', parentId: 0 }]);
    await Promise.resolve();
    await nextTick();
    const treeSelect = host.firstElementChild as HTMLElement;
    expect(treeSelect.dataset.treeData).toContain('一级分类');

    resolveAllCategories([{ id: 2, name: '迟到的二级分类', parentId: 1 }]);
    await Promise.resolve();
    await nextTick();
    expect(treeSelect.dataset.treeData).toContain('一级分类');
    expect(treeSelect.dataset.treeData).not.toContain('迟到的二级分类');
  });
});
