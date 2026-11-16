<script lang="ts" setup>
import type { MallWechatLogisticsApi } from '#/api/mall/trade/logistics/wechat';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Drawer,
  message,
  Space,
  Table,
  Tag,
  Timeline,
} from 'ant-design-vue';

import {
  cancelWechatWaybill,
  confirmWechatWaybillPrint,
  getWechatLogisticsHistory,
  getWechatWaybillTrace,
  syncWechatWaybillTrace,
} from '#/api/mall/trade/logistics/wechat';

const waybills = ref<MallWechatLogisticsApi.Waybill[]>([]);
const traces = ref<MallWechatLogisticsApi.Trace[]>([]);
const traceOpen = ref(false);
const columns = [
  { title: '订单号', dataIndex: 'orderNo' },
  { title: '微信订单号', dataIndex: 'wechatOrderId' },
  { title: '运单号', dataIndex: 'waybillId' },
  { title: '状态', key: 'status' },
  { title: '打印确认', key: 'printStatus' },
  { title: '错误', dataIndex: 'errorMessage' },
  { title: '创建时间', dataIndex: 'createTime' },
  { title: '操作', key: 'actions', width: 260 },
];
async function load() {
  waybills.value = await getWechatLogisticsHistory();
}
async function confirmPrint(record: MallWechatLogisticsApi.Waybill) {
  await confirmWechatWaybillPrint(record.id!);
  message.success('历史微信运单已确认发货');
  await load();
}
async function cancel(record: MallWechatLogisticsApi.Waybill) {
  await cancelWechatWaybill(record.id!);
  message.success('历史微信运单已取消');
  await load();
}
async function showTrace(record: MallWechatLogisticsApi.Waybill, sync = false) {
  if (sync) await syncWechatWaybillTrace(record.id!);
  traces.value = await getWechatWaybillTrace(record.id!);
  traceOpen.value = true;
}
function color(status?: string) {
  if (status === 'CREATED' || status === 'CONFIRMED') return 'green';
  if (status === 'FAILED') return 'red';
  if (status === 'UNKNOWN') return 'orange';
  return 'default';
}
onMounted(load);
</script>

<template>
  <Page auto-content-height title="微信物流历史">
    <Alert
      class="mb-4"
      type="info"
      show-icon
      message="微信物流仅保留历史查询和既有待处理运单；新订单请使用顺丰直连打单。"
    />
    <div class="mb-3"><Button @click="load">刷新</Button></div>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="waybills"
      :pagination="{ pageSize: 20 }"
    >
      <template #bodyCell="{ column, record }">
        <template
          v-if="column.key === 'status' || column.key === 'printStatus'"
        >
          <Tag :color="color(record[column.key])">
            {{ record[column.key] }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <Space wrap>
            <Button type="link" @click="showTrace(record)">轨迹</Button>
            <Button
              v-if="record.status === 'CREATED'"
              type="link"
              @click="showTrace(record, true)"
            >
              同步
            </Button>
            <Button
              v-if="
                record.status === 'CREATED' && record.printStatus === 'PENDING'
              "
              type="link"
              @click="confirmPrint(record)"
            >
              确认旧面单已打印
            </Button>
            <Button
              v-if="
                record.status === 'CREATED' && record.printStatus === 'PENDING'
              "
              type="link"
              danger
              @click="cancel(record)"
            >
              取消
            </Button>
          </Space>
        </template>
      </template>
    </Table>
    <Drawer v-model:open="traceOpen" title="微信物流轨迹" width="520">
      <Timeline
        :items="
          traces.map((item) => ({
            label: item.actionTime,
            children: item.actionMsg,
          }))
        "
      />
    </Drawer>
  </Page>
</template>
