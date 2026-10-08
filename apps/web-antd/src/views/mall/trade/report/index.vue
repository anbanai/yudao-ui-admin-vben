<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { MallTradeReportApi } from '#/api/mall/trade/report';

import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, SummaryCard } from '@vben/common-ui';
import { DICT_TYPE, TradeOrderStatusEnum } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';
import { downloadFileFromBlobPart, fenToYuan } from '@vben/utils';

import { Button, Image, message, Modal, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  exportReport,
  exportReportDetail,
  exportReportHistory,
  getReportHistory,
  getReportHistoryPage,
  getReportPage,
  saveReportHistory,
} from '#/api/mall/trade/report';
import { getRangePickerDefaultProps } from '#/utils';

const route = useRoute();
const type = computed<MallTradeReportApi.ReportType>(() =>
  route.name === 'TradeReportReconciliation' ? 'reconciliation' : 'picking',
);
const title = computed(() => (type.value === 'picking' ? '备货单' : '对账单'));
const summary = ref<MallTradeReportApi.ReportPage>();
const historyOpen = ref(false);
const historyLoading = ref(false);
const historyRows = ref<MallTradeReportApi.History[]>([]);
const historyPageNo = ref(1);
const historyPageSize = ref(10);
const historyTotal = ref(0);
const historyDetailOpen = ref(false);
const historyDetail = ref<MallTradeReportApi.ReportPage>();

function defaultStatuses(reportType: MallTradeReportApi.ReportType) {
  return reportType === 'picking'
    ? [TradeOrderStatusEnum.UNDELIVERED.status]
    : [
        TradeOrderStatusEnum.DELIVERED.status,
        TradeOrderStatusEnum.COMPLETED.status,
      ];
}

function getFormSchema(reportType: MallTradeReportApi.ReportType) {
  return [
    {
      fieldName: 'productName',
      label: '商品名称',
      component: 'Input',
      componentProps: { allowClear: true },
    },
    {
      fieldName: 'properties',
      label: '销售属性',
      component: 'Input',
      componentProps: { allowClear: true },
    },
    {
      fieldName: 'barCode',
      label: '商家编码',
      component: 'Input',
      componentProps: { allowClear: true },
    },
    {
      fieldName: 'logisticsNo',
      label: '物流单号',
      component: 'Input',
      componentProps: { allowClear: true },
    },
    {
      fieldName: 'statuses',
      label: '订单状态',
      component: 'Select',
      defaultValue: defaultStatuses(reportType),
      componentProps: {
        mode: 'multiple',
        options: getDictOptions(DICT_TYPE.TRADE_ORDER_STATUS, 'number'),
        allowClear: true,
      },
    },
    {
      fieldName: 'terminal',
      label: '订单来源',
      component: 'Select',
      componentProps: {
        options: getDictOptions(DICT_TYPE.TERMINAL, 'number'),
        allowClear: true,
      },
    },
    {
      fieldName: 'deliveryType',
      label: '配送方式',
      component: 'Select',
      componentProps: {
        options: getDictOptions(DICT_TYPE.TRADE_DELIVERY_TYPE, 'number'),
        allowClear: true,
      },
    },
    {
      fieldName: 'dateTime',
      label: reportType === 'picking' ? '付款时间' : '发货时间',
      component: 'RangePicker',
      componentProps: { ...getRangePickerDefaultProps(), allowClear: true },
    },
  ];
}

const columns = computed(() => [
  { type: 'seq', width: 55 },
  { field: 'picUrl', title: '商品', width: 90, slots: { default: 'product' } },
  { field: 'productName', title: '商品名称', minWidth: 220 },
  { field: 'properties', title: '销售属性', minWidth: 180 },
  { field: 'barCode', title: '商家编码', minWidth: 140 },
  { field: 'orderCount', title: '订单数', width: 90 },
  { field: 'quantity', title: '商品数量', width: 100 },
  {
    field: 'amount',
    title: '金额',
    width: 120,
    formatter: ({ cellValue }: { cellValue?: number }) =>
      `￥${fenToYuan(cellValue || 0)}`,
  },
]);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: getFormSchema(type.value), submitOnEnter: true },
  gridOptions: {
    columns: columns.value as VxeTableGridOptions['columns'],
    height: 'auto',
    rowConfig: { keyField: 'rowKey', isHover: true },
    toolbarConfig: { refresh: true, search: true, custom: true },
    proxyConfig: {
      ajax: {
        query: async ({ page }, values) => {
          const query = {
            ...values,
            pageNo: page.currentPage,
            pageSize: page.pageSize,
          };
          const result = await getReportPage(type.value, query);
          const list = result.list.map((row, index) => ({
            ...row,
            rowKey: `${row.spuId ?? ''}-${row.skuId ?? ''}-${index}`,
          }));
          summary.value = { ...result, list };
          return { list, total: result.total };
        },
      },
    },
  } as VxeTableGridOptions<MallTradeReportApi.Row>,
});

