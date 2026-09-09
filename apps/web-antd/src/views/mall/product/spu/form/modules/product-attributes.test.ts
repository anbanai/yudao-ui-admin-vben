import { createApp, defineComponent, h, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  createPropertyValueMock,
  getPropertyValueSimpleListMock,
  tagControls,
  selectControls,
} = vi.hoisted(() => ({
  createPropertyValueMock: vi.fn(),
  getPropertyValueSimpleListMock: vi.fn(),
  tagControls: {
    closeHandlers: [] as Array<() => void>,
  },
  selectControls: {
    emitBlur: undefined as (() => void) | undefined,
    emitChange: undefined as ((value: string[]) => void) | undefined,
  },
}));

vi.mock('#/api/mall/product/property', () => ({
  createPropertyValue: createPropertyValueMock,
  getPropertyValueSimpleList: getPropertyValueSimpleListMock,
}));

vi.mock('#/locales', () => ({
  $t: (key: string) => key,
}));

vi.mock('@vben/icons', () => ({
  IconifyIcon: defineComponent({
    setup: () => () => null,
  }),
}));

vi.mock('ant-design-vue', async () => {
  const { defineComponent: defineVueComponent, h: createElement } =
    await import('vue');

  const Select = defineVueComponent({
    inheritAttrs: false,
    props: {
      value: {
        default: () => [],
        type: Array,
      },
    },
    emits: ['blur', 'change', 'update:value'],
    setup(_, { emit, expose, slots }) {
      selectControls.emitChange = (value) => {
        emit('update:value', value);
        emit('change', value);
      };
      selectControls.emitBlur = () => emit('blur');
      expose({
        focus: vi.fn(),
        inputRef: {
          attributes: {
            id: 'property-value-input',
          },
        },
      });
      return () => createElement('div', slots.default?.());
    },
  });

  Select.Option = defineVueComponent({
    setup:
      (_, { slots }) =>
      () =>
        createElement('option', slots.default?.()),
  });

  return {
    Col: defineVueComponent({
      setup:
        (_, { slots }) =>
        () =>
          createElement('div', slots.default?.()),
    }),
    Divider: defineVueComponent({
      setup: () => () => createElement('hr'),
    }),
    Select,
    Tag: defineVueComponent({
      inheritAttrs: false,
      emits: ['close'],
      setup: (_, { attrs, emit, slots }) => {
        tagControls.closeHandlers.push(() => emit('close'));
        return () => createElement('span', attrs, slots.default?.());
      },
    }),
    message: {
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
    },
  };
});

