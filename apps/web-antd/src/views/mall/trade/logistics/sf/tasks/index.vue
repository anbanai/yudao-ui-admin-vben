<script lang="ts" setup>
import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Table, Tag } from 'ant-design-vue';

import { getPrintTasks } from '#/api/mall/trade/logistics/sf';

const tasks = ref<MallSfLogisticsApi.PrintTask[]>([]);
const columns = [
  { title: 'Job ID', dataIndex: 'jobId' },
  { title: '订单', dataIndex: 'orderId' },
  { title: '设备', dataIndex: 'deviceId' },
  { title: '状态', key: 'status' },
  { title: '纸张', key: 'paper' },
  { title: '租约到期', dataIndex: 'leaseExpireTime' },
  { title: '错误', dataIndex: 'lastError' },
  { title: '创建时间', dataIndex: 'createTime' },
];
async function load() {
  tasks.value = await getPrintTasks();
}
function color(status: string) {
  if (status === 'SUCCESS') return 'green';
  if (status === 'FAILED') return 'red';
  if (status === 'UNKNOWN') return 'orange';
  return 'blue';
}
onMounted(load);
</script>

<template>
  <Page auto-content-height title="打印任务">
    <div class="mb-3"><Button @click="load">刷新</Button></div>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="tasks"
      :pagination="{ pageSize: 20 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="color(record.status)">
            {{ record.status }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'paper'">
          {{ record.paperWidthMm }}×{{ record.paperHeightMm }} mm /
          {{ record.dpi }} DPI
        </template>
      </template>
    </Table>
  </Page>
</template>