watch(type, async (nextType, previousType) => {
  if (nextType === previousType) return;
  await gridApi.formApi.setState({ schema: getFormSchema(nextType) });
  await gridApi.formApi.setValues({
    statuses: defaultStatuses(nextType),
    dateTime: undefined,
  });
  await gridApi.query();
});

async function currentQuery() {
  return (await gridApi.formApi.getValues()) as MallTradeReportApi.Query;
}
async function handleExport(detail = false) {
  const source = detail
    ? await exportReportDetail(type.value, await currentQuery())
    : await exportReport(type.value, await currentQuery());
  downloadFileFromBlobPart({
    fileName: `${title.value}-${detail ? '明细' : '汇总'}.xls`,
    source,
  });
}
async function handleSave() {
  await saveReportHistory(type.value, await currentQuery());
  message.success('历史快照已保存');
}
async function loadHistory(pageNo = 1, pageSize = historyPageSize.value) {
  historyOpen.value = true;
  historyLoading.value = true;
  historyPageNo.value = pageNo;
  historyPageSize.value = pageSize;
  try {
    const result = await getReportHistoryPage(type.value, { pageNo, pageSize });
    historyRows.value = result.list;
    historyTotal.value = result.total;
  } finally {
    historyLoading.value = false;
  }
}
async function handleHistory() {
  await loadHistory(1, historyPageSize.value);
}
async function handleHistoryPageChange(pageNo: number, pageSize: number) {
  await loadHistory(pageNo, pageSize);
}
async function handleHistoryDetail(row: MallTradeReportApi.History) {
  const result = await getReportHistory(type.value, row.id);
  historyDetail.value = result
    ? {
        ...result,
        list: result.list.map((item, index) => ({
          ...item,
          rowKey: `${item.spuId ?? ''}-${item.skuId ?? ''}-${index}`,
        })),
      }
    : undefined;
  historyDetailOpen.value = true;
}
async function handleHistoryExport(row: MallTradeReportApi.History) {
  const source = await exportReportHistory(type.value, row.id);
  downloadFileFromBlobPart({
    fileName: `${title.value}-历史-${row.id}.xls`,
    source,
  });
}
function handlePrint(history = false) {
  const className = 'trade-report-print-history';
  document.body.classList.toggle(className, history);
  const cleanup = () => document.body.classList.remove(className);
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
}
</script>

<template>
  <Page :title="title" auto-content-height>
    <div class="report-summary mb-2 grid grid-cols-2 gap-2 xl:grid-cols-4">
      <SummaryCard
        title="订单数量"
        icon="lucide:receipt"
        icon-color="bg-blue-100"
        icon-bg-color="text-blue-500"
        :value="summary?.orderCount || 0"
      />
      <SummaryCard
        title="商品种类"
        icon="lucide:boxes"
        icon-color="bg-green-100"
        icon-bg-color="text-green-500"
        :value="summary?.productTypeCount || 0"
      />
      <SummaryCard
        title="合计商品"
        icon="lucide:shopping-cart"
        icon-color="bg-orange-100"
        icon-bg-color="text-orange-500"
        :value="summary?.productCount || 0"
      />
      <SummaryCard
        title="合计金额"
        icon="lucide:circle-dollar-sign"
        icon-color="bg-purple-100"
        icon-bg-color="text-purple-500"
        prefix="￥"
        :decimals="2"
        :value="Number(fenToYuan(summary?.amount || 0))"
      />
    </div>
    <Grid :table-title="`${title}商品汇总`">
      <template #toolbar-tools>
        <Space wrap>
          <Button
            v-access:code="[`trade:report:${type}:save`]"
            type="primary"
            @click="handleSave"
            >
