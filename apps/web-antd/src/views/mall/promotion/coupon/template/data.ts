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
import { convertToInteger, formatToFraction } from '@vben/utils';

import { getRangePickerDefaultProps } from '#/utils';

export interface ProductScopeFormValues {
  productCategoryIds?: number | number[];
  productScope?: number;
  productScopeValues?: number[];
  productSpuIds?: number[];
}

export type CouponTemplateFormValues = Omit<
  Partial<MallCouponTemplateApi.CouponTemplate>,
  'discountLimitPrice' | 'discountPrice' | 'usePrice'
> & {
  discountLimitPrice?: number | string;
  discountPrice?: number | string;
  productCategoryIds?: number | number[];
  productSpuIds?: number[];
  usePrice?: number | string;
  validTimes?: Date[];
};

export interface CouponScopeChangeEvent {
  target: { value: null | number | undefined };
}

interface CouponScopeFormApi {
  setValues(values: CouponTemplateFormValues): Promise<unknown>;
}

interface CouponSubmitFormApi {
  getValues(): Promise<CouponTemplateFormValues>;
  validate(): Promise<{ valid: boolean }>;
}

interface CouponSubmitModalApi {
  close(): Promise<unknown>;
  lock(): void;
  unlock(): void;
}

interface CouponOpenFormApi {
  reset(options: { values: CouponTemplateFormValues }): Promise<unknown>;
  setValues(values: CouponTemplateFormValues): Promise<unknown>;
}

interface CouponOpenModalApi {
  getData(): unknown;
  lock(): void;
  unlock(): void;
}

type CouponTemplateLoadData = Pick<
  MallCouponTemplateApi.CouponTemplate,
  'discountLimitPrice' | 'discountPrice' | 'usePrice'
> &
  Partial<MallCouponTemplateApi.CouponTemplate>;

export function createDefaultCouponFormData(): CouponTemplateFormValues {
  return {
    productCategoryIds: undefined,
    productScope: PromotionProductScopeEnum.ALL.scope,
    productSpuIds: [],
  };
}

function normalizeIds(value: number | number[] | undefined): number[] {
  if (Array.isArray(value)) {
    return [...value];
  }
  return value === undefined ? [] : [value];
}

/** Convert the active selector to the API's persisted scope shape. */
export function getProductScopeValues(
  values: ProductScopeFormValues,
): number[] {
  if (values.productScope === PromotionProductScopeEnum.SPU.scope) {
    return [...(values.productSpuIds ?? [])];
  }
  if (values.productScope === PromotionProductScopeEnum.CATEGORY.scope) {
    return normalizeIds(values.productCategoryIds);
  }
  return [];
}

/** Expand the API scope shape into the fields rendered by the form. */
export function expandProductScopeValues<T extends ProductScopeFormValues>(
  values: T,
): T {
  const scopeValues = [...(values.productScopeValues ?? [])];
  return {
    ...values,
    productCategoryIds:
      values.productScope === PromotionProductScopeEnum.CATEGORY.scope
        ? scopeValues[0]
        : undefined,
    productSpuIds:
      values.productScope === PromotionProductScopeEnum.SPU.scope
        ? scopeValues
        : [],
  } as T;
}

export function processCouponLoadData(
  data: CouponTemplateLoadData,
): CouponTemplateFormValues {
  return expandProductScopeValues({
    ...data,
    discountPrice: formatToFraction(data.discountPrice),
    discountPercent:
      data.discountPercent === undefined
        ? undefined
        : data.discountPercent / 10,
    discountLimitPrice: formatToFraction(data.discountLimitPrice),
    usePrice: formatToFraction(data.usePrice),
    validTimes:
      data.validStartTime && data.validEndTime
        ? [data.validStartTime, data.validEndTime]
        : [],
  });
}

export function processCouponSubmitData(
  formValues: CouponTemplateFormValues,
): MallCouponTemplateApi.CouponTemplate {
  return {
    ...formValues,
    productScopeValues: getProductScopeValues(formValues),
    discountPrice: convertToInteger(formValues.discountPrice),
    discountPercent:
      formValues.discountPercent === undefined
        ? undefined
        : formValues.discountPercent * 10,
    discountLimitPrice: convertToInteger(formValues.discountLimitPrice),
    usePrice: convertToInteger(formValues.usePrice),
    validStartTime:
      formValues.validTimes?.length === 2
        ? formValues.validTimes[0]
        : undefined,
    validEndTime:
      formValues.validTimes?.length === 2
        ? formValues.validTimes[1]
        : undefined,
    totalCount:
      formValues.takeType === CouponTemplateTakeTypeEnum.USER.type
        ? formValues.totalCount
        : -1,
    takeLimitCount:
      formValues.takeType === CouponTemplateTakeTypeEnum.USER.type
        ? formValues.takeLimitCount
        : -1,
  } as MallCouponTemplateApi.CouponTemplate;
}

export function createCouponScopeChangeHandler(formApi: CouponScopeFormApi) {
  let pending = Promise.resolve();
  return (event: CouponScopeChangeEvent) => {
    const productScope =
      event.target.value ?? PromotionProductScopeEnum.ALL.scope;
    const operation = pending
      .catch(() => undefined)
      .then(async () => {
        await formApi.setValues({
          productCategoryIds: undefined,
          productScope,
          productSpuIds: [],
        });
      });
    pending = operation;
    return operation;
  };
}

