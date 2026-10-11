import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemMerchantUserApi } from '#/api/system/merchant-user';

import { CommonStatusEnum, DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';

import { z } from '#/adapter/form';
import { getRangePickerDefaultProps } from '#/utils';

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'username',
      label: '账号',
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '请输入账号',
      },
    },
    {
      fieldName: 'nickname',
      label: '昵称',
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '请输入昵称',
      },
    },
    {
      fieldName: 'mobile',
      label: '手机号码',
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '请输入手机号码',
      },
    },
    {
      fieldName: 'merchantId',
      label: '商家编号',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 1,
        placeholder: '请输入商家编号',
      },
    },
    {
      fieldName: 'status',
      label: '账号状态',
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: getDictOptions(DICT_TYPE.COMMON_STATUS, 'number'),
        placeholder: '请选择账号状态',
      },
    },
    {
      fieldName: 'createTime',
      label: '创建时间',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        allowClear: true,
      },
    },
  ];
}

/** 重置密码表单 */
export function useResetPasswordFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'id',
      hide: true,
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请输入新密码',
      },
      fieldName: 'password',
      label: '新密码',
      rules: z
        .string({ message: '请输入新密码' })
        .min(4, '密码长度不能少于 4 个字符')
        .max(16, '密码长度不能超过 16 个字符'),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请再次输入新密码',
      },
      dependencies: {
        triggerFields: ['password'],
        resolve: ({ values }) => ({
          rules: z
            .string({ message: '请再次输入新密码' })
            .min(4, '密码长度不能少于 4 个字符')
            .max(16, '密码长度不能超过 16 个字符')
            .refine(
              (value) => value === values.password,
              '两次输入的密码不一致',
            ),
        }),
      },
      fieldName: 'confirmPassword',
      label: '确认密码',
      rules: 'required',
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(
  onStatusChange?: (
    newStatus: number,
    row: SystemMerchantUserApi.MerchantUser,
  ) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: '账号编号',
      minWidth: 100,
    },
    {
      field: 'merchantId',
      title: '商家编号',
      minWidth: 100,
    },
    {
      field: 'username',
      title: '账号',
      minWidth: 140,
    },
    {
      field: 'nickname',
      title: '昵称',
      minWidth: 140,
    },
    {
      field: 'email',
      title: '邮箱',
      minWidth: 180,
    },
    {
      field: 'mobile',
      title: '手机号码',
      minWidth: 130,
    },
    {
      field: 'status',
      title: '账号状态',
      minWidth: 100,
      align: 'center',
      cellRender: {
        attrs: { beforeChange: onStatusChange },
        name: 'CellSwitch',
        props: {
          checkedValue: CommonStatusEnum.ENABLE,
          unCheckedValue: CommonStatusEnum.DISABLE,
        },
      },
    },
    {
      field: 'loginDate',
      title: '最后登录时间',
      minWidth: 180,
      formatter: 'formatDateTime',
    },
    {
      field: 'createTime',
      title: '创建时间',
      minWidth: 180,
      formatter: 'formatDateTime',
    },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
