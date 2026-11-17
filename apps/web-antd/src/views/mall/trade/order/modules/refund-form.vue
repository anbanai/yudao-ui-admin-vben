<script lang="ts" setup>
import type { MallOrderApi } from '#/api/mall/trade/order';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { fenToYuan } from '@vben/utils';

import { useVbenForm } from '#/adapter/form';
import { refundOrder } from '#/api/mall/trade/order';
import { withOperationFeedback } from '#/utils/operation-feedback';

const emit = defineEmits(['success']);
const remainingRefund = ref(0);

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
      component: 'InputNumber',
      fieldName: 'refundPrice',
      label: '退款金额(元)',
      componentProps: { class: '!w-full', min: 0.01, precision: 2, step: 0.01 },
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'reason',
      label: '退款原因',
      componentProps: { placeholder: '请输入退款原因', type: 'textarea', rows: 3 },
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = (await formApi.getValues()) as MallOrderApi.OrderRefundReqVO & {
      refundPrice: number;
    };
    const amount = Number(values.refundPrice);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount * 100 > remainingRefund.value
    ) {
      await formApi.setFieldValue(
        'refundPrice',
        Number(fenToYuan(remainingRefund.value)),
      );
      return;
    }
    modalApi.lock();
    try {
      await withOperationFeedback(async () => {
        await refundOrder({
          id: values.id,
          refundPrice: Math.round(amount * 100),
          reason: values.reason,
        });
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
    if (!data?.id) return;
    remainingRefund.value = Math.max(
      (data.payPrice || 0) - (data.refundPrice || 0),
      0,
    );
    await formApi.setValues({
      id: data.id,
      refundPrice: Number(fenToYuan(remainingRefund.value)),
      reason: '',
    });
  },
});
</script>

<template>
  <Modal title="订单部分退款" class="w-1/3">
    <div class="px-4 pb-2 text-sm text-gray-500">
      可退款余额：{{ fenToYuan(remainingRefund) }} 元
    </div>
    <Form class="mx-4" />
  </Modal>
</template>
