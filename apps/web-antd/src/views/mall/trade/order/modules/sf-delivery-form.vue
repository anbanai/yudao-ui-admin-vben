<script lang="ts" setup>
import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';
import type { MallOrderApi } from '#/api/mall/trade/order';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Alert,
  Descriptions,
  Form,
  message,
  Result,
  Select,
  Tag,
} from 'ant-design-vue';

import {
  createSfWaybill,
  getMerchantSfConfig,
} from '#/api/mall/trade/logistics/sf';

import {
  getPrintTaskErrorMessage,
  isPrintTaskQueued,
} from '../../logistics/sf/delivery-status';
const emit = defineEmits(['success']);
const order = ref<MallOrderApi.Order>();
const subOrderId = ref<number>();
const merchantMonthlyCardMasked = ref('');
const result = ref<MallSfLogisticsApi.Waybill>();

const subOrderOptions = computed(() =>
  (order.value?.subOrders ?? [])
    .filter((item) => item.id !== undefined)
    .map((item) => ({
      label: `${item.merchantName || `商家 #${item.merchantId}`} · ${item.no || item.id}`,
      value: item.id,
    })),
);

async function loadMerchantCard(subOrderIdValue?: number) {
  merchantMonthlyCardMasked.value = '';
  const merchantId = order.value?.subOrders?.find(
    (item) => item.id === subOrderIdValue,
  )?.merchantId;
  if (!merchantId) return;
  const config = await getMerchantSfConfig(merchantId);
  if (subOrderId.value === subOrderIdValue)
    merchantMonthlyCardMasked.value = config.monthlyCardMasked || '';
}

function handleSubOrderChange(value: unknown) {
  result.value = undefined;
  if (typeof value === 'number' || typeof value === 'string') {
    void loadMerchantCard(Number(value));
  }
}

const [Modal, modalApi] = useVbenModal({
  confirmText: '创建顺丰运单',
  async onConfirm() {
    if (!order.value?.id || !subOrderId.value) return;
    modalApi.lock();
    try {
      result.value = await createSfWaybill({
        orderId: order.value.id,
        subOrderId: subOrderId.value,
      });
      if (isPrintTaskQueued(result.value.printStatus)) {
        message.success('顺丰运单和打印任务已创建，等待 PrintBridge 拉取');
        emit('success');
        await modalApi.close();
      }
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) {
      order.value = undefined;
      subOrderId.value = undefined;
      merchantMonthlyCardMasked.value = '';
      result.value = undefined;
      return;
    }
    order.value = modalApi.getData() as MallOrderApi.Order;
    subOrderId.value = order.value.subOrders?.[0]?.id;
    await loadMerchantCard(subOrderId.value);
  },
});
</script>

<template>
  <Modal title="顺丰打单发货" class="w-[560px]">
    <Descriptions v-if="order" :column="1" bordered size="small">
      <Descriptions.Item label="订单号">{{ order.no }}</Descriptions.Item>
      <Descriptions.Item label="收件人">
        {{ order.receiverName }} {{ order.receiverMobile }}
      </Descriptions.Item>
      <Descriptions.Item label="收货地址">
        {{ order.receiverAreaName }}{{ order.receiverDetailAddress }}
      </Descriptions.Item>
    </Descriptions>
    <Form class="mt-4" layout="vertical">
      <div class="grid grid-cols-2 gap-4">
        <Form.Item label="商家履约单" required>
          <Select
            v-model:value="subOrderId"
            :options="subOrderOptions"
            @change="handleSubOrderChange"
          />
        </Form.Item>
      </div>
      <div class="text-sm text-gray-500">
        商家月结卡：{{ merchantMonthlyCardMasked || '未配置' }}
      </div>
    </Form>
    <Alert
      v-if="!result"
      type="info"
      show-icon
      message="使用履约商家的寄件设置和默认打印设备。设备回报打印成功后，系统会自动确认发货。"
    />
    <Result
      v-else-if="isPrintTaskQueued(result.printStatus)"
      status="success"
      title="打印任务已创建"
    >
      <template #extra>
        <Tag color="blue">{{ result.waybillNo }}</Tag>
      </template>
    </Result>
    <Alert
      v-else
      type="error"
      show-icon
      :message="
        getPrintTaskErrorMessage(result.printStatus, result.errorMessage)
      "
    />
  </Modal>
</template>
