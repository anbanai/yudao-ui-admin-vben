import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { MallMerchantApi } from '#/api/mall/product/merchant';

import { getRangePickerDefaultProps } from '#/utils';

export const merchantStatusOptions = [
  { label: '草稿', value: 0 },
  { label: '待审核', value: 10 },
  { label: '已通过', value: 20 },
  { label: '已驳回', value: 30 },
  { label: '已冻结', value: 40 },
];

export const qualificationStatusOptions = [
  { label: '待审核', value: 10 },
  { label: '已通过', value: 20 },
  { label: '已驳回', value: 30 },
];

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'name',
      label: '商家名称',
      component: 'Input',
      componentProps: { placeholder: '请输入商家名称', allowClear: true },
    },
    {
      fieldName: 'status',
      label: '入驻状态',
      component: 'Select',
      componentProps: { options: merchantStatusOptions, allowClear: true },
    },
    {
      fieldName: 'createTime',
      label: '创建时间',
      component: 'RangePicker',
      componentProps: { ...getRangePickerDefaultProps(), allowClear: true },
    },
  ];
}

export function useFormSchema(): VbenFormSchema[] {
  return [
    { fieldName: 'id', component: 'Input', hide: true },
    {
      fieldName: 'name',
      label: '商家名称',
      component: 'Input',
      componentProps: { placeholder: '请输入商家主体名称' },
      rules: 'required',
    },
    {
      fieldName: 'storeName',
      label: '店铺名称',
      component: 'Input',
      componentProps: { placeholder: '请输入店铺名称' },
      rules: 'required',
    },
    { fieldName: 'logoUrl', label: '店铺图片', component: 'ImageUpload' },
    {
      fieldName: 'companyName',
      label: '企业主体名称',
      component: 'Input',
      componentProps: { placeholder: '请输入企业主体名称' },
    },
    {
      fieldName: 'creditCode',
      label: '统一社会信用代码',
      component: 'Input',
      componentProps: { placeholder: '请输入统一社会信用代码' },
    },
    { fieldName: 'legalPerson', label: '法人', component: 'Input' },
    { fieldName: 'contactName', label: '联系人', component: 'Input' },
    { fieldName: 'contactMobile', label: '联系电话', component: 'Input' },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { field: 'name', title: '商家名称', minWidth: 180 },
    { field: 'storeName', title: '店铺名称', minWidth: 180 },
    { field: 'companyName', title: '企业主体', minWidth: 180 },
    { field: 'contactName', title: '联系人', width: 110 },
    { field: 'contactMobile', title: '联系电话', width: 140 },
    {
      field: 'status',
      title: '入驻状态',
      width: 110,
      slots: { default: 'status' },
    },
    {
      field: 'createTime',
      title: '创建时间',
      width: 170,
      formatter: 'formatDateTime',
    },
    {
      title: '操作',
      width: 480,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

export function qualificationStatusLabel(status?: number) {
  return (
    qualificationStatusOptions.find((item) => item.value === status)?.label ??
    '-'
  );
}

export function merchantStatusLabel(status?: number) {
  return (
    merchantStatusOptions.find((item) => item.value === status)?.label ?? '-'
  );
}

export type Merchant = MallMerchantApi.Merchant;
