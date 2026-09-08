import { createApp, defineComponent } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  createPropertyValueMock,
  getPropertyValueSimpleListMock,
  selectControls,
} = vi.hoisted(() => ({
  createPropertyValueMock: vi.fn(),
  getPropertyValueSimpleListMock: vi.fn(),
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
      setup:
        (_, { attrs, slots }) =>
        () =>
          createElement('span', attrs, slots.default?.()),
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
    const host = document.createElement('div');
    const app = createApp(ProductAttributes, { propertyList });
    document.body.append(host);
    app.mount(host);

    selectControls.emitChange?.(['7gx4']);
    selectControls.emitBlur?.();

    expect(createPropertyValueMock).toHaveBeenCalledTimes(1);

    resolveCreate?.(101);
    await flushVueUpdates();

    expect(propertyList[0]?.values).toEqual([{ id: 101, name: '7gx4' }]);

    app.unmount();
    host.remove();
  });
});
