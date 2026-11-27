<script lang="ts" setup>
import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Table } from 'ant-design-vue';

import { getPrintDevices } from '#/api/mall/trade/logistics/sf';

const loading = ref(false);
const devices = ref<MallSfLogisticsApi.Device[]>([]);
const columns = [
  { title: '商家编号', key: 'merchant' },
  { title: '设备', dataIndex: 'deviceName' },
  { title: '打印机', dataIndex: 'printerName' },
  { title: '状态', key: 'status' },
  { title: '最近连接', dataIndex: 'lastPollTime' },
];
async function load() {
  loading.value = true;
  try {
    devices.value = await getPrintDevices();
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>

<template>
  <Page title="打印设备" auto-content-height>
    <Button class="mb-4" :loading="loading" @click="load">刷新</Button>
    <Table
      row-key="id"
      :data-source="devices"
      :columns="columns"
      :loading="loading"
      :scroll="{ x: 680 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'merchant'">
          {{ record.merchantId ?? '历史设备' }}
        </template>
        <template v-if="column.key === 'status'">
          {{
            record.status === 0 ? (record.pending ? '待连接' : '启用') : '停用'
          }}
        </template>
      </template>
    </Table>
  </Page>
</template>
