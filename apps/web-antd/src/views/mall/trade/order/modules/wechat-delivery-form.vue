<script lang="ts" setup>
import type { MallWechatLogisticsApi } from '#/api/mall/trade/logistics/wechat';
import type { MallOrderApi } from '#/api/mall/trade/order';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Alert, Descriptions, message, Result, Tag } from 'ant-design-vue';

import {
  confirmWechatWaybillPrint,
  createWechatWaybill,
} from '#/api/mall/trade/logistics/wechat';
import { withOperationFeedback } from '#/utils/operation-feedback';

import { createAndConfirmWechatWaybill } from './wechat-delivery';

const emit = defineEmits(['success']);
const order = ref<MallOrderApi.Order>();
const waybill = ref<MallWechatLogisticsApi.Waybill>();
const errorMessage = ref('');

const created = computed(
  () => waybill.value?.status === 'CREATED' && !!waybill.value.waybillId,
);

const [Modal, modalApi] = useVbenModal({
  confirmText: '确认发货',
  async onConfirm() {
    if (!order.value?.id) return;
    const orderId = order.value.id;
    errorMessage.value = '';
    modalApi.lock();
    try {
      const result = await withOperationFeedback(() =>
        createAndConfirmWechatWaybill(orderId, {
          confirmPrint: confirmWechatWaybillPrint,
          createWaybill: createWechatWaybill,
          onWaybillCreated: (createdWaybill) => {
            waybill.value = createdWaybill;
            modalApi.setState({ confirmText: '重试确认发货' });
          },
        }),
      );
      waybill.value = result;
      emit('success');
      await modalApi.close();
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '微信物流发货失败，请重试';
      message.error(errorMessage.value);
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      order.value = undefined;
      waybill.value = undefined;
      errorMessage.value = '';
      return;
    }
    order.value = modalApi.getData<MallOrderApi.Order>();
    waybill.value = undefined;
    modalApi.setState({ confirmText: '确认发货', showCancelButton: true });
  },
});
</script>

<template>
  <Modal title="微信打单发货" class="w-[520px]">
    <Descriptions v-if="order" :column="1" bordered size="small">
      <Descriptions.Item label="订单号">{{ order.no }}</Descriptions.Item>
      <Descriptions.Item label="收件人">
        {{ order.receiverName }}
        {{ order.receiverMobile }}
      </Descriptions.Item>
      <Descriptions.Item label="收货地址">
        {{ order.receiverAreaName }}{{ order.receiverDetailAddress }}
      </Descriptions.Item>
    </Descriptions>
    <Alert
      v-if="!waybill"
      class="mt-4"
      type="info"
      show-icon
      message="确认发货后，系统将创建微信运单、写入物流单号并更新订单为已发货。"
    />
    <Result
      v-if="created"
      class="py-4"
      status="success"
      title="微信运单已创建"
      sub-title="正在确认订单发货；如失败可直接重试。"
    >
      <template #extra>
        <Tag color="blue">{{ waybill?.waybillId }}</Tag>
      </template>
    </Result>
    <Alert
      v-if="errorMessage"
      class="mt-4"
      type="error"
      show-icon
      :message="errorMessage"
    />
  </Modal>
</template>
