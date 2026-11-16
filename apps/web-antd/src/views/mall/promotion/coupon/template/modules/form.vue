<script lang="ts" setup>
import type { CouponTemplateFormValues } from '../data';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

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
  createCouponScopeChangeHandler,
  submitCouponTemplateForm,
  syncCouponTemplateFormOpen,
  useFormSchema,
} from '../data';

const emit = defineEmits(['success']);
const editingId = ref<number>();
const getTitle = computed(() => {
  return editingId.value
    ? $t('ui.actionTitle.edit', ['优惠券模板'])
    : $t('ui.actionTitle.create', ['优惠券模板']);
});

const handleProductScopeChange = createCouponScopeChangeHandler({
  async setValues(values) {
    await formApi.setValues(values);
  },
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
  schema: useFormSchema(handleProductScopeChange),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await submitCouponTemplateForm({
      createCouponTemplate,
      editingId: editingId.value,
      formApi,
      modalApi,
      onSuccess() {
        emit('success');
        message.success($t('ui.actionMessage.operationSuccess'));
      },
      updateCouponTemplate,
    });
  },
  async onOpenChange(isOpen: boolean) {
    await syncCouponTemplateFormOpen({
      formApi,
      getCouponTemplate,
      isOpen,
      modalApi,
      setEditingId(id) {
        editingId.value = id;
      },
    });
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
