<script lang="ts" setup>
import type { MallCouponTemplateApi } from '#/api/mall/promotion/coupon/couponTemplate';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import {} from '@vben/constants';

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
  createDefaultCouponFormData,
  type CouponTemplateFormValues,
  processCouponLoadData,
  processCouponSubmitData,
  useFormSchema,
} from '../data';

const emit = defineEmits(['success']);
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
  schema: useFormSchema(async (productScope) => {
    await formApi.setValues({
      productCategoryIds: undefined,
      productScope,
      productSpuIds: [],
    });
  }),
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
    const data = processCouponSubmitData(formValues);
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
      await formApi.reset({ values: createDefaultCouponFormData() });
      return;
    }
    // 加载数据
    const data = modalApi.getData() as MallCouponTemplateApi.CouponTemplate;
    if (!data || !data.id) {
      editingId.value = undefined;
      await formApi.reset({ values: createDefaultCouponFormData() });
      return;
    }
    modalApi.lock();
    try {
      const result = await getCouponTemplate(data.id);
      editingId.value = result.id;
      const processedData = processCouponLoadData(result);
      // 设置到表单
      await formApi.setValues(processedData);
    } finally {
      modalApi.unlock();
    }
  },
});
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
