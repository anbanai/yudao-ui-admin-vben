<script lang="ts" setup>
import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';
import type { MallOrderApi } from '#/api/mall/trade/order';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useVbenModal } from '@vben/common-ui';

import {
  Alert,
  Button,
  Descriptions,
  Form,
  message,
  Result,
  Select,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  batchCreateSfWaybills,
  getPrintDevices,
  getSfAccounts,
} from '#/api/mall/trade/logistics/sf';

import {
  getPrintTaskErrorMessage,
  isPrintTaskQueued,
} from '../../logistics/sf/delivery-status';
import {
  isReadyPrintDevice,
  selectReadyPrintDeviceId,
} from '../../logistics/sf/devices/setup-state';
import {
  getDeviceConnectionState,
  isBatchSizeValid,
  summarizeBatchResults,
} from '../batch-shipping';

const emit = defineEmits(['success']);
const { push } = useRouter();
const orders = ref<MallOrderApi.Order[]>([]);
const accounts = ref<MallSfLogisticsApi.Account[]>([]);
const devices = ref<MallSfLogisticsApi.Device[]>([]);
const accountId = ref<number>();
const deviceId = ref<number>();
const results = ref<MallSfLogisticsApi.Waybill[]>([]);

const accountOptions = computed(() =>
  accounts.value
    .filter((item) => item.status === 0 && item.id !== undefined)
    .map((item) => ({ label: item.name, value: item.id })),
);
const deviceOptions = computed(() =>
  devices.value
    .filter((item) => isReadyPrintDevice(item) && item.id !== undefined)
    .map((item) => ({ label: item.deviceName, value: item.id })),
);
const selectedDevice = computed(() =>
  devices.value.find((item) => item.id === deviceId.value),
);
const deviceState = computed(() =>
  getDeviceConnectionState(selectedDevice.value ?? {}),
);
const deviceStateLabel = computed(() => {
  switch (deviceState.value) {
    case 'offline': {
      return '离线';
    }
    case 'online': {
      return '在线';
    }
    default: {
      return '未连接';
    }
  }
});
const summary = computed(() => summarizeBatchResults(results.value));
const displayResults = computed(() =>
  results.value.map((result) => ({
    ...result,
    orderNo:
      result.orderNo ||
      orders.value.find((order) => order.id === result.orderId)?.no ||
      String(result.orderId),
  })),
);
const resultColumns = [
  { title: '订单号', dataIndex: 'orderNo', key: 'orderNo' },
  { title: '结果', key: 'result' },
  { title: '运单号', dataIndex: 'waybillNo', key: 'waybillNo' },
  { title: '说明', key: 'message' },
];

function openWaybillManagement() {
  push({ name: 'TradeSfLogisticsWaybills' });
}

const [Modal, modalApi] = useVbenModal({
  confirmText: '批量发货',
  async onConfirm() {
    const orderIds = orders.value
      .map((order) => order.id)
      .filter((id): id is number => id !== undefined);
    if (!isBatchSizeValid(orderIds.length)) {
      message.warning('请选择 1 至 100 个待发货快递订单');
      return;
    }
    if (!accountId.value || !deviceId.value) {
      message.warning('请选择顺丰账号和打印设备');
      return;
    }
    modalApi.lock();
    try {
      results.value = await batchCreateSfWaybills({
        accountId: accountId.value,
        deviceId: deviceId.value,
        orderIds,
      });
      emit('success');
      if (summary.value.failed === 0) {
        message.success('批量订单已进入 PrintBridge 打印队列');
      } else {
        message.warning(
          `${summary.value.failed} 个订单处理失败，请到运单管理查看`,
        );
      }
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(open) {
    if (!open) {
      orders.value = [];
      results.value = [];
      return;
    }
    const data = modalApi.getData() as { orders?: MallOrderApi.Order[] };
    orders.value = data?.orders ?? [];
    [accounts.value, devices.value] = await Promise.all([
      getSfAccounts(),
      getPrintDevices(),
    ]);
    accountId.value =
      accounts.value.find((item) => item.status === 0 && item.defaultFlag)
        ?.id ?? accounts.value.find((item) => item.status === 0)?.id;
    deviceId.value = selectReadyPrintDeviceId(devices.value);
  },
});
</script>

<template>
  <Modal title="批量顺丰打单发货" class="w-[900px]">
    <Descriptions :column="1" bordered size="small">
      <Descriptions.Item label="订单数量">
        {{ orders.length }} 单
      </Descriptions.Item>
      <Descriptions.Item label="订单范围">
        当前列表页选中的待发货快递订单
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
      v-if="deviceState === 'offline'"
      class="mb-3"
      type="warning"
      show-icon
      message="打印设备当前离线，任务仍会进入队列，待设备上线后拉取。"
    />
    <Alert
      v-else-if="deviceState === 'unconnected'"
      class="mb-3"
      type="info"
      show-icon
      message="打印设备尚未上报心跳，任务仍会进入队列。"
    />
    <div class="mb-3 flex items-center gap-2 text-sm text-gray-500">
      设备状态：<Tag :color="deviceState === 'online' ? 'green' : 'orange'">
        {{ deviceStateLabel }}
      </Tag>
    </div>

    <Result
      v-if="results.length === 0"
      status="info"
      title="确认后将为所有选中订单自动取号并加入打印队列"
      sub-title="订单会在 PrintBridge 打印成功回执后才更新为已发货。"
    />
    <template v-else>
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <Tag color="green">新任务 {{ summary.queued }}</Tag>
        <Tag color="blue">已有打印任务 {{ summary.reused }}</Tag>
        <Tag v-if="summary.failed" color="red">失败 {{ summary.failed }}</Tag>
        <Button
          v-if="summary.failed"
          type="link"
          @click="openWaybillManagement"
        >
          打开运单管理
        </Button>
      </div>
      <Table
        :columns="resultColumns"
        :data-source="displayResults"
        :pagination="false"
        row-key="orderId"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'result'">
            <Tag
              v-if="isPrintTaskQueued(record.printStatus)"
              :color="record.reused ? 'blue' : 'green'"
            >
              {{ record.reused ? '已有打印任务' : '已进入打印队列' }}
            </Tag>
            <Tag v-else color="red">{{ record.status || 'FAILED' }}</Tag>
          </template>
          <template v-else-if="column.key === 'message'">
            {{
              isPrintTaskQueued(record.printStatus)
                ? ''
                : getPrintTaskErrorMessage(record.status, record.errorMessage)
            }}
          </template>
        </template>
      </Table>
    </template>
  </Modal>
</template>
