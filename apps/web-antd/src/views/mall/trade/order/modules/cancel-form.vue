<script lang="ts" setup>
import type { MallOrderApi } from '#/api/mall/trade/order';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { cancelOrder } from '#/api/mall/trade/order';
import { withOperationFeedback } from '#/utils/operation-feedback';

const emit = defineEmits(['success']);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    formItemClass: 'col-span-2',
    labelWidth: 100,
  },
  layout: 'horizontal',
  schema: [
    { component: 'Input', fieldName: 'id', hide: true },
    {
      component: 'Input',
      fieldName: 'reason',
      label: '取消原因',
      componentProps: { placeholder: '请输入取消原因', type: 'textarea', rows: 3 },
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    modalApi.lock();
    try {
      await withOperationFeedback(async () => {
        await cancelOrder((await formApi.getValues()) as MallOrderApi.OrderCancelReqVO);
        await modalApi.close();
        emit('success');
      });
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) return;
    const data = modalApi.getData() as MallOrderApi.Order;
    if (data?.id) await formApi.setValues({ id: data.id, reason: '' });
  },
});
</script>

<template>
  <Modal title="运营取消订单" class="w-1/3">
    <Form class="mx-4" />
  </Modal>
</template>
