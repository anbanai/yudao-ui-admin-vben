import type { VbenFormSchema } from '#/adapter/form';

import { z } from '#/adapter/form';

const clock = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, '请输入HH:mm')
  .nullish();

export const schema: VbenFormSchema[] = [
  {
    fieldName: 'pointValidityDays',
    label: '积分有效天数',
    component: 'InputNumber',
    defaultValue: 365,
    rules: z.number().int().min(1),
    help: '逐笔固定到期，修改只影响之后发放的积分，消费按先到期先扣。',
    componentProps: { min: 1, precision: 0, class: '!w-full' },
  },
  {
    fieldName: 'pointDoubleStartTime',
    label: '双倍开始时间',
    component: 'TimePicker',
    rules: clock,
    componentProps: { format: 'HH:mm', valueFormat: 'HH:mm', allowClear: true },
    help: '开始和结束需同时配置或同时清空。命中固定2倍；支持跨午夜；起止相同表示全天。',
  },
  {
    fieldName: 'pointDoubleEndTime',
    label: '双倍结束时间',
    component: 'TimePicker',
    rules: clock,
    componentProps: { format: 'HH:mm', valueFormat: 'HH:mm', allowClear: true },
  },
  {
    fieldName: 'pointDoubleTimezone',
    label: '双倍时区',
    component: 'Input',
    defaultValue: 'Asia/Shanghai',
    rules: 'required',
    componentProps: { placeholder: '如 Asia/Shanghai' },
  },
  {
    fieldName: 'pointDoubleWeekdays',
    label: '双倍起始星期',
    component: 'Input',
    rules: z
      .string()
      .regex(/^$|^[1-7](,[1-7])*$/, '请输入1至7，英文逗号分隔')
      .nullish(),
    help: '1为周一，7为周日；留空每天。跨午夜时凌晨归前一天；最终积分向下取整。',
    componentProps: { placeholder: '例如 1,3,5' },
  },
  {
    component: 'Input',
    fieldName: 'id',
    dependencies: {
      triggerFields: [''],
      show: () => false,
    },
  },
  {
    component: 'Switch',
    fieldName: 'pointTradeDeductEnable',
    label: '积分抵扣',
    help: '下单积分是否抵用订单金额',
  },
  {
    component: 'InputNumber',
    fieldName: 'pointTradeDeductUnitPrice',
    label: '积分抵扣',
    help: '积分抵用比例(1 积分抵多少金额)，单位：元',
    componentProps: {
      class: '!w-full',
      min: 0,
      precision: 2,
      placeholder: '请输入积分抵扣单价',
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'pointTradeDeductMaxPrice',
    label: '积分抵扣最大值',
    help: '单次下单积分使用上限，0 不限制',
    componentProps: {
      class: '!w-full',
      min: 0,
      placeholder: '请输入积分抵扣最大值',
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'pointTradeGivePoint',
    label: '1 元赠送多少分',
    help: '下单支付金额按比例赠送积分（实际支付 1 元赠送多少积分）',
    componentProps: {
      class: '!w-full',
      min: 0,
      placeholder: '请输入赠送积分比例',
    },
  },
];
