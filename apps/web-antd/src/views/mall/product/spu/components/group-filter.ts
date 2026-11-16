import type { VbenFormSchema } from '#/adapter/form';

import { z } from '#/adapter/form';
import { getGroupLabel, getSimpleGroupList } from '#/api/mall/product/group';

/** 商品分组为辅助筛选；停用、内部分组也可用于后台查找商品。 */
export function useSpuGroupFilterSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'groupIds',
      label: '商品分组',
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          const groups = await getSimpleGroupList();
          return groups.map((group) => ({
            ...group,
            label: getGroupLabel(group),
          }));
        },
        labelField: 'label',
        valueField: 'id',
        mode: 'multiple',
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
        placeholder: '匹配任一分组（最多15个）',
      },
      rules: z.array(z.number()).max(15, '最多选择15个分组').optional(),
      dependencies: {
        triggerFields: ['ungrouped'],
        resolve: ({ values }) => ({ disabled: values.ungrouped === true }),
      },
    },
    {
      fieldName: 'ungrouped',
      label: '未分组',
      component: 'Checkbox',
      componentProps: { class: 'w-auto' },
    },
  ];
}