保存{{ title }}
</Button>
          <Button
            v-access:code="[`trade:report:${type}:query`]"
            @click="handleHistory"
            >
历史记录
</Button>
          <Button
            v-access:code="[`trade:report:${type}:export`]"
            @click="handleExport()"
            >
导出汇总
</Button>
          <Button
            v-if="type === 'reconciliation'"
            v-access:code="[`trade:report:${type}:export`]"
            @click="handleExport(true)"
            >
导出明细
</Button>
          <Button @click="handlePrint()">打印</Button>
        </Space>
      </template>
      <template #product="{ row }">
        <Image v-if="row.picUrl" :src="row.picUrl" :width="48" :height="48" />
        <span v-else class="text-gray-400">无图片</span>
      </template>
    </Grid>
    <Modal
      v-model:open="historyOpen"
      :title="`${title}历史记录`"
      :footer="null"
      width="760px"
    >
      <a-table
        :loading="historyLoading"
        :data-source="historyRows"
        :pagination="{
          current: historyPageNo,
          pageSize: historyPageSize,
          total: historyTotal,
          showSizeChanger: true,
          onChange: handleHistoryPageChange,
        }"
        row-key="id"
        size="small"
      >
        <a-table-column
          key="createTime"
          title="生成时间"
          data-index="createTime"
        />
        <a-table-column
          key="orderCount"
          title="订单数"
          data-index="orderCount"
        />
        <a-table-column
          key="productCount"
          title="商品数量"
          data-index="productCount"
        />
        <a-table-column key="amount" title="金额">
          <template #default="{ record }">
￥{{ fenToYuan(record.amount || 0) }}
</template>
        </a-table-column>
        <a-table-column key="action" title="操作">
          <template #default="{ record }">
<Space>
<Button
                v-access:code="[`trade:report:${type}:query`]"
                type="link"
                @click="handleHistoryDetail(record)"
                >
查看快照
</Button><Button
                v-access:code="[`trade:report:${type}:export`]"
                type="link"
                @click="handleHistoryExport(record)"
                >
导出
</Button>
</Space>
</template>
        </a-table-column>
      </a-table>
    </Modal>
    <Modal
      v-model:open="historyDetailOpen"
      :title="`${title}历史快照`"
      :footer="null"
      width="1100px"
    >
      <div class="history-print-area">
        <div class="mb-3 flex items-center justify-between">
          <div class="grid grid-cols-4 gap-2 text-sm">
            <span>订单：{{ historyDetail?.orderCount || 0 }}</span><span>种类：{{ historyDetail?.productTypeCount || 0 }}</span><span>数量：{{ historyDetail?.productCount || 0 }}</span><span>金额：￥{{ fenToYuan(historyDetail?.amount || 0) }}</span>
          </div>
          <Button @click="handlePrint(true)">打印</Button>
        </div>
        <a-table
          :data-source="historyDetail?.list || []"
          :pagination="false"
          row-key="rowKey"
          size="small"
        >
          <a-table-column
            key="productName"
            title="商品名称"
            data-index="productName"
          />
          <a-table-column
            key="properties"
            title="销售属性"
            data-index="properties"
          />
          <a-table-column key="barCode" title="商家编码" data-index="barCode" />
          <a-table-column key="quantity" title="数量" data-index="quantity" />
          <a-table-column key="amount" title="金额">
<template #default="{ record }">
￥{{ fenToYuan(record.amount || 0) }}
</template>
</a-table-column>
        </a-table>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
@media print {
  :global(body *) {
    visibility: hidden;
  }

  .report-summary,
  .report-summary * {
    visibility: visible;
  }

  :global(.vxe-grid),
  :global(.vxe-grid *) {
    visibility: visible;
  }

  .report-summary,
  :global(.vxe-grid) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }

  :global(.vxe-grid) {
    top: 150px;
  }

  .history-print-area,
  .history-print-area * {
    visibility: visible;
  }

  .history-print-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    padding: 24px;
  }

  :global(body.trade-report-print-history .report-summary),
  :global(body.trade-report-print-history .vxe-grid),
  :global(body.trade-report-print-history .report-summary *),
  :global(body.trade-report-print-history .vxe-grid *) {
    visibility: hidden !important;
  }

  :global(body.trade-report-print-history .history-print-area),
  :global(body.trade-report-print-history .history-print-area *) {
    visibility: visible !important;
  }
}
</style>