async function flushVueUpdates() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('商品属性值录入', () => {
  afterEach(() => {
    tagControls.closeHandlers = [];
    selectControls.emitBlur = undefined;
    selectControls.emitChange = undefined;
    vi.clearAllMocks();
  });

  it('同一属性值同时触发变更和失焦时只创建一个属性值', async () => {
    let resolveCreate: ((id: number) => void) | undefined;
    createPropertyValueMock.mockReturnValue(
      new Promise<number>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    getPropertyValueSimpleListMock.mockResolvedValue([]);

    const propertyList = [
      {
        id: 1,
        name: '规格',
        values: [],
      },
    ];
    const { default: ProductAttributes } =
      await import('./product-attributes.vue');
    const emitted: unknown[] = [];
    const host = document.createElement('div');
    const app = createApp({
      setup() {
        return () =>
          h(ProductAttributes, {
            propertyList,
            onChange: (nextList: unknown) => emitted.push(nextList),
          });
      },
    });
    document.body.append(host);
    app.mount(host);

    selectControls.emitChange?.(['7gx4']);
    selectControls.emitBlur?.();

    expect(createPropertyValueMock).toHaveBeenCalledTimes(1);

    resolveCreate?.(101);
    await flushVueUpdates();

    expect(propertyList[0]?.values).toEqual([]);
    expect(emitted.at(-1)).toEqual([
      {
        id: 1,
        name: '规格',
        values: [{ id: 101, name: '7gx4' }],
      },
    ]);

    app.unmount();
    host.remove();
  });

  it('同一属性并发新增多个值时不因前一个完成而丢失后一个', async () => {
    const resolvers: Array<(id: number) => void> = [];
    createPropertyValueMock.mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    getPropertyValueSimpleListMock.mockResolvedValue([]);

    const propertyList = ref([{ id: 1, name: '颜色', values: [] }]);
    const { default: ProductAttributes } =
      await import('./product-attributes.vue');
    const emitted: unknown[] = [];
    const host = document.createElement('div');
    const app = createApp({
      setup() {
        return () =>
          h(ProductAttributes, {
            propertyList: propertyList.value,
            onChange: (nextList: unknown) => {
              propertyList.value = nextList as typeof propertyList.value;
              emitted.push(nextList);
            },
          });
      },
    });
    document.body.append(host);
    app.mount(host);

    selectControls.emitChange?.(['红色']);
    selectControls.emitChange?.(['蓝色']);
    expect(createPropertyValueMock).toHaveBeenCalledTimes(2);

    resolvers[0]?.(101);
    await flushVueUpdates();
    resolvers[1]?.(102);
    await flushVueUpdates();

    expect(emitted.at(-1)).toEqual([
      {
        id: 1,
        name: '颜色',
        values: [
          { id: 101, name: '红色' },
          { id: 102, name: '蓝色' },
        ],
      },
    ]);

    app.unmount();
    host.remove();
  });

  it('属性列表变化后异步响应仍按 propertyId 写回原属性', async () => {
    let resolveCreate: ((id: number) => void) | undefined;
    createPropertyValueMock.mockReturnValue(
      new Promise<number>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    getPropertyValueSimpleListMock.mockResolvedValue([]);

    const propertyList = [
      { id: 2, name: '尺寸', values: [] },
      { id: 1, name: '颜色', values: [] },
    ];
    const { default: ProductAttributes } =
      await import('./product-attributes.vue');
    const emitted: unknown[] = [];
    const host = document.createElement('div');
    const app = createApp({
      setup() {
        return () =>
          h(ProductAttributes, {
            propertyList,
            onChange: (nextList: unknown) => emitted.push(nextList),
          });
      },
    });
    document.body.append(host);
    app.mount(host);

    // The last rendered Select belongs to propertyId 1.
    selectControls.emitChange?.(['蓝色']);
    // Remove the preceding property while the create request is pending.
    tagControls.closeHandlers[0]?.();

    resolveCreate?.(101);
    await flushVueUpdates();

    expect(emitted.at(-1)).toEqual([
      {
        id: 1,
        name: '颜色',
        values: [{ id: 101, name: '蓝色' }],
      },
    ]);

    app.unmount();
    host.remove();
  });

  it('删除属性值时发出完整的新属性列表且不修改父列表', async () => {
    const propertyList = [
      {
        id: 1,
        name: '颜色',
        values: [{ id: 11, name: '红色' }],
      },
    ];
    const { default: ProductAttributes } =
      await import('./product-attributes.vue');
    const emitted: unknown[] = [];
    const host = document.createElement('div');
    const app = createApp({
      setup() {
        return () =>
          h(ProductAttributes, {
            propertyList,
            onChange: (nextList: unknown) => emitted.push(nextList),
          });
      },
    });
    document.body.append(host);
    app.mount(host);

    tagControls.closeHandlers[1]?.();
    await flushVueUpdates();

    expect(propertyList[0]?.values).toEqual([{ id: 11, name: '红色' }]);
    expect(emitted.at(-1)).toEqual([
      {
        id: 1,
        name: '颜色',
        values: [],
      },
    ]);

    app.unmount();
    host.remove();
  });

  it('删除属性时发出完整的新属性列表且不修改父列表', async () => {
    const propertyList = [
      {
        id: 1,
        name: '颜色',
        values: [{ id: 11, name: '红色' }],
      },
    ];
    const { default: ProductAttributes } =
      await import('./product-attributes.vue');
    const emitted: unknown[] = [];
    const host = document.createElement('div');
    const app = createApp({
      setup() {
        return () =>
          h(ProductAttributes, {
            propertyList,
            onChange: (nextList: unknown) => emitted.push(nextList),
          });
      },
    });
    document.body.append(host);
    app.mount(host);

    tagControls.closeHandlers[0]?.();
    await flushVueUpdates();

    expect(propertyList).toHaveLength(1);
    expect(emitted.at(-1)).toEqual([]);

    app.unmount();
    host.remove();
  });

  it('详情模式隐藏添加属性值入口', async () => {
    const { default: ProductAttributes } =
      await import('./product-attributes.vue');
    const source = await import('./product-attributes.vue?raw');
    expect(source.default).toMatch(/<Tag\s+v-if="!isDetail"/);
    expect(ProductAttributes).toBeTruthy();
  });

  it('异步新增属性值按 propertyId 写回而不是使用过期 index', async () => {
    const source = await import('./product-attributes.vue?raw');
    expect(source.default).toMatch(
      /findIndex\(\s*\(item\) => item\.id === propertyId\s*\)/,
    );
    expect(source.default).toContain('propertyRevisions');
  });

  it('属性值下拉请求完成顺序变化时不覆盖当前属性选项', async () => {
    const source = await import('./product-attributes.vue?raw');
    expect(source.default).toContain('attributeOptionsRequestVersion');
    expect(source.default).toMatch(
      /requestVersion === attributeOptionsRequestVersion\.value/,
    );
  });

  it('异步新增值同时校验父级规格版本', async () => {
    const source = await import('./product-attributes.vue?raw');
    expect(source.default).toContain('changeVersion?: number');
    expect(source.default).toMatch(/requestVersion !== props\.changeVersion/);
    expect(source.default).toContain('propertyRevisions');
  });

  it('输入框 ref 按 propertyId 管理，避免属性删除后索引错位', async () => {
    const source = await import('./product-attributes.vue?raw');
    expect(source.default).toContain('setInputRef(attribute.id');
    expect(source.default).toContain('inputRef.value.get(property.id)');
    expect(source.default).toContain('inputVisible(attribute.id)');
    expect(source.default).toContain(':key="attribute.id"');
  });

  it('删除属性值按 propertyId 定位当前属性并清理输入草稿', async () => {
    const source = await import('./product-attributes.vue?raw');
    expect(source.default).toContain('handleCloseValue(attribute.id, value)');
    expect(source.default).toMatch(
      /function handleCloseValue\(propertyId: number, value: PropertyAndValues\)/,
    );
    expect(source.default).toContain('activePropertyId.value = null');
  });
});
