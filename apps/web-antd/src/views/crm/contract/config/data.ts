import type { VbenFormSchema } from '#/adapter/form';

export const schema: VbenFormSchema[] = [
  {
    component: 'RadioGroup',
    fieldName: 'notifyEnabled',
    label: '提前提醒设置',
    componentProps: {
      options: [
        { label: '提醒', value: true },
        { label: '不提醒', value: false },
      ],
    },
    dependencies: {
      triggerFields: ['notifyEnabled'],
      resolve: ({ values, actions }) => ({
        componentProps: {
          onChange: (enabled = values.notifyEnabled) => {
            if (!enabled) actions.setFieldValue('notifyDays', undefined);
          },
        },
      }),
    },
    defaultValue: true,
  },
  {
    component: 'InputNumber',
    fieldName: 'notifyDays',
    componentProps: {
      class: '!w-full',
      min: 0,
      precision: 0,
    },
    renderComponentContent: () => ({
      addonBefore: () => '提前',
      addonAfter: () => '天提醒',
    }),
    dependencies: {
      triggerFields: ['notifyEnabled'],
      resolve: ({ values }) => ({ show: values.notifyEnabled }),
    },
  },
];
