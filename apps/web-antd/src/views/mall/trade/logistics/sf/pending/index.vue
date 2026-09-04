<script lang="ts" setup>
import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { fenToYuan } from '@vben/utils';

import {
  Alert,
  Button,
  message,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  batchCreateSfWaybills,
  createSfWaybill,
  getPendingLogisticsOrders,
  getPrintDevices,
  getSfAccounts,
} from '#/api/mall/trade/logistics/sf';

import {
  getPrintTaskErrorMessage,
  isPrintTaskQueued,
} from '../delivery-status';
import {
  isReadyPrintDevice,
  selectReadyPrintDeviceId,
} from '../devices/setup-state';
import { createLatestRequestGuard, removePendingOrders } from './pending-state';

const loading = ref(false);
const batchSubmitting = ref(false);
const submittingOrderIds = ref<Set<number>>(new Set());
const orders = ref<MallSfLogisticsApi.PendingOrder[]>([]);
const accounts = ref<MallSfLogisticsApi.Account[]>([]);
const devices = ref<MallSfLogisticsApi.Device[]>([]);
const selected = ref<Array<number | string>>([]);
const accountId = ref<number>();
const deviceId = ref<number>();
const loadGuard = createLatestRequestGuard();

const columns = [
  { title: '订单号', dataIndex: 'no' },
  { title: '收件人', dataIndex: 'receiverName' },
  { title: '手机号', dataIndex: 'receiverMobile' },
  { title: '商品数', dataIndex: 'productCount', width: 90 },
  { title: '实付', dataIndex: 'payPrice', width: 100 },
  { title: '下单时间', dataIndex: 'createTime', width: 180 },
  { title: '操作', key: 'actions', width: 140 },
];
const accountOptions = computed(() =>
  accounts.value
    .filter((item) => item.status === 0)
    .map((item) => ({ label: item.name, value: item.id })),
);
const deviceOptions = computed(() =>
  devices.value
    .filter(isReadyPrintDevice)
    .map((item) => ({ label: item.deviceName, value: item.id })),
);

async function load() {
  const requestId = loadGuard.begin();
  loading.value = true;
  try {
    const [nextOrders, nextAccounts, nextDevices] = await Promise.all([
      getPendingLogisticsOrders(),
      getSfAccounts(),
      getPrintDevices(),
    ]);
    if (!loadGuard.isLatest(requestId)) return;
    orders.value = nextOrders;
    accounts.value = nextAccounts;
    devices.value = nextDevices;
    const enabledAccounts = accounts.value.filter((item) => item.status === 0);
    if (!enabledAccounts.some((item) => item.id === accountId.value)) {
      accountId.value =
        enabledAccounts.find((item) => item.defaultFlag)?.id ??
        enabledAccounts[0]?.id;
    }
    deviceId.value = selectReadyPrintDeviceId(devices.value, deviceId.value);
  } finally {
    if (loadGuard.isLatest(requestId)) {
      loading.value = false;
    }
  }
}

function ensureRouting() {
  if (!accountId.value || !deviceId.value) {
    message.warning('请先选择顺丰账号和打印设备');
    return false;
  }
  return true;
}

async function createOne(orderId: number) {
  if (!ensureRouting()) return;
  if (submittingOrderIds.value.has(orderId)) return;
  submittingOrderIds.value = new Set(submittingOrderIds.value).add(orderId);
  try {
    const result = await createSfWaybill({
      orderId,
      accountId: accountId.value,
      deviceId: deviceId.value,
    });
    if (!isPrintTaskQueued(result.printStatus)) {
      message.error(
        getPrintTaskErrorMessage(result.printStatus, result.errorMessage),
      );
      return;
    }
    message.success(`运单 ${result.waybillNo} 已进入打印队列`);
    orders.value = removePendingOrders(orders.value, [result.orderId]);
    await load();
  } finally {
    const next = new Set(submittingOrderIds.value);
    next.delete(orderId);
    submittingOrderIds.value = next;
  }
}

async function createBatch() {
  if (selected.value.length === 0) return message.warning('请选择订单');
  if (!ensureRouting()) return;
  if (batchSubmitting.value) return;
  const orderIds = selected.value.map(Number);
  if (orderIds.some((orderId) => submittingOrderIds.value.has(orderId))) {
    return message.warning('选中的订单正在创建运单，请稍候');
  }
  batchSubmitting.value = true;
  submittingOrderIds.value = new Set([
    ...submittingOrderIds.value,
    ...orderIds,
  ]);
  try {
    const results = await batchCreateSfWaybills({
      orderIds,
      accountId: accountId.value,
      deviceId: deviceId.value,
    });
    const failed = results.filter(
      (item) => !isPrintTaskQueued(item.printStatus),
    );
    const queuedOrderIds = results
      .filter((item) => isPrintTaskQueued(item.printStatus))
      .map((item) => item.orderId);
    orders.value = removePendingOrders(orders.value, queuedOrderIds);
    failed.length > 0
      ? message.warning(
          `${failed.length} 个订单未生成打印任务，请到运单管理查看`,
        )
      : message.success('批量打印任务已创建');
    selected.value = [];
    await load();
  } finally {
    const next = new Set(submittingOrderIds.value);
    orderIds.forEach((orderId) => next.delete(orderId));
    submittingOrderIds.value = next;
    batchSubmitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Page auto-content-height title="待发货工作台">
    <Alert
      class="mb-4"
      type="info"
      show-icon
      message="创建任务后由 PrintBridge 自动打印；收到 success 回执后系统自动发货。"
    />
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <Select
        v-model:value="accountId"
        class="w-56"
        placeholder="顺丰账号"
        :disabled="batchSubmitting"
        :options="accountOptions"
      />
      <Select
        v-model:value="deviceId"
        class="w-56"
        placeholder="打印设备"
        :disabled="batchSubmitting"
        :options="deviceOptions"
      />
      <Button
        type="primary"
        :disabled="!selected.length"
        :loading="batchSubmitting"
        @click="createBatch"
      >
        批量打单
      </Button>
      <Button :loading="loading" @click="load">刷新</Button>
      <Tag>{{ selected.length }} 个已选</Tag>
    </div>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="orders"
      :loading="loading"
      :pagination="{ pageSize: 20 }"
      :row-selection="{
        selectedRowKeys: selected,
        onChange: (keys: Array<number | string>) => (selected = keys),
      }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'payPrice'">
          ¥{{ fenToYuan(record.payPrice) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <Space>
            <Button
              type="link"
              :loading="submittingOrderIds.has(record.id)"
              @click="createOne(record.id)"
            >
              顺丰打单
            </Button>
          </Space>
        </template>
      </template>
    </Table>
  </Page>
</template>
