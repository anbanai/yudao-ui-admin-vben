<script lang="ts" setup>
import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Drawer,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Timeline,
} from 'ant-design-vue';

import {
  cancelSfWaybill,
  getSfWaybills,
  getSfWaybillTrace,
  reprintSfWaybill,
  syncSfWaybillTrace,
} from '#/api/mall/trade/logistics/sf';

import { getTradeOrderDetailRoute } from '../../order-navigation';

const waybills = ref<MallSfLogisticsApi.Waybill[]>([]);
const traces = ref<MallSfLogisticsApi.Trace[]>([]);
const traceOpen = ref(false);
const { push } = useRouter();
const columns = [
  { title: '订单号', dataIndex: 'orderNo' },
  { title: '顺丰运单号', dataIndex: 'waybillNo' },
  { title: '运单状态', key: 'status' },
  { title: '打印状态', key: 'printStatus' },
  { title: '发货状态', key: 'deliveryStatus' },
  { title: '设备', dataIndex: 'deviceId' },
  { title: '错误', dataIndex: 'errorMessage' },
  { title: '操作', key: 'actions', width: 220 },
];
async function load() {
  waybills.value = await getSfWaybills();
}
function color(status?: string) {
  if (status === 'SUCCESS' || status === 'CREATED' || status === 'DELIVERED') {
    return 'green';
  }
  if (status === 'FAILED' || status === 'CONFLICT') return 'red';
  if (status === 'UNKNOWN') return 'orange';
  return 'blue';
}
function statusValue(record: Record<string, any>, key?: number | string) {
  return key === undefined ? undefined : String(record[key] ?? '');
}
function asWaybill(record: Record<string, any>) {
  return record as MallSfLogisticsApi.Waybill;
}
function openOrderDetail(orderId: number) {
  push(getTradeOrderDetailRoute(orderId));
}
async function cancel(record: MallSfLogisticsApi.Waybill) {
  await cancelSfWaybill(record.id);
  message.success('运单已取消');
  await load();
}
async function reprint(record: MallSfLogisticsApi.Waybill) {
  await reprintSfWaybill(record.id, record.deviceId);
  message.success('已生成新的人工重打任务');
  await load();
}
async function showTrace(record: MallSfLogisticsApi.Waybill, sync = false) {
  traces.value = sync
    ? await syncSfWaybillTrace(record.id)
    : await getSfWaybillTrace(record.id);
  traceOpen.value = true;
}
onMounted(load);
</script>

<template>
  <Page auto-content-height title="运单管理">
    <div class="mb-3"><Button @click="load">刷新</Button></div>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="waybills"
      :pagination="{ pageSize: 20 }"
    >
      <template #bodyCell="{ column, record }">
        <template
          v-if="
            ['status', 'printStatus', 'deliveryStatus'].includes(
              String(column.key),
            )
          "
        >
          <Tag :color="color(statusValue(record, column.key))">
            {{ statusValue(record, column.key) || '-' }}
          </Tag>
        </template>
        <template v-else-if="column.dataIndex === 'orderNo'">
          <Button
            type="link"
            class="p-0"
            @click="openOrderDetail(record.orderId)"
          >
            {{ record.orderNo }}
          </Button>
        </template>
        <template v-else-if="column.key === 'actions'">
          <Space wrap>
            <Button type="link" @click="showTrace(asWaybill(record))">
              轨迹
            </Button>
            <Button type="link" @click="showTrace(asWaybill(record), true)">
              同步
            </Button>
            <Popconfirm
              v-if="['FAILED', 'UNKNOWN'].includes(record.printStatus)"
              title="确认生成新的打印任务？原任务不会再次自动打印。"
              @confirm="reprint(asWaybill(record))"
            >
              <Button type="link">人工重打</Button>
            </Popconfirm>
            <Popconfirm
              v-if="
                record.status === 'CREATED' && record.printStatus === 'PENDING'
              "
              title="确认取消该顺丰运单？取消后不会继续打印。"
              @confirm="cancel(asWaybill(record))"
            >
              <Button type="link" danger>取消</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>
    <Drawer v-model:open="traceOpen" title="顺丰物流轨迹" width="520">
      <Timeline
        :items="
          traces.map((item) => ({
            label: item.operateTime,
            children: `${item.content}${item.location ? ` · ${item.location}` : ''}`,
          }))
        "
      />
    </Drawer>
  </Page>
</template>
