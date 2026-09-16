import type { VbenFormSchema } from '#/adapter/form';

export const schema: VbenFormSchema[] = [
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
      min: 0,
      precision: 2,
      placeholder: '请输入积分抵扣单价',
      controlsPosition: 'right',
      class: '!w-full',
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'pointTradeDeductMaxPrice',
    label: '积分抵扣最大值',
    help: '单次下单积分使用上限，0 不限制',
    componentProps: {
      min: 0,
      placeholder: '请输入积分抵扣最大值',
      controlsPosition: 'right',
      class: '!w-full',
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'pointTradeGivePoint',
    label: '1 元赠送多少分',
    help: '独立于积分抵扣开关；按商品实付金额赠送，设置为 0 时关闭消费赠分',
    componentProps: {
      min: 0,
      placeholder: '请输入赠送积分比例',
      controlsPosition: 'right',
      class: '!w-full',
    },
  },
  {
    component: 'RadioGroup',
    fieldName: 'pointTradeGiveTiming',
    label: '积分发放时机',
    help: '可选择支付后立即发放，或确认收货后发放',
    componentProps: {
      options: [
        { label: '支付后立即发放', value: 1 },
        { label: '确认收货后发放', value: 2 },
      ],
    },
    defaultValue: 1,
  },
];
