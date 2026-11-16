/* eslint-disable vue/one-component-per-file */

import { createApp, defineComponent, h, nextTick } from 'vue';

import { ApiComponent, globalShareState } from '@vben/common-ui';

import { afterEach, describe, expect, it } from 'vitest';

import {
  COMPONENT_BIND_EVENT_MAP,
  COMPONENT_MAP,
} from '../../../../packages/@core/ui-kit/form-ui/src/config';
import { initSetupVbenForm, useVbenForm } from './form';

const ValueSelect = defineComponent({
  emits: ['update:value'],
  setup(_props, { emit }) {
    return () =>
      h(
        'button',
        {
          onClick: () => emit('update:value', [3]),
          type: 'button',
        },
        'select role',
      );
  },
});

const TestApiSelect = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () =>
      h(ApiComponent, {
        component: ValueSelect,
        modelPropName: 'value',
        ...attrs,
      });
  },
});

const TestRichTextarea = defineComponent({
  emits: ['update:modelValue'],
  setup(_props, { emit }) {
    return () =>
      h(
        'button',
        {
          onClick: () =>
            emit(
              'update:modelValue',
              '<p><img src="https://example.com/product.png"></p>',
            ),
          type: 'button',
        },
        'insert product image',
      );
  },
});

const API_COMPONENT_NAMES = [
  'ApiCascader',
  'ApiSelect',
  'ApiTreeSelect',
] as const;
const FORM_COMPONENT_NAMES = [...API_COMPONENT_NAMES, 'RichTextarea'] as const;
const originalComponents = globalShareState.getComponents();
const originalFormRegistry = new Map(
  FORM_COMPONENT_NAMES.map((component) => [
    component,
    {
      bindEvent: COMPONENT_BIND_EVENT_MAP[component],
      component: COMPONENT_MAP[component],
      hasBindEvent: Object.hasOwn(COMPONENT_BIND_EVENT_MAP, component),
      hasComponent: Object.hasOwn(COMPONENT_MAP, component),
    },
  ]),
);

describe('web-antd form adapter', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];

  afterEach(() => {
    for (const app of apps.splice(0)) {
      app.unmount();
    }
    globalShareState.setComponents(originalComponents);
    for (const component of FORM_COMPONENT_NAMES) {
      const original = originalFormRegistry.get(component)!;
      if (original.hasComponent && original.component) {
        COMPONENT_MAP[component] = original.component;
      } else {
        Reflect.deleteProperty(COMPONENT_MAP, component);
      }
      if (original.hasBindEvent) {
        COMPONENT_BIND_EVENT_MAP[component] = original.bindEvent;
      } else {
        Reflect.deleteProperty(COMPONENT_BIND_EVENT_MAP, component);
      }
    }
    document.body.innerHTML = '';
  });

  it.each(API_COMPONENT_NAMES)(
    'writes %s model updates back to the form field',
    async (component) => {
      globalShareState.setComponents({ [component]: TestApiSelect });
      await initSetupVbenForm();
      const [Form, formApi] = useVbenForm({
        schema: [
          {
            component,
            fieldName: 'roleIds',
          },
        ],
        showDefaultActions: false,
      });
      const host = document.createElement('div');
      document.body.append(host);
      const app = createApp(Form);
      apps.push(app);
      app.mount(host);
      await nextTick();
      await Promise.resolve();
      await nextTick();

      host.querySelector('button')?.click();
      await nextTick();

      expect(await formApi.getValues()).toEqual({ roleIds: [3] });
    },
  );

  it('writes RichTextarea model updates back to the form field', async () => {
    globalShareState.setComponents({ RichTextarea: TestRichTextarea });
    await initSetupVbenForm();
    const [Form, formApi] = useVbenForm({
      schema: [
        {
          component: 'RichTextarea',
          fieldName: 'description',
          rules: 'required',
        },
      ],
      showDefaultActions: false,
    });
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp(Form);
    apps.push(app);
    app.mount(host);
    await nextTick();
    await Promise.resolve();
    await nextTick();

    host.querySelector('button')?.click();
    await nextTick();

    expect(await formApi.getValues()).toEqual({
      description: '<p><img src="https://example.com/product.png"></p>',
    });
    await expect(formApi.validate()).resolves.toBeTruthy();
  });
});
