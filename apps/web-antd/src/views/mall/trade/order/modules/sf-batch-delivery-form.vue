<script lang="ts" setup>
import type { MallSfLogisticsApi } from '#/api/mall/trade/logistics/sf';
import type { MallOrderApi } from '#/api/mall/trade/order';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useVbenModal } from '@vben/common-ui';

import {
  Button,
  Descriptions,
  message,
  Result,
  Table,
  Tag,
} from 'ant-design-vue';

import { batchCreateSfWaybills } from '#/api/mall/trade/logistics/sf';

import {
  getPrintTaskErrorMessage,
  isPrintTaskQueued,
} from '../../logistics/sf/delivery-status';
import { isBatchSizeValid, summarizeBatchResults } from '../batch-shipping';

const emit = defineEmits(['success']);
const { push } = useRouter();
const orders = ref<MallOrderApi.Order[]>([]);
const results = ref<MallSfLogisticsApi.Waybill[]>([]);

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
  { title: '商家', dataIndex: 'merchantName', key: 'merchantName' },
  {
    title: '月结卡',
    dataIndex: 'merchantMonthlyCardMasked',
    key: 'merchantMonthlyCardMasked',
  },
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
    modalApi.lock();
    try {
      results.value = await batchCreateSfWaybills({
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

    <Result
      v-if="results.length === 0"
      status="info"
      title="确认后将为所有选中订单自动取号并加入打印队列"
      sub-title="每个履约子单使用所属商家的寄件设置和默认打印设备，打印成功后自动确认发货。"
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
        :row-key="
          (record) => `${record.orderId}-${record.subOrderId ?? 'none'}`
        "
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
