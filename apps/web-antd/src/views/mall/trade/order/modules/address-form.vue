<script lang="ts" setup>
import type { MallOrderApi } from '#/api/mall/trade/order';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { updateOrderAddress } from '#/api/mall/trade/order';
import { $t } from '#/locales';
import { withOperationFeedback } from '#/utils/operation-feedback';

import { useAddressFormSchema } from '../data';

const emit = defineEmits(['success']);

const formData = ref<MallOrderApi.Order>();

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 120,
  },
  layout: 'horizontal',
  schema: useAddressFormSchema(),
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
    const data = await formApi.getValues();
    try {
      await withOperationFeedback(async () => {
        await updateOrderAddress(data as MallOrderApi.OrderUpdateAddressReqVO);
        await modalApi.close();
        emit('success');
      });
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      return;
    }
    // 加载数据
    const data = modalApi.getData() as MallOrderApi.Order;
    if (!data || !data.id) {
      return;
    }
    modalApi.lock();
    try {
      formData.value = data;
      // 设置到 values
      await formApi.setValues(formData.value);
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="$t('ui.actionTitle.edit', ['收货地址'])" class="w-1/3">
    <Form class="mx-4" />
  </Modal>
</template>
