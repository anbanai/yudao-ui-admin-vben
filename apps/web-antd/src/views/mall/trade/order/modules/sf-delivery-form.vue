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
  getPrintDevices,
  getSfAccounts,
} from '#/api/mall/trade/logistics/sf';

import {
  getPrintTaskErrorMessage,
  isPrintTaskQueued,
} from '../../logistics/sf/delivery-status';

const emit = defineEmits(['success']);
const order = ref<MallOrderApi.Order>();
const accounts = ref<MallSfLogisticsApi.Account[]>([]);
const devices = ref<MallSfLogisticsApi.Device[]>([]);
const accountId = ref<number>();
const deviceId = ref<number>();
const result = ref<MallSfLogisticsApi.Waybill>();

const accountOptions = computed(() =>
  accounts.value
    .filter((item) => item.status === 0)
    .map((item) => ({ label: item.name, value: item.id })),
);
const deviceOptions = computed(() =>
  devices.value
    .filter((item) => item.status === 0)
    .map((item) => ({ label: item.deviceName, value: item.id })),
);
const selectedPaperSpec = computed(() => {
  const account = accounts.value.find((item) => item.id === accountId.value);
  return account
    ? `${account.paperWidthMm}×${account.paperHeightMm} mm`
    : '账号配置的标签尺寸';
});

const [Modal, modalApi] = useVbenModal({
  confirmText: '创建顺丰运单',
  async onConfirm() {
    if (!order.value?.id) return;
    if (!accountId.value || !deviceId.value) {
      message.warning('请选择顺丰账号和打印设备');
      return;
    }
    modalApi.lock();
    try {
      result.value = await createSfWaybill({
        accountId: accountId.value,
        deviceId: deviceId.value,
        orderId: order.value.id,
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
      result.value = undefined;
      return;
    }
    order.value = modalApi.getData() as MallOrderApi.Order;
    [accounts.value, devices.value] = await Promise.all([
      getSfAccounts(),
      getPrintDevices(),
    ]);
    accountId.value = accounts.value.find((item) => item.defaultFlag)?.id;
    deviceId.value = devices.value.find((item) => item.defaultFlag)?.id;
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
        <Form.Item label="顺丰账号" required>
          <Select v-model:value="accountId" :options="accountOptions" />
        </Form.Item>
        <Form.Item label="打印设备" required>
          <Select v-model:value="deviceId" :options="deviceOptions" />
        </Form.Item>
      </div>
    </Form>
    <Alert
      v-if="!result"
      type="info"
      show-icon
      :message="`创建成功后，PrintBridge 将自动拉取 ${selectedPaperSpec} 面单；只有打印回执 success 才会自动发货。`"
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
