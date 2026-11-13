import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { MallCouponTemplateApi } from '#/api/mall/promotion/coupon/couponTemplate';

import {
  CommonStatusEnum,
  CouponTemplateTakeTypeEnum,
  CouponTemplateValidityTypeEnum,
  DICT_TYPE,
  PromotionDiscountTypeEnum,
  PromotionProductScopeEnum,
} from '@vben/constants';
import { getDictOptions } from '@vben/hooks';

import { z } from '#/adapter/form';
import { getRangePickerDefaultProps } from '#/utils';

import {
  discountFormat,
  remainedCountFormat,
  takeLimitCountFormat,
  totalCountFormat,
  validityTypeFormat,
} from '../formatter';

/** 新增/修改的表单 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'name',
      label: '优惠券名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入优惠券名称',
      },
      rules: 'required',
    },
    {
      fieldName: 'couponType',
      label: '券用途',
      component: 'RadioGroup',
      defaultValue: 1,
      componentProps: {
        options: [
          { label: '优惠券', value: 1 },
          { label: '商品兑换券', value: 2 },
        ],
      },
      rules: 'required',
    },
    {
      fieldName: 'exchangeSpuId',
      label: '兑换商品SPU',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        precision: 0,
        placeholder: '选择兑换商品和规格',
      },
      dependencies: {
        triggerFields: ['couponType'],
        show: (v) => v.couponType === 2,
      },
      rules: 'required',
    },
    {
      fieldName: 'exchangeSkuId',
      label: '兑换规格SKU',
      component: 'InputNumber',
      componentProps: { min: 1, precision: 0 },
      dependencies: {
        triggerFields: ['couponType'],
        show: (v) => v.couponType === 2,
      },
      rules: 'required',
      help: '绑定一个真实规格；兑换按正常订单履约，可能另付运费。',
    },
    {
      fieldName: 'canStack',
      label: '允许券叠加',
      component: 'Switch',
      defaultValue: false,
      dependencies: {
        triggerFields: ['couponType'],
        show: (v) => v.couponType !== 2,
      },
    },
    {
      fieldName: 'stackLimit',
      label: '同组叠加上限',
      component: 'InputNumber',
      defaultValue: 1,
      componentProps: { min: 1, max: 10, precision: 0 },
      rules: z.number().int().min(1).max(10),
      dependencies: {
        triggerFields: ['canStack', 'couponType'],
        show: (v) => v.couponType !== 2 && v.canStack,
      },
    },
    {
      fieldName: 'stackWithPromotion',
      label: '可同用其他营销',
      component: 'Switch',
      defaultValue: false,
      help: '包括折扣、会员优惠、满减和积分抵扣；所有选中券都必须允许。',
      dependencies: {
        triggerFields: ['couponType'],
        show: (v) => v.couponType !== 2,
      },
    },
    {
      fieldName: 'newcomerOnly',
      label: '首页新人券',
      component: 'Switch',
      defaultValue: false,
      help: '限用户主动领取模板；资格和升级隐藏由后台判断，已领取券有效期固定。',
      dependencies: {
        triggerFields: ['takeType'],
        show: (v) => v.takeType === CouponTemplateTakeTypeEnum.USER.type,
      },
    },
    {
      fieldName: 'description',
      label: '优惠券描述',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入优惠券描述',
      },
    },
    {
      fieldName: 'productScope',
      dependencies: {
        triggerFields: ['couponType'],
        show: (v) => v.couponType !== 2,
      },
      label: '商品适用范围',
      component: 'RadioGroup',
      componentProps: {
        options: getDictOptions(DICT_TYPE.PROMOTION_PRODUCT_SCOPE, 'number'),
      },
      rules: 'required',
      defaultValue: PromotionProductScopeEnum.ALL.scope,
    },
    {
      fieldName: 'productSpuIds',
      label: '商品',
      component: 'Input',
      dependencies: {
        triggerFields: ['productScope', 'productScopeValues', 'couponType'],
        show: (model) =>
          model.couponType !== 2 &&
          model.productScope === PromotionProductScopeEnum.SPU.scope,
        trigger(values, form) {
          // 当加载已有数据时，根据 productScopeValues 设置 productSpuIds
          if (
            values.productScope === PromotionProductScopeEnum.SPU.scope &&
            values.productScopeValues
          ) {
            form.setFieldValue('productSpuIds', values.productScopeValues);
          }
        },
      },
      rules: 'required',
    },
    {
      fieldName: 'productCategoryIds',
      label: '商品分类',
      component: 'Input',
      dependencies: {
        triggerFields: ['productScope', 'productScopeValues', 'couponType'],
        show: (model) =>
          model.couponType !== 2 &&
          model.productScope === PromotionProductScopeEnum.CATEGORY.scope,
        trigger(values, form) {
          // 当加载已有数据时，根据 productScopeValues 设置 productCategoryIds
          if (
            values.productScope === PromotionProductScopeEnum.CATEGORY.scope &&
            values.productScopeValues
          ) {
            const categoryIds = values.productScopeValues;
            // 单选时使用数组不能反显，取第一个元素
            form.setFieldValue(
              'productCategoryIds',
              Array.isArray(categoryIds) && categoryIds.length > 0
                ? categoryIds[0]
                : categoryIds,
            );
          }
        },
      },
      rules: 'required',
    },
    {
      fieldName: 'discountType',
      dependencies: {
        triggerFields: ['couponType'],
        show: (v) => v.couponType !== 2,
      },
      label: '优惠类型',
      component: 'RadioGroup',
      componentProps: {
        options: getDictOptions(DICT_TYPE.PROMOTION_DISCOUNT_TYPE, 'number'),
      },
      rules: 'required',
      defaultValue: PromotionDiscountTypeEnum.PRICE.type,
    },
    {
      fieldName: 'discountPrice',
      label: '优惠券面额',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 2,
        placeholder: '请输入优惠金额，单位：元',
        addonAfter: '元',
      },
      dependencies: {
        triggerFields: ['discountType', 'couponType'],
        show: (model) =>
          model.couponType !== 2 &&
          model.discountType === PromotionDiscountTypeEnum.PRICE.type,
      },
      rules: 'required',
    },
    {
      fieldName: 'discountPercent',
      label: '优惠券折扣',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 1,
        max: 9.9,
        precision: 1,
        placeholder: '优惠券折扣不能小于 1 折，且不可大于 9.9 折',
        addonAfter: '折',
      },
      dependencies: {
        triggerFields: ['discountType', 'couponType'],
        show: (model) =>
          model.couponType !== 2 &&
          model.discountType === PromotionDiscountTypeEnum.PERCENT.type,
      },
      rules: 'required',
    },
    {
      fieldName: 'discountLimitPrice',
      label: '最多优惠',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 2,
        placeholder: '请输入最多优惠',
        addonAfter: '元',
      },
      dependencies: {
        triggerFields: ['discountType', 'couponType'],
        show: (model) =>
          model.couponType !== 2 &&
          model.discountType === PromotionDiscountTypeEnum.PERCENT.type,
      },
      rules: 'required',
    },
    {
      fieldName: 'usePrice',
      defaultValue: 0,
      label: '满多少元可以使用',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 2,
        placeholder: '无门槛请设为 0',
        addonAfter: '元',
      },
      rules: 'required',
    },
    {
      fieldName: 'takeType',
      label: '领取方式',
      component: 'RadioGroup',
      componentProps: {
        options: getDictOptions(DICT_TYPE.PROMOTION_COUPON_TAKE_TYPE, 'number'),
      },
      rules: 'required',
      defaultValue: CouponTemplateTakeTypeEnum.USER.type,
    },
    {
      fieldName: 'totalCount',
      label: '发放数量',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: -1,
        placeholder: '发放数量，没有之后不能领取或发放，-1 为不限制',
        addonAfter: '张',
      },

      rules: 'required',
    },
    {
      fieldName: 'takeLimitCount',
      label: '每人限领个数',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: -1,
        placeholder: '设置为 -1 时，可无限领取',
        addonAfter: '张',
      },

      rules: 'required',
    },
    {
      fieldName: 'validityType',
      label: '有效期类型',
      component: 'RadioGroup',
      componentProps: {
        options: getDictOptions(
          DICT_TYPE.PROMOTION_COUPON_TEMPLATE_VALIDITY_TYPE,
          'number',
        ),
      },
      defaultValue: CouponTemplateValidityTypeEnum.DATE.type,
      rules: 'required',
    },
    {
      fieldName: 'validTimes',
      label: '固定日期',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      dependencies: {
        triggerFields: ['validityType'],
        show: (model) =>
          model.validityType === CouponTemplateValidityTypeEnum.DATE.type,
      },
      rules: 'required',
    },
    {
      fieldName: 'fixedStartTerm',
      label: '领取日期',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        placeholder: '第 0 为今天生效',
        addonBefore: '第',
        addonAfter: '天',
      },
      dependencies: {
        triggerFields: ['validityType'],
        show: (model) =>
          model.validityType === CouponTemplateValidityTypeEnum.TERM.type,
      },
      rules: 'required',
    },
    {
      fieldName: 'fixedEndTerm',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        placeholder: '请输入结束天数',
        addonBefore: '至',
        addonAfter: '天有效',
      },
      dependencies: {
        triggerFields: ['validityType'],
        show: (model) =>
          model.validityType === CouponTemplateValidityTypeEnum.TERM.type,
      },
      rules: 'required',
    },
    {
      fieldName: 'productScopeValues',
      component: 'Input',
      dependencies: {
        triggerFields: ['productScope', 'productSpuIds', 'productCategoryIds'],
        show: () => false,
        trigger(values, form) {
          switch (values.productScope) {
            case PromotionProductScopeEnum.CATEGORY.scope: {
              const categoryIds = Array.isArray(values.productCategoryIds)
                ? values.productCategoryIds
                : [values.productCategoryIds];
              form.setFieldValue('productScopeValues', categoryIds);
              break;
            }
            case PromotionProductScopeEnum.SPU.scope: {
              form.setFieldValue('productScopeValues', values.productSpuIds);
              break;
            }
          }
        },
      },
    },
  ];
}

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'name',
      label: '优惠券名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入优惠劵名',
        allowClear: true,
      },
    },
    {
      fieldName: 'discountType',
      label: '优惠类型',
      component: 'Select',
      componentProps: {
        placeholder: '请选择优惠类型',
        allowClear: true,
        options: getDictOptions(DICT_TYPE.PROMOTION_DISCOUNT_TYPE, 'number'),
      },
    },
    {
      fieldName: 'status',
      label: '优惠券状态',
      component: 'Select',
      componentProps: {
        placeholder: '请选择优惠券状态',
        allowClear: true,
        options: getDictOptions(DICT_TYPE.COMMON_STATUS, 'number'),
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

/** 列表的字段 */
export function useGridColumns(
  onStatusChange?: (
    newStatus: number,
    row: MallCouponTemplateApi.CouponTemplate,
  ) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'name',
      title: '优惠券名称',
      minWidth: 140,
    },
    {
      field: 'couponType',
      title: '券用途',
      minWidth: 110,
      formatter: ({ cellValue }) => (cellValue === 2 ? '商品兑换券' : '优惠券'),
    },
    {
      field: 'newcomerOnly',
      title: '新人专享',
      minWidth: 90,
      formatter: ({ cellValue }) => (cellValue ? '是' : '否'),
    },
    {
      field: 'productScope',
      title: '类型',
      minWidth: 130,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.PROMOTION_PRODUCT_SCOPE },
      },
    },
    {
      field: 'discountType',
      title: '优惠',
      minWidth: 110,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.PROMOTION_DISCOUNT_TYPE },
      },
    },
    {
      field: 'discountPrice',
      title: '优惠力度',
      minWidth: 110,
      formatter: ({ row }) => {
        return discountFormat(row);
      },
    },
    {
      field: 'takeType',
      title: '领取方式',
      minWidth: 100,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.PROMOTION_COUPON_TAKE_TYPE },
      },
    },
    {
      field: 'validityType',
      title: '使用时间',
      minWidth: 180,
      formatter: ({ row }) => {
        return validityTypeFormat(row);
      },
    },
    {
      field: 'totalCount',
      title: '发放数量',
      minWidth: 100,
      formatter: ({ row }) => {
        return totalCountFormat(row);
      },
    },
    {
      field: 'remainedCount',
      title: '剩余数量',
      minWidth: 100,
      formatter: ({ row }) => {
        return remainedCountFormat(row);
      },
    },
    {
      field: 'takeLimitCount',
      title: '领取上限',
      minWidth: 100,
      formatter: ({ row }) => {
        return takeLimitCountFormat(row);
      },
    },
    {
      field: 'status',
      title: '状态',
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
      field: 'createTime',
      title: '创建时间',
      minWidth: 180,
      formatter: 'formatDateTime',
    },
    {
      title: '操作',
      width: 120,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
