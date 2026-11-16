/* eslint-disable vue/one-component-per-file */

import { createApp, defineComponent, h, nextTick } from 'vue';

import { globalShareState } from '@vben/common-ui';

import { afterEach, describe, expect, it } from 'vitest';

import { initSetupVbenForm, useVbenForm } from '#/adapter/form';

import {
  COMPONENT_BIND_EVENT_MAP,
  COMPONENT_MAP,
} from '../../../../../../packages/@core/ui-kit/form-ui/src/config';
import { useAssignMenuFormSchema } from './data';

const MenuTreeControl = defineComponent({
  props: {
    modelValue: {
      type: Array<number>,
      default: () => [],
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        {
          'data-menu-ids': JSON.stringify(props.modelValue),
          onClick: () => emit('update:modelValue', [2, 3]),
          type: 'button',
        },
        'select menus',
      );
  },
});

describe('role menu form schema', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];
  const originalComponents = globalShareState.getComponents();
  const hadOriginalInputComponent = Object.hasOwn(COMPONENT_MAP, 'Input');
  const originalInputComponent = COMPONENT_MAP.Input;
  const hadOriginalInputBindEvent = Object.hasOwn(
    COMPONENT_BIND_EVENT_MAP,
    'Input',
  );
  const originalInputBindEvent = COMPONENT_BIND_EVENT_MAP.Input;

  afterEach(() => {
    for (const app of apps.splice(0)) {
      app.unmount();
    }
    globalShareState.setComponents(originalComponents);
    if (hadOriginalInputComponent) {
      COMPONENT_MAP.Input = originalInputComponent!;
    } else {
      Reflect.deleteProperty(COMPONENT_MAP, 'Input');
    }
    if (hadOriginalInputBindEvent) {
      COMPONENT_BIND_EVENT_MAP.Input = originalInputBindEvent;
    } else {
      Reflect.deleteProperty(COMPONENT_BIND_EVENT_MAP, 'Input');
    }
    document.body.innerHTML = '';
  });

  it('binds restored menu ids to the custom tree model', async () => {
    globalShareState.setComponents({
      Input: MenuTreeControl,
    });
    await initSetupVbenForm();
    const menuField = useAssignMenuFormSchema().find(
      (field) => field.fieldName === 'menuIds',
    )!;
    const [Form, formApi] = useVbenForm({
      schema: [menuField],
      showDefaultActions: false,
    });
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        h(Form, null, {
          menuIds: (slotProps: Record<string, any>) =>
            h(MenuTreeControl, slotProps.componentProps),
        }),
    });
    apps.push(app);
    app.mount(host);
    await nextTick();

    await formApi.setFieldValue('menuIds', [1]);
    await nextTick();

    const button = host.querySelector('button')!;
    expect(button.dataset.menuIds).toBe('[1]');

    button.click();
    await nextTick();
    expect(await formApi.getValues()).toEqual({ menuIds: [2, 3] });
  });
});