export async function submitCouponTemplateForm({
  createCouponTemplate,
  editingId,
  formApi,
  modalApi,
  onSuccess,
  updateCouponTemplate,
}: {
  createCouponTemplate: (
    data: MallCouponTemplateApi.CouponTemplate,
  ) => Promise<unknown>;
  editingId: number | undefined;
  formApi: CouponSubmitFormApi;
  modalApi: CouponSubmitModalApi;
  onSuccess: () => void;
  updateCouponTemplate: (
    data: MallCouponTemplateApi.CouponTemplate,
  ) => Promise<unknown>;
}) {
  const { valid } = await formApi.validate();
  if (!valid) return false;
  modalApi.lock();
  try {
    const data = processCouponSubmitData(await formApi.getValues());
    await (editingId ? updateCouponTemplate(data) : createCouponTemplate(data));
    await modalApi.close();
    onSuccess();
    return true;
  } finally {
    modalApi.unlock();
  }
}

export async function syncCouponTemplateFormOpen({
  formApi,
  getCouponTemplate,
  isOpen,
  modalApi,
  setEditingId,
}: {
  formApi: CouponOpenFormApi;
  getCouponTemplate: (id: number) => Promise<CouponTemplateLoadData>;
  isOpen: boolean;
  modalApi: CouponOpenModalApi;
  setEditingId: (id: number | undefined) => void;
}) {
  if (!isOpen) {
    setEditingId(undefined);
    await formApi.reset({ values: createDefaultCouponFormData() });
    return;
  }
  const data = modalApi.getData() as { id?: number } | undefined;
  if (!data?.id) {
    setEditingId(undefined);
    await formApi.reset({ values: createDefaultCouponFormData() });
    return;
  }
  modalApi.lock();
  try {
    const result = await getCouponTemplate(data.id);
    setEditingId(result.id);
    await formApi.setValues(processCouponLoadData(result));
  } finally {
    modalApi.unlock();
  }
}

import {
  discountFormat,
  remainedCountFormat,
  takeLimitCountFormat,
  totalCountFormat,
  validityTypeFormat,
} from '../formatter';

/** 新增/修改的表单 */
export function useFormSchema(
  onProductScopeChange?: (
    event: CouponScopeChangeEvent,
  ) => Promise<void> | void,
): VbenFormSchema[] {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      hide: true,
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
      fieldName: 'description',
      label: '优惠券描述',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入优惠券描述',
      },
    },
    {
      fieldName: 'productScope',
      label: '优惠劵类型',
      component: 'RadioGroup',
      componentProps: {
        options: getDictOptions(DICT_TYPE.PROMOTION_PRODUCT_SCOPE, 'number'),
        onChange: async (event: CouponScopeChangeEvent) => {
          await onProductScopeChange?.(event);
        },
      },
      rules: 'required',
      defaultValue: PromotionProductScopeEnum.ALL.scope,
    },
    {
      fieldName: 'productSpuIds',
      label: '商品',
      component: 'Input',
      dependencies: {
        triggerFields: ['productScope'],
        resolve({ values }) {
          return {
            show: values.productScope === PromotionProductScopeEnum.SPU.scope,
          };
        },
      },
      rules: 'required',
    },
    {
      fieldName: 'productCategoryIds',
      label: '商品分类',
      component: 'Input',
      dependencies: {
        triggerFields: ['productScope'],
        resolve({ values }) {
          return {
            show:
              values.productScope === PromotionProductScopeEnum.CATEGORY.scope,
          };
        },
      },
      rules: 'required',
    },
    {
      fieldName: 'discountType',
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
        triggerFields: ['discountType'],
        resolve({ values }) {
          return {
            show: values.discountType === PromotionDiscountTypeEnum.PRICE.type,
          };
        },
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
        triggerFields: ['discountType'],
        resolve({ values }) {
          return {
            show:
              values.discountType === PromotionDiscountTypeEnum.PERCENT.type,
          };
        },
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
        triggerFields: ['discountType'],
        resolve({ values }) {
          return {
            show:
              values.discountType === PromotionDiscountTypeEnum.PERCENT.type,
          };
        },
      },
      rules: 'required',
    },
    {
      fieldName: 'usePrice',
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
      dependencies: {
        triggerFields: ['takeType'],
        resolve({ values }) {
          return {
            show: values.takeType === CouponTemplateTakeTypeEnum.USER.type,
          };
        },
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
      dependencies: {
        triggerFields: ['takeType'],
        resolve({ values }) {
          return {
            show: values.takeType === 1,
          };
        },
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
        valueFormat: 'x',
      },
      dependencies: {
        triggerFields: ['validityType'],
        resolve({ values }) {
          return {
            show:
              values.validityType === CouponTemplateValidityTypeEnum.DATE.type,
          };
        },
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
        resolve({ values }) {
          return {
            show:
              values.validityType === CouponTemplateValidityTypeEnum.TERM.type,
          };
        },
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
        resolve({ values }) {
          return {
            show:
              values.validityType === CouponTemplateValidityTypeEnum.TERM.type,
          };
        },
      },
      rules: 'required',
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
