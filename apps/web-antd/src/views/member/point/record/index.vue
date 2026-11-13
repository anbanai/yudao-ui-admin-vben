<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  MemberPointRecordApi,
  PointStatistics,
} from '#/api/member/point/record';

import { onMounted, ref } from 'vue';

import { DocAlert, Page } from '@vben/common-ui';

import { Alert, Button, Card, Statistic } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPointStatistics, getRecordPage } from '#/api/member/point/record';

import { useGridColumns, useGridFormSchema } from './data';

const statistics = ref<PointStatistics>();
const statsBusy = ref(false);
const statsError = ref(false);
async function loadStatistics() {
  statsBusy.value = true;
  statsError.value = false;
  try {
    statistics.value = await getPointStatistics();
  } catch {
    statsError.value = true;
  } finally {
    statsBusy.value = false;
  }
}
onMounted(loadStatistics);

const [Grid] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getRecordPage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<MemberPointRecordApi.Record>,
});
</script>

<template>
  <Page auto-content-height>
    <template #doc>
      <DocAlert
        title="会员等级、积分、签到"
        url="https://doc.iocoder.cn/member/level/"
      />
    </template>

    <Card title="积分累计统计" class="mb-4">
      <template #extra>
        <Button :loading="statsBusy" @click="loadStatistics"> 刷新统计 </Button>
      </template>
      <Alert v-if="statsError" type="error" message="统计加载失败，请重试" />
      <div v-if="statistics" class="grid grid-cols-4 gap-4">
        <Statistic title="总发放" :value="statistics.grantTotal" />
        <Statistic title="已消耗" :value="statistics.consumeTotal" />
        <Statistic title="可用余额" :value="statistics.availableTotal" />
        <Statistic title="已过期" :value="statistics.expiredTotal" />
      </div>
      <p class="mt-3 text-gray-500">
        当前租户累计值，不受下方列表筛选影响；退款与过期按后台流水口径计入。
      </p>
    </Card>
    <Grid table-title="积分记录列表" />
  </Page>
</template>
