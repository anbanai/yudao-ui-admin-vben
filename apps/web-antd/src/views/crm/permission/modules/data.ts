import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';

import { BizTypeEnum, PermissionLevelEnum } from '#/api/crm/permission';
import { getSimpleUserList } from '#/api/system/user';

/** 新增/修改的表单 */
export function useTransferFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      hide: true,
    },
    {
      fieldName: 'newOwnerUserId',
      label: '选择新负责人',
      component: 'ApiSelect',
      componentProps: {
        api: getSimpleUserList,
        labelField: 'nickname',
        valueField: 'id',
      },
      rules: 'required',
    },
    {
      fieldName: 'oldOwnerHandler',
      label: '老负责人',
      component: 'RadioGroup',
      componentProps: {
        options: [
          {
            label: '加入团队',
            value: true,
          },
          {
            label: '移除',
            value: false,
          },
        ],
      },
      dependencies: {
        triggerFields: ['oldOwnerHandler'],
        resolve: ({ values, actions }) => ({
          componentProps: {
            onChange: (keepOwner = values.oldOwnerHandler) => {
              if (!keepOwner) {
                actions.setFieldValue('oldOwnerPermissionLevel', undefined);
              }
            },
          },
        }),
      },
      rules: 'required',
    },
    {
      fieldName: 'oldOwnerPermissionLevel',
      label: '老负责人权限级别',
      component: 'RadioGroup',
      componentProps: {
        options: getDictOptions(
          DICT_TYPE.CRM_PERMISSION_LEVEL,
          'number',
        ).filter((dict) => dict.value !== PermissionLevelEnum.OWNER),
      },
      dependencies: {
        triggerFields: ['oldOwnerHandler'],
        resolve: ({ values }) => ({ show: values.oldOwnerHandler }),
      },
      rules: 'required',
    },
    {
      fieldName: 'toBizTypes',
      label: '同时转移',
      component: 'CheckboxGroup',
      componentProps: {
        options: [
          {
            label: '联系人',
            value: BizTypeEnum.CRM_CONTACT,
          },
          {
            label: '商机',
            value: BizTypeEnum.CRM_BUSINESS,
          },
          {
            label: '合同',
            value: BizTypeEnum.CRM_CONTRACT,
          },
        ],
      },
    },
  ];
}

/** 新增/修改的表单 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'bizId',
      component: 'Input',
      hide: true,
    },
    {
      fieldName: 'ids',
      component: 'Input',
      hide: true,
    },
    {
      fieldName: 'userId',
      label: '选择人员',
      component: 'ApiSelect',
      componentProps: {
        api: getSimpleUserList,
        labelField: 'nickname',
        valueField: 'id',
      },
      dependencies: {
        triggerFields: ['ids'],
        resolve: ({ values }) => ({
          show: values.ids === undefined,
        }),
      },
    },
    {
      fieldName: 'level',
      label: '权限级别',
      component: 'RadioGroup',
      componentProps: {
        options: getDictOptions(
          DICT_TYPE.CRM_PERMISSION_LEVEL,
          'number',
        ).filter((dict) => dict.value !== PermissionLevelEnum.OWNER),
      },
      rules: 'required',
    },
    {
      fieldName: 'bizType',
      label: 'Crm 类型',
      component: 'RadioGroup',
      componentProps: {
        options: [
          {
            label: '联系人',
            value: BizTypeEnum.CRM_CONTACT,
          },
          {
            label: '商机',
            value: BizTypeEnum.CRM_BUSINESS,
          },
          {
            label: '合同',
            value: BizTypeEnum.CRM_CONTRACT,
          },
        ],
      },
      hide: true,
    },
    {
      fieldName: 'toBizTypes',
      label: '同时添加至',
      component: 'CheckboxGroup',
      componentProps: {
        options: [
          {
            label: '联系人',
            value: BizTypeEnum.CRM_CONTACT,
          },
          {
            label: '商机',
            value: BizTypeEnum.CRM_BUSINESS,
          },
          {
            label: '合同',
            value: BizTypeEnum.CRM_CONTRACT,
          },
        ],
      },
      dependencies: {
        triggerFields: ['ids', 'bizType'],
        resolve: ({ values }) => ({
          show:
            values.ids === undefined &&
            values.bizType === BizTypeEnum.CRM_CUSTOMER,
        }),
      },
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'checkbox',
      width: 50,
    },
    {
      field: 'nickname',
      title: '姓名',
    },
    {
      field: 'deptName',
      title: '部门',
    },
    {
      field: 'postNames',
      title: '岗位',
    },
    {
      field: 'level',
      title: '权限级别',
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.CRM_PERMISSION_LEVEL },
      },
    },
    {
      field: 'createTime',
      title: '加入时间',
      formatter: 'formatDateTime',
    },
  ];
}
