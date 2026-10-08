<script lang="ts" setup>
import type { MallMerchantApi } from '#/api/mall/product/merchant';

import { computed, ref } from 'vue';

import { useVbenForm, useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import {
  createMerchant,
  getMerchant,
  updateMerchant,
} from '#/api/mall/product/merchant';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<MallMerchantApi.Merchant>();
const title = computed(() => (formData.value?.id ? '编辑商家' : '新增商家'));

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
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
    if (!valid) return;
    modalApi.lock();
    try {
      const data = (await formApi.getValues()) as MallMerchantApi.Merchant;
      await (formData.value?.id ? updateMerchant(data) : createMerchant(data));
      await modalApi.close();
      emit('success');
      message.success('保存成功');
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      return;
    }
    const data = modalApi.getData() as MallMerchantApi.Merchant | undefined;
    if (!data) return;
    modalApi.lock();
    try {
      formData.value = data.id ? await getMerchant(data.id) : data;
      await formApi.setValues(formData.value);
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="title" class="w-[620px]">
    <Form class="mx-4" />
  </Modal>
</template>
