import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { CommonStatusEnum, DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';

import { z } from '#/adapter/form';

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'name',
      label: '分组名称',
      component: 'Input',
      componentProps: { maxlength: 64, placeholder: '请输入分组名称' },
      rules: 'required',
    },
    {
      fieldName: 'sort',
      label: '分组排序',
      component: 'InputNumber',
      componentProps: { class: '!w-full', min: 0 },
      rules: z.number().default(0),
    },
    {
      fieldName: 'status',
      label: '分组状态',
      component: 'RadioGroup',
      componentProps: {
        options: getDictOptions(DICT_TYPE.COMMON_STATUS, 'number'),
        buttonStyle: 'solid',
        optionType: 'button',
      },
      rules: z.number().default(CommonStatusEnum.ENABLE),
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: { maxlength: 255, placeholder: '请输入备注' },
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'name',
      label: '分组名称',
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入分组名称' },
    },
    {
      fieldName: 'status',
      label: '分组状态',
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: getDictOptions(DICT_TYPE.COMMON_STATUS, 'number'),
        placeholder: '请选择分组状态',
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { field: 'id', title: '编号', width: 100 },
    { field: 'name', title: '分组名称', minWidth: 180 },
    { field: 'sort', title: '排序', width: 100 },
    {
      field: 'status',
      title: '状态',
      width: 100,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.COMMON_STATUS },
      },
    },
    { field: 'remark', title: '备注', minWidth: 180 },
    {
      field: 'createTime',
      title: '创建时间',
      minWidth: 170,
      formatter: 'formatDateTime',
    },
    {
      title: '操作',
      width: 240,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

export function useMemberGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'keyword',
      label: '商品',
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入商品名称' },
    },
    {
      fieldName: 'status',
      label: '销售状态',
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '下架', value: 0 },
          { label: '上架', value: 1 },
        ],
      },
    },
  ];
}

export function useMemberGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50 },
    { field: 'id', title: '商品编号', width: 100 },
    {
      field: 'picUrl',
      title: '商品图',
      width: 90,
      cellRender: { name: 'CellImage' },
    },
    { field: 'name', title: '商品名称', minWidth: 220 },
    {
      field: 'groupSort',
      title: '组内排序',
      width: 150,
      slots: { default: 'sort' },
    },
    {
      field: 'status',
      title: '销售状态',
      width: 100,
      cellRender: {
        name: 'CellSwitch',
        props: {
          disabled: true,
          checkedValue: 1,
          checkedChildren: '上架',
          unCheckedValue: 0,
          unCheckedChildren: '下架',
        },
      },
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
