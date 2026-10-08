<script lang="ts" setup>
import type { MallMerchantApi } from '#/api/mall/product/merchant';

import { computed, ref } from 'vue';

import { useVbenForm, useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import {
  createMerchantQualification,
  updateMerchantQualification,
} from '#/api/mall/product/merchant';

const emit = defineEmits<{ success: [] }>();
const formData = ref<MallMerchantApi.Qualification>();
const title = computed(() => (formData.value?.id ? '编辑资质' : '新增资质'));

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    formItemClass: 'col-span-2',
    labelWidth: 100,
  },
  layout: 'horizontal',
  schema: [
    { fieldName: 'id', component: 'Input', hide: true },
    { fieldName: 'merchantId', component: 'Input', hide: true },
    {
      fieldName: 'type',
      label: '资质类型',
      component: 'Input',
      componentProps: { placeholder: '如：营业执照' },
      rules: 'required',
    },
    { fieldName: 'certificateNo', label: '证件编号', component: 'Input' },
    {
      fieldName: 'fileUrl',
      label: '证件文件',
      component: 'FileUpload',
      componentProps: { maxNumber: 1 },
      rules: 'required',
    },
    { fieldName: 'validStart', label: '有效期开始', component: 'DatePicker' },
    { fieldName: 'validEnd', label: '有效期结束', component: 'DatePicker' },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    modalApi.lock();
    try {
      const data = (await formApi.getValues()) as MallMerchantApi.Qualification;
      await (formData.value?.id
        ? updateMerchantQualification(data)
        : createMerchantQualification(data));
      await modalApi.close();
      emit('success');
      message.success('保存成功');
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange: async (isOpen: boolean) => {
    if (!isOpen) {
      formData.value = undefined;
      return;
    }
    const data = modalApi.getData() as MallMerchantApi.Qualification;
    formData.value = data;
    await formApi.setValues(data);
  },
});
</script>

<template>
  <Modal :title="title" class="w-[560px]"><Form class="mx-4" /></Modal>
</template>
