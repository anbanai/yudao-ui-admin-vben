<script lang="ts" setup>
import type { MallCouponTemplateApi } from '#/api/mall/promotion/coupon/couponTemplate';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { CouponTemplateTakeTypeEnum } from '@vben/constants';
import { convertToInteger, formatToFraction } from '@vben/utils';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createCouponTemplate,
  getCouponTemplate,
  updateCouponTemplate,
} from '#/api/mall/promotion/coupon/couponTemplate';
import { $t } from '#/locales';
import { ProductCategorySelect } from '#/views/mall/product/category/components';
import { SpuShowcase } from '#/views/mall/product/spu/components';
import SpuSelect from '#/views/mall/product/spu/components/spu-select.vue';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const formData = ref<
  Partial<MallCouponTemplateApi.CouponTemplate> & {
    productCategoryIds?: number | number[];
    productSpuIds?: number[];
  }
>({});
const exchangeSelect = ref<InstanceType<typeof SpuSelect>>();
async function chooseExchange(spuId: number, skuIds?: number[]) {
  if (!skuIds?.[0]) return;
  formData.value.exchangeSpuId = spuId;
  formData.value.exchangeSkuId = skuIds[0];
  await formApi.setFieldValue('exchangeSpuId', spuId);
  await formApi.setFieldValue('exchangeSkuId', skuIds[0]);
}
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', ['优惠券模板'])
    : $t('ui.actionTitle.create', ['优惠券模板']);
});

const [Form, formApi] = useVbenForm({
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
    // 同步商品/分类选择到表单，确保验证时能获取到值
    if (formData.value.productSpuIds) {
      await formApi.setFieldValue(
        'productSpuIds',
        formData.value.productSpuIds,
      );
    }
    if (formData.value.productCategoryIds) {
      await formApi.setFieldValue(
        'productCategoryIds',
        formData.value.productCategoryIds,
      );
    }
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const formValues = (await formApi.getValues()) as any;
      const data = await processSubmitData(formValues);
      await (formData.value?.id
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
      formData.value = {};
      return;
    }
    // 加载数据
    const data = modalApi.getData() as MallCouponTemplateApi.CouponTemplate;
    if (!data || !data.id) {
      return;
    }
    modalApi.lock();
    try {
      formData.value = await getCouponTemplate(data.id);
      const processedData = await processLoadData(formData.value as any);
      // 设置到表单
      await formApi.setValues(processedData);
    } finally {
      modalApi.unlock();
    }
  },
});

/** 处理提交数据 */
async function processSubmitData(
  formValues: any,
): Promise<MallCouponTemplateApi.CouponTemplate> {
  return {
    ...formValues,
    couponType: formValues.couponType ?? 1,
    discountType: formValues.couponType === 2 ? 1 : formValues.discountType,
    productScope: formValues.couponType === 2 ? 2 : formValues.productScope,
    productScopeValues:
      formValues.couponType === 2
        ? [formValues.exchangeSpuId]
        : formValues.productScopeValues,
    exchangeSpuId:
      formValues.couponType === 2 ? formValues.exchangeSpuId : null,
    exchangeSkuId:
      formValues.couponType === 2 ? formValues.exchangeSkuId : null,
    canStack:
      formValues.couponType === 2 ? false : Boolean(formValues.canStack),
    stackLimit:
      formValues.couponType === 2 || !formValues.canStack
        ? 1
        : formValues.stackLimit,
    stackWithPromotion:
      formValues.couponType === 2
        ? false
        : Boolean(formValues.stackWithPromotion),
    newcomerOnly:
      formValues.takeType === CouponTemplateTakeTypeEnum.USER.type &&
      Boolean(formValues.newcomerOnly),
    // 金额转换：元转分
    discountPrice:
      formValues.couponType === 2
        ? 0
        : convertToInteger(formValues.discountPrice),
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
    totalCount: formValues.totalCount ?? -1,
    takeLimitCount: formValues.takeLimitCount ?? -1,
  };
}

/** 处理加载的数据 */
async function processLoadData(
  data: MallCouponTemplateApi.CouponTemplate,
): Promise<any> {
  return {
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
  };
}
</script>

<template>
  <Modal :title="getTitle" class="w-2/5">
    <Form class="mx-4">
      <template #exchangeSpuId>
        <div>
          <Button @click="exchangeSelect?.open()">选择规格</Button>
          <p>已选商品：{{ formData.exchangeSpuId }}</p>
        </div>
      </template>
      <!-- 自定义插槽：商品选择 -->
      <template #productSpuIds>
        <SpuShowcase v-model="formData.productSpuIds" />
      </template>
      <!-- 自定义插槽：分类选择 -->
      <template #productCategoryIds>
        <ProductCategorySelect v-model="formData.productCategoryIds" />
      </template>
    </Form>
    <SpuSelect
      ref="exchangeSelect"
      :is-select-sku="true"
      :radio="true"
      @select="chooseExchange"
    />
  </Modal>
</template>
