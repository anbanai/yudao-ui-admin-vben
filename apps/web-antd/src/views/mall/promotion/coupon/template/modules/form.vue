<script lang="ts" setup>
import type { MallCouponTemplateApi } from '#/api/mall/promotion/coupon/couponTemplate';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import {
  CouponTemplateTakeTypeEnum,
  PromotionProductScopeEnum,
} from '@vben/constants';
import { convertToInteger, formatToFraction } from '@vben/utils';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createCouponTemplate,
  getCouponTemplate,
  updateCouponTemplate,
} from '#/api/mall/promotion/coupon/couponTemplate';
import { $t } from '#/locales';
import { ProductCategorySelect } from '#/views/mall/product/category/components';
import { SpuShowcase } from '#/views/mall/product/spu/components';

import {
  expandProductScopeValues,
  getProductScopeValues,
  useFormSchema,
} from '../data';

const emit = defineEmits(['success']);
type CouponTemplateFormValues = Omit<
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

const editingId = ref<number>();
const getTitle = computed(() => {
  return editingId.value
    ? $t('ui.actionTitle.edit', ['优惠券模板'])
    : $t('ui.actionTitle.create', ['优惠券模板']);
});

const [Form, formApi] = useVbenForm<CouponTemplateFormValues>({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 120,
  },
  layout: 'horizontal',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    // 提交表单
    const formValues = await formApi.getValues();
    const data = await processSubmitData(formValues);
    try {
      await (editingId.value
        ? updateCouponTemplate(data)
        : createCouponTemplate(data));
      // 关闭并提示
      await modalApi.close();
      emit('success');
      message.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      editingId.value = undefined;
      await formApi.reset({ values: createDefaultFormData() });
      return;
    }
    // 加载数据
    const data = modalApi.getData() as MallCouponTemplateApi.CouponTemplate;
    if (!data || !data.id) {
      editingId.value = undefined;
      await formApi.reset({ values: createDefaultFormData() });
      return;
    }
    modalApi.lock();
    try {
      const result = await getCouponTemplate(data.id);
      editingId.value = result.id;
      const processedData = await processLoadData(result);
      // 设置到表单
      await formApi.setValues(processedData);
    } finally {
      modalApi.unlock();
    }
  },
});

/** 处理提交数据 */
async function processSubmitData(
  formValues: CouponTemplateFormValues,
): Promise<MallCouponTemplateApi.CouponTemplate> {
  return {
    ...formValues,
    productScopeValues: getProductScopeValues(formValues),
    // 金额转换：元转分
    discountPrice: convertToInteger(formValues.discountPrice),
    discountPercent:
      formValues.discountPercent === undefined
        ? undefined
        : formValues.discountPercent * 10,
    discountLimitPrice: convertToInteger(formValues.discountLimitPrice),
    usePrice: convertToInteger(formValues.usePrice),
    // 处理有效期时间
    validStartTime:
      formValues.validTimes && formValues.validTimes.length === 2
        ? formValues.validTimes[0]
        : undefined,
    validEndTime:
      formValues.validTimes && formValues.validTimes.length === 2
        ? formValues.validTimes[1]
        : undefined,
    // 处理发放数量和限领数量
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

/** 处理加载的数据 */
async function processLoadData(
  data: MallCouponTemplateApi.CouponTemplate,
): Promise<CouponTemplateFormValues> {
  return expandProductScopeValues({
    ...data,
    // 金额转换：分转元
    discountPrice: formatToFraction(data.discountPrice),
    discountPercent:
      data.discountPercent === undefined
        ? undefined
        : data.discountPercent / 10,
    discountLimitPrice: formatToFraction(data.discountLimitPrice),
    usePrice: formatToFraction(data.usePrice),
    // 处理有效期时间
    validTimes:
      data.validStartTime && data.validEndTime
        ? [data.validStartTime, data.validEndTime]
        : [],
  });
}

function createDefaultFormData() {
  return {
    productCategoryIds: undefined,
    productScope: PromotionProductScopeEnum.ALL.scope,
    productSpuIds: [],
  };
}
</script>

<template>
  <Modal :title="getTitle" class="w-2/5">
    <Form class="mx-4">
      <!-- 自定义插槽：商品选择 -->
      <template #productSpuIds="slotProps">
        <SpuShowcase v-bind="slotProps.componentField" />
      </template>
      <!-- 自定义插槽：分类选择 -->
      <template #productCategoryIds="slotProps">
        <ProductCategorySelect v-bind="slotProps.componentField" />
      </template>
    </Form>
  </Modal>
</template>
