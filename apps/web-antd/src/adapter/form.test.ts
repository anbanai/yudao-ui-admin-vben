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

const API_COMPONENT_NAMES = [
  'ApiCascader',
  'ApiSelect',
  'ApiTreeSelect',
] as const;
const originalComponents = globalShareState.getComponents();
const originalFormRegistry = new Map(
  API_COMPONENT_NAMES.map((component) => [
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
    for (const component of API_COMPONENT_NAMES) {
      const original = originalFormRegistry.get(component)!;
      if (original.hasComponent) {
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
});
