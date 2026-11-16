<script lang="ts" setup>
import type { ManualAction } from './fund-operations';

import type { PayFundApi } from '#/api/pay/fund';

import { computed, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  getFundOrder,
  getFundOrderPage,
  getFundRefund,
  getReconciliation,
  getReconciliationDifferencePage,
  getReconciliationPage,
  resolveReconciliationDifference,
  retryFundDivide,
  retryFundRefund,
  retryReconciliation,
} from '#/api/pay/fund';

import {
  auditLimits,
  buildManualCommand,
  formatFen,
  mayRetryDivide,
  mayRetryRefund,
  parsePositiveId,
  reconciliationStatusLabels,
  statusColor,
  statusLabel,
  validateReconciliationDate,
} from './fund-operations';

const { hasAccessByCodes } = useAccess();
const canQuery = computed(() => hasAccessByCodes(['pay:fund:query']));
const canDivideRetry = computed(() =>
  hasAccessByCodes(['pay:fund:divide:retry']),
);
const canRefundRetry = computed(() =>
  hasAccessByCodes(['pay:fund:refund:retry']),
);
const canReconcile = computed(() => hasAccessByCodes(['pay:fund:update']));
const activeTab = ref('orders');

const orderLoading = ref(false);
const orders = ref<PayFundApi.Order[]>([]);
const orderTotal = ref(0);
const orderPage = ref(1);
const orderPageSize = ref(10);
const payOrderId = ref<number>();
const orderOpen = ref(false);
const orderDetailLoading = ref(false);
const orderDetail = ref<PayFundApi.Order>();
let orderRequest = 0;
let orderDetailRequest = 0;

const refundId = ref<number>();
const refundLoading = ref(false);
const refund = ref<PayFundApi.Refund>();
const refundQueried = ref(false);
let refundRequest = 0;

const reconciliationLoading = ref(false);
const reconciliations = ref<PayFundApi.Reconciliation[]>([]);
const reconciliationTotal = ref(0);
const reconciliationPage = ref(1);
const reconciliationPageSize = ref(10);
const filterDate = ref('');
const filterStatus = ref<number>();
const reconciliationOpen = ref(false);
const reconciliationDetailLoading = ref(false);
const reconciliationDetail = ref<PayFundApi.Reconciliation>();
const differenceLoading = ref(false);
const differences = ref<PayFundApi.Difference[]>([]);
const differenceTotal = ref(0);
const differencePage = ref(1);
const differencePageSize = ref(10);
const differenceStatus = ref<number>();
let reconciliationRequest = 0;
let reconciliationDetailRequest = 0;
let differenceRequest = 0;

const manualAction = ref<ManualAction>();
const manualOpen = ref(false);
const saving = ref(false);
const reason = ref('');
const externalEvidence = ref('');
const retryPayOrderId = ref<number>();
const sourceReconciliationId = ref<number>();
const retryChannelId = ref<number>();
const retryDate = ref('');
const retryParentMerchantNo = ref('');
const limits = computed(() =>
  auditLimits(manualAction.value?.kind ?? 'resolve'),
);
const manualTitles = {
  divide: '重试清算 / 分账处理',
  refund: '重试退款 / 分账归还',
  resolve: '处理对账差异',
  reconcile: '重新执行日账单对账',
};
const manualTitle = computed(() =>
  manualAction.value ? manualTitles[manualAction.value.kind] : '人工操作',
);
const statusOptions = Object.entries(reconciliationStatusLabels).map(
  ([value, label]) => ({ value: Number(value), label }),
);
const differenceStatusOptions = [
  { value: 0, label: '待处理' },
  { value: 10, label: '已处理' },
];

const orderColumns = [
  { title: '资金订单', dataIndex: 'id', width: 110 },
  { title: '支付订单', dataIndex: 'payOrderId', width: 120 },
  { title: '交易订单', dataIndex: 'tradeOrderId', width: 120 },
  { title: '金额（元）', key: 'amount', width: 110 },
  { title: '已退款（元）', key: 'refundPrice', width: 120 },
  { title: '清算状态', key: 'clearingStatus', width: 130 },
  { title: '分账状态', key: 'divideStatus', width: 130 },
  { title: '下次重试', dataIndex: 'nextRetryTime', width: 180 },
  { title: '操作', key: 'action', width: 190 },
];
const orderDetailColumns = [
  { title: '明细', dataIndex: 'id', width: 90 },
  { title: '商户', dataIndex: 'merchantId', width: 90 },
  { title: '交易子单', dataIndex: 'tradeOrderSubId', width: 110 },
  { title: '金额（元）', key: 'amount', width: 110 },
  { title: '分账（元）', key: 'divideAmount', width: 110 },
  { title: '已退款（元）', key: 'refundedAmount', width: 120 },
  { title: '已归还（元）', key: 'returnedAmount', width: 120 },
  { title: '状态', key: 'status', width: 130 },
  { title: '渠道明细号', dataIndex: 'channelDetailNo', width: 180 },
];
const refundColumns = [
  { title: '退款明细', dataIndex: 'id', width: 110 },
  { title: '资金明细', dataIndex: 'fundDetailId', width: 110 },
  { title: '售后单', dataIndex: 'afterSaleId', width: 110 },
  { title: '商户', dataIndex: 'merchantId', width: 110 },
  { title: '金额（元）', key: 'amount', width: 110 },
  { title: '分账归还状态', key: 'divideBackStatus', width: 150 },
  { title: '退款状态', key: 'refundStatus', width: 130 },
  { title: '下次重试', dataIndex: 'nextRetryTime', width: 180 },
];
const reconciliationColumns = [
  { title: '记录', dataIndex: 'id', width: 90 },
  { title: '账单日期', dataIndex: 'reconciliationDate', width: 120 },
  { title: '渠道', dataIndex: 'channelId', width: 90 },
  { title: '原平台商编', dataIndex: 'merchantNo', width: 160 },
  { title: '账单笔数', dataIndex: 'totalCount', width: 100 },
  { title: '账单金额（元）', key: 'totalAmount', width: 130 },
  { title: '差异金额（元）', key: 'differenceAmount', width: 130 },
  { title: '状态', key: 'status', width: 140 },
  { title: '完成时间', dataIndex: 'completedTime', width: 180 },
  { title: '操作', key: 'action', width: 180 },
];
const differenceColumns = [
  { title: '差异', dataIndex: 'id', width: 90 },
  { title: '业务', dataIndex: 'bizType', width: 180 },
  { title: '请求号', dataIndex: 'requestNo', width: 200 },
  { title: '订单号', dataIndex: 'orderNo', width: 180 },
  { title: '本地金额（元）', key: 'localAmount', width: 130 },
  { title: '渠道金额（元）', key: 'channelAmount', width: 130 },
  { title: '差异金额（元）', key: 'differenceAmount', width: 130 },
  { title: '状态', key: 'status', width: 110 },
  { title: '操作', key: 'action', width: 100 },
];

async function loadOrders() {
  if (!canQuery.value) return;
  const request = ++orderRequest;
  orderLoading.value = true;
  try {
    const result = await getFundOrderPage({
      pageNo: orderPage.value,
      pageSize: orderPageSize.value,
    });
    if (request !== orderRequest) return;
    orders.value = result.list;
    orderTotal.value = result.total;
  } catch {
    if (request === orderRequest)
      message.error('资金订单查询失败，请稍后重试。');
  } finally {
    if (request === orderRequest) orderLoading.value = false;
  }
}

async function openOrder(id: number | undefined) {
  if (!canQuery.value) return;
  let validId: number;
  try {
    validId = parsePositiveId(id);
  } catch {
    message.warning('请填写有效的支付订单编号。');
    return;
  }
  const request = ++orderDetailRequest;
  orderDetail.value = undefined;
  orderDetailLoading.value = true;
  orderOpen.value = true;
  try {
    const result = await getFundOrder(validId);
    if (request !== orderDetailRequest) return;
    orderDetail.value = result ?? undefined;
    if (!result) message.info('该支付订单没有资金记录。');
  } catch {
    if (request === orderDetailRequest)
      message.error('资金详情查询失败，请稍后重试。');
  } finally {
    if (request === orderDetailRequest) orderDetailLoading.value = false;
  }
}

function closeOrder() {
  ++orderDetailRequest;
  orderOpen.value = false;
  orderDetail.value = undefined;
}

async function loadRefund(id = refundId.value) {
  if (!canQuery.value) return;
  let validId: number;
  try {
    validId = parsePositiveId(id);
  } catch {
    message.warning('请填写有效的退款编号。');
    return;
  }
  const request = ++refundRequest;
  refundLoading.value = true;
  refund.value = undefined;
  refundQueried.value = true;
  try {
    const result = await getFundRefund(validId);
    if (request !== refundRequest) return;
    refund.value = result ?? undefined;
    if (!result) message.info('该退款单不存在。');
  } catch {
    if (request === refundRequest)
      message.error('退款资金查询失败，请稍后重试。');
  } finally {
    if (request === refundRequest) refundLoading.value = false;
  }
}

async function loadReconciliations() {
  if (!canQuery.value) return;
  let date: string | undefined;
  try {
    date = filterDate.value
      ? validateReconciliationDate(filterDate.value)
      : undefined;
  } catch {
    message.warning('请选择有效的账单日期。');
    return;
  }
  const request = ++reconciliationRequest;
  reconciliationLoading.value = true;
  try {
    const result = await getReconciliationPage({
      pageNo: reconciliationPage.value,
      pageSize: reconciliationPageSize.value,
      status: filterStatus.value,
      date,
    });
    if (request !== reconciliationRequest) return;
    reconciliations.value = result.list;
    reconciliationTotal.value = result.total;
  } catch {
    if (request === reconciliationRequest)
      message.error('对账记录查询失败，请稍后重试。');
  } finally {
    if (request === reconciliationRequest) reconciliationLoading.value = false;
  }
}

async function loadDifferences() {
  if (!canQuery.value || !reconciliationDetail.value) return;
  const request = ++differenceRequest;
  const recordId = reconciliationDetail.value.id;
  differenceLoading.value = true;
  try {
    const result = await getReconciliationDifferencePage({
      recordId,
      pageNo: differencePage.value,
      pageSize: differencePageSize.value,
      status: differenceStatus.value,
    });
    if (
      request !== differenceRequest ||
      recordId !== reconciliationDetail.value?.id
    )
      return;
    differences.value = result.list;
    differenceTotal.value = result.total;
  } catch {
    if (request === differenceRequest)
      message.error('对账差异查询失败，请稍后重试。');
  } finally {
    if (request === differenceRequest) differenceLoading.value = false;
  }
}

async function openReconciliation(id: number, reset = true) {
  if (!canQuery.value) return;
  const request = ++reconciliationDetailRequest;
  ++differenceRequest;
  reconciliationDetailLoading.value = true;
  reconciliationOpen.value = true;
  reconciliationDetail.value = undefined;
  differences.value = [];
  differenceTotal.value = 0;
  if (reset) {
    differencePage.value = 1;
    differenceStatus.value = undefined;
  }
  try {
    const result = await getReconciliation(id);
    if (request !== reconciliationDetailRequest) return;
    reconciliationDetail.value = result ?? undefined;
    if (result) await loadDifferences();
    else message.info('对账记录不存在。');
  } catch {
    if (request === reconciliationDetailRequest)
      message.error('对账详情查询失败，请稍后重试。');
  } finally {
    if (request === reconciliationDetailRequest)
      reconciliationDetailLoading.value = false;
  }
}

function closeReconciliation() {
  ++reconciliationDetailRequest;
  ++differenceRequest;
  reconciliationOpen.value = false;
  reconciliationDetail.value = undefined;
  differences.value = [];
}

function openManual(action: ManualAction) {
  if (saving.value) return;
  manualAction.value = action;
  reason.value = '';
  externalEvidence.value = '';
  manualOpen.value = true;
}

function openDivideRetry(id: number) {
  const order =
    orderDetail.value?.id === id
      ? orderDetail.value
      : orders.value.find((row) => row.id === id);
  if (!canDivideRetry.value || !order || !mayRetryDivide(order)) return;
  retryPayOrderId.value = order.payOrderId;
  openManual({ kind: 'divide', targetId: order.id });
}

function openRefundRetry() {
  if (
    !canRefundRetry.value ||
    !refund.value ||
    !mayRetryRefund(refund.value.details)
  )
    return;
  openManual({ kind: 'refund', targetId: refund.value.refundId });
}

function openResolve(id: number) {
  if (
    !canReconcile.value ||
    !differences.value.some((row) => row.id === id && row.status === 0)
  )
    return;
  openManual({ kind: 'resolve', id });
}

function openReconciliationRetry(id?: number) {
  if (!canReconcile.value) return;
  const record =
    reconciliationDetail.value?.id === id
      ? reconciliationDetail.value
      : reconciliations.value.find((row) => row.id === id);
  if (id !== undefined && (!record || ![20, 30].includes(record.status ?? -1)))
    return;
  sourceReconciliationId.value = record?.id;
  retryChannelId.value = record?.channelId;
  retryDate.value = record?.reconciliationDate ?? '';
  retryParentMerchantNo.value = record?.merchantNo ?? '';
  openManual({ kind: 'reconcile' });
}

function closeManual() {
  if (saving.value) return;
  manualOpen.value = false;
  manualAction.value = undefined;
  reason.value = '';
  externalEvidence.value = '';
}

async function submitManual() {
  const action = manualAction.value;
  if (!action || saving.value) return;
  if (
    (action.kind === 'divide' && !canDivideRetry.value) ||
    (action.kind === 'refund' && !canRefundRetry.value) ||
    ((action.kind === 'resolve' || action.kind === 'reconcile') &&
      !canReconcile.value)
  )
    return;
  let command;
  try {
    command = buildManualCommand(
      action.kind === 'reconcile'
        ? {
            ...action,
            channelId: retryChannelId.value,
            date: retryDate.value,
            parentMerchantNo: retryParentMerchantNo.value,
          }
        : action,
      reason.value,
      externalEvidence.value,
    );
  } catch (error) {
    message.warning(
      error instanceof Error ? error.message : '请检查人工操作参数。',
    );
    return;
  }
  saving.value = true;
  try {
    let recordId: number | undefined;
    switch (command.kind) {
      case 'divide': {
        const current = await getFundOrder(retryPayOrderId.value!);
        if (
          !current ||
          current.id !== command.data.targetId ||
          !mayRetryDivide(current)
        )
          throw new Error('state');
        await retryFundDivide(command.data);
        break;
      }
      case 'reconcile': {
        recordId = await retryReconciliation(command.data);
        break;
      }
      case 'refund': {
        const current = await getFundRefund(command.data.targetId);
        if (!current || !mayRetryRefund(current.details))
          throw new Error('state');
        await retryFundRefund(command.data);
        break;
      }
      case 'resolve': {
        await resolveReconciliationDifference(command.data);
        break;
      }
    }
    manualOpen.value = false;
    manualAction.value = undefined;
    reason.value = '';
    externalEvidence.value = '';
    message.success(
      command.kind === 'resolve'
        ? '差异已登记处理结果。'
        : '操作已提交，请刷新查看处理结果。',
    );
    if (command.kind === 'divide') {
      await loadOrders();
      if (orderOpen.value) await openOrder(retryPayOrderId.value);
    } else if (command.kind === 'refund')
      await loadRefund(command.data.targetId);
    else {
      await loadReconciliations();
      const id = recordId ?? reconciliationDetail.value?.id;
      if (id !== undefined) await openReconciliation(id, false);
    }
  } catch {
    message.error(
      '操作未完成，请刷新确认当前状态，核对原因、凭证及渠道配置后重试。',
    );
  } finally {
    saving.value = false;
  }
}

function changeOrderPage(page: number, size: number) {
  orderPage.value = page;
  orderPageSize.value = size;
  void loadOrders();
}
function searchReconciliation() {
  reconciliationPage.value = 1;
  void loadReconciliations();
}
function changeReconciliationPage(page: number, size: number) {
  reconciliationPage.value = page;
  reconciliationPageSize.value = size;
  void loadReconciliations();
}
function changeDifferencePage(page: number, size: number) {
  differencePage.value = page;
  differencePageSize.value = size;
  void loadDifferences();
}
function searchDifferences() {
  differencePage.value = 1;
  void loadDifferences();
}
function changeTab(key: number | string) {
  if (key === 'reconciliation') void loadReconciliations();
}

onMounted(loadOrders);
</script>

<template>
  <Page
    title="资金运营"
    description="查询清算、分账与退款状态，复核日账单差异。"
  >
    <Alert
      v-if="!canQuery"
      type="warning"
      message="当前账号没有资金查询权限。"
    />
    <Card v-else>
      <Tabs v-model:active-key="activeTab" @change="changeTab">
        <Tabs.TabPane key="orders" tab="资金订单">
          <Form layout="inline" class="mb-5" @finish="openOrder(payOrderId)">
            <FormItem label="支付订单编号">
              <InputNumber
                v-model:value="payOrderId"
                :min="1"
                :precision="0"
                placeholder="支付订单编号"
                class="w-48"
              />
            </FormItem>
            <Space wrap>
              <Button
                type="primary"
                html-type="submit"
                :loading="orderDetailLoading"
              >
                查询详情
              </Button>
              <Button :loading="orderLoading" @click="loadOrders">
                刷新列表
              </Button>
            </Space>
          </Form>
          <Table
            :columns="orderColumns"
            :data-source="orders"
            :loading="orderLoading"
            row-key="id"
            :scroll="{ x: 1300 }"
            :pagination="{
              current: orderPage,
              pageSize: orderPageSize,
              total: orderTotal,
              showSizeChanger: true,
              onChange: changeOrderPage,
            }"
          >
            <template #bodyCell="{ column, record }">
              <template
                v-if="column.key === 'amount' || column.key === 'refundPrice'"
              >
                {{ formatFen(record[column.key]) }}
              </template>
              <Tag
                v-else-if="
                  column.key === 'clearingStatus' ||
                  column.key === 'divideStatus'
                "
                :color="statusColor(record[column.key])"
              >
                {{ statusLabel(record[column.key]) }}
              </Tag>
              <Space v-else-if="column.key === 'action'">
                <Button type="link" @click="openOrder(record.payOrderId)">
                  详情
                </Button>
                <Button
                  v-if="canDivideRetry && mayRetryDivide(record)"
                  type="link"
                  :disabled="saving"
                  @click="openDivideRetry(record.id)"
                >
                  重试处理
                </Button>
              </Space>
            </template>
          </Table>
        </Tabs.TabPane>
        <Tabs.TabPane key="refund" tab="退款资金">
          <Form layout="inline" class="mb-5" @finish="loadRefund()">
            <FormItem label="退款编号">
              <InputNumber
                v-model:value="refundId"
                :min="1"
                :precision="0"
                placeholder="支付退款编号"
                class="w-48"
              />
            </FormItem>
            <Button type="primary" html-type="submit" :loading="refundLoading">
              查询
            </Button>
          </Form>
          <template v-if="refund">
            <Space class="mb-4" wrap>
              <span>退款编号：{{ refund.refundId }}</span>
              <Button
                :loading="refundLoading"
                @click="loadRefund(refund.refundId)"
              >
                刷新状态
              </Button>
              <Button
                v-if="canRefundRetry && mayRetryRefund(refund.details)"
                :disabled="saving"
                @click="openRefundRetry"
              >
                重试退款 / 归还
              </Button>
            </Space>
            <Alert
              v-if="refund.details?.some((row) => row.lastError)"
              class="mb-4"
              type="warning"
              message="退款或分账归还未完成，请核对渠道处理结果与原请求凭证。"
            />
            <Table
              :columns="refundColumns"
              :data-source="refund.details ?? []"
              :loading="refundLoading"
              row-key="id"
              :scroll="{ x: 1100 }"
              :pagination="false"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'amount'">
                  {{ formatFen(record.amount) }}
                </template>
                <Tag
                  v-else-if="
                    column.key === 'refundStatus' ||
                    column.key === 'divideBackStatus'
                  "
                  :color="statusColor(record[column.key])"
                >
                  {{ statusLabel(record[column.key]) }}
                </Tag>
              </template>
            </Table>
          </template>
          <Spin v-else :spinning="refundLoading">
            <Empty
              :description="
                refundQueried ? '暂无退款资金明细' : '填写退款编号查询资金状态'
              "
            />
          </Spin>
        </Tabs.TabPane>
        <Tabs.TabPane key="reconciliation" tab="日账单对账">
          <Form layout="inline" class="mb-5" @finish="searchReconciliation">
            <FormItem label="账单日期">
              <Input v-model:value="filterDate" type="date" />
            </FormItem>
            <FormItem label="状态">
              <Select
                v-model:value="filterStatus"
                :options="statusOptions"
                allow-clear
                placeholder="全部状态"
                class="w-40"
              />
            </FormItem>
            <Space wrap>
              <Button
                type="primary"
                html-type="submit"
                :loading="reconciliationLoading"
              >
                查询
              </Button>
              <Button
                :loading="reconciliationLoading"
                @click="loadReconciliations"
              >
                刷新
              </Button>
              <Button
                v-if="canReconcile"
                :disabled="saving"
                @click="openReconciliationRetry()"
              >
                执行日账单对账
              </Button>
            </Space>
          </Form>
          <Table
            :columns="reconciliationColumns"
            :data-source="reconciliations"
            :loading="reconciliationLoading"
            row-key="id"
            :scroll="{ x: 1450 }"
            :pagination="{
              current: reconciliationPage,
              pageSize: reconciliationPageSize,
              total: reconciliationTotal,
              showSizeChanger: true,
              onChange: changeReconciliationPage,
            }"
          >
            <template #bodyCell="{ column, record }">
              <template
                v-if="
                  column.key === 'totalAmount' ||
                  column.key === 'differenceAmount'
                "
              >
                {{ formatFen(record[column.key]) }}
              </template>
              <Tag
                v-else-if="column.key === 'status'"
                :color="statusColor(record.status)"
              >
                {{ statusLabel(record.status, true) }}
              </Tag>
              <Space v-else-if="column.key === 'action'">
                <Button type="link" @click="openReconciliation(record.id)">
                  详情 / 差异
                </Button>
                <Button
                  v-if="canReconcile && [20, 30].includes(record.status)"
                  type="link"
                  :disabled="saving"
                  @click="openReconciliationRetry(record.id)"
                >
                  重试
                </Button>
              </Space>
            </template>
          </Table>
        </Tabs.TabPane>
      </Tabs>
    </Card>

    <Drawer
      :open="orderOpen"
      title="资金订单详情"
      :width="960"
      destroy-on-close
      @close="closeOrder"
    >
      <Spin :spinning="orderDetailLoading">
        <template v-if="orderDetail">
          <Descriptions bordered :column="2" size="small">
            <DescriptionsItem label="资金订单">
              {{ orderDetail.id }}
            </DescriptionsItem>
            <DescriptionsItem label="支付订单">
              {{ orderDetail.payOrderId }}
            </DescriptionsItem>
            <DescriptionsItem label="交易订单">
              {{ orderDetail.tradeOrderId ?? '—' }}
            </DescriptionsItem>
            <DescriptionsItem label="订单金额（元）">
              {{ formatFen(orderDetail.amount) }}
            </DescriptionsItem>
            <DescriptionsItem label="清算状态">
              {{ statusLabel(orderDetail.clearingStatus) }}
            </DescriptionsItem>
            <DescriptionsItem label="分账状态">
              {{ statusLabel(orderDetail.divideStatus) }}
            </DescriptionsItem>
            <DescriptionsItem label="已退款（元）">
              {{ formatFen(orderDetail.refundPrice) }}
            </DescriptionsItem>
            <DescriptionsItem label="下次重试">
              {{ orderDetail.nextRetryTime ?? '—' }}
            </DescriptionsItem>
          </Descriptions>
          <Space class="my-4" wrap>
            <Button @click="openOrder(orderDetail.payOrderId)">刷新状态</Button>
            <Button
              v-if="canDivideRetry && mayRetryDivide(orderDetail)"
              :disabled="saving"
              @click="openDivideRetry(orderDetail.id)"
            >
              重试清算 / 分账处理
            </Button>
          </Space>
          <Alert
            v-if="orderDetail.lastError"
            class="mb-4"
            type="warning"
            message="资金处理未完成，请核对渠道状态与原请求凭证。"
          />
          <Table
            :columns="orderDetailColumns"
            :data-source="orderDetail.details ?? []"
            row-key="id"
            :scroll="{ x: 1200 }"
            :pagination="false"
          >
            <template #bodyCell="{ column, record }">
              <Tag
                v-if="column.key === 'status'"
                :color="statusColor(record.status)"
              >
                {{ statusLabel(record.status) }}
              </Tag>
              <template
                v-else-if="
                  [
                    'amount',
                    'divideAmount',
                    'refundedAmount',
                    'returnedAmount',
                  ].includes(String(column.key))
                "
              >
                {{ formatFen(record[String(column.key)]) }}
              </template>
            </template>
          </Table>
        </template>
        <Empty v-else description="暂无资金详情" />
      </Spin>
    </Drawer>

    <Drawer
      :open="reconciliationOpen"
      title="日账单与差异"
      :width="1100"
      destroy-on-close
      @close="closeReconciliation"
    >
      <Spin :spinning="reconciliationDetailLoading">
        <template v-if="reconciliationDetail">
          <Descriptions bordered :column="2" size="small">
            <DescriptionsItem label="记录">
              {{ reconciliationDetail.id }}
            </DescriptionsItem>
            <DescriptionsItem label="账单日期">
              {{ reconciliationDetail.reconciliationDate }}
            </DescriptionsItem>
            <DescriptionsItem label="渠道">
              {{ reconciliationDetail.channelId }} /
              {{ reconciliationDetail.channelCode }}
            </DescriptionsItem>
            <DescriptionsItem label="原平台商编">
              {{ reconciliationDetail.merchantNo }}
            </DescriptionsItem>
            <DescriptionsItem label="批次号" :span="2">
              {{ reconciliationDetail.batchNo }}
            </DescriptionsItem>
            <DescriptionsItem label="状态">
              {{ statusLabel(reconciliationDetail.status, true) }}
            </DescriptionsItem>
            <DescriptionsItem label="账单笔数">
              {{ reconciliationDetail.totalCount ?? '—' }}
            </DescriptionsItem>
            <DescriptionsItem label="账单金额（元）">
              {{ formatFen(reconciliationDetail.totalAmount) }}
            </DescriptionsItem>
            <DescriptionsItem label="匹配笔数">
              {{ reconciliationDetail.matchedCount ?? '—' }}
            </DescriptionsItem>
            <DescriptionsItem label="匹配金额（元）">
              {{ formatFen(reconciliationDetail.matchedAmount) }}
            </DescriptionsItem>
            <DescriptionsItem label="差异金额（元）">
              {{ formatFen(reconciliationDetail.differenceAmount) }}
            </DescriptionsItem>
            <DescriptionsItem label="开始时间">
              {{ reconciliationDetail.startedTime ?? '—' }}
            </DescriptionsItem>
            <DescriptionsItem label="完成时间">
              {{ reconciliationDetail.completedTime ?? '—' }}
            </DescriptionsItem>
          </Descriptions>
          <Space class="my-4" wrap>
            <Button @click="openReconciliation(reconciliationDetail.id, false)">
              刷新记录
            </Button>
            <Button
              v-if="
                canReconcile &&
                [20, 30].includes(reconciliationDetail.status ?? -1)
              "
              :disabled="saving"
              @click="openReconciliationRetry(reconciliationDetail.id)"
            >
              重试原账单
            </Button>
          </Space>
          <Alert
            v-if="reconciliationDetail.errorMsg"
            class="mb-4"
            type="warning"
            :message="reconciliationDetail.errorMsg"
          />
          <Form layout="inline" class="mb-4" @finish="searchDifferences">
            <FormItem label="差异状态">
              <Select
                v-model:value="differenceStatus"
                :options="differenceStatusOptions"
                allow-clear
                placeholder="全部状态"
                class="w-36"
              />
            </FormItem>
            <Button html-type="submit" :loading="differenceLoading">
              查询差异
            </Button>
          </Form>
          <Table
            :columns="differenceColumns"
            :data-source="differences"
            :loading="differenceLoading"
            row-key="id"
            :scroll="{ x: 1450 }"
            :pagination="{
              current: differencePage,
              pageSize: differencePageSize,
              total: differenceTotal,
              showSizeChanger: true,
              onChange: changeDifferencePage,
            }"
          >
            <template #bodyCell="{ column, record }">
              <template
                v-if="
                  ['localAmount', 'channelAmount', 'differenceAmount'].includes(
                    String(column.key),
                  )
                "
              >
                {{ formatFen(record[String(column.key)]) }}
              </template>
              <Tag
                v-else-if="column.key === 'status'"
                :color="record.status === 10 ? 'green' : 'orange'"
              >
                {{
                  record.status === 0
                    ? '待处理'
                    : record.status === 10
                      ? '已处理'
                      : '未知状态'
                }}
              </Tag>
              <Button
                v-else-if="
                  column.key === 'action' && canReconcile && record.status === 0
                "
                type="link"
                :disabled="saving"
                @click="openResolve(record.id)"
              >
                处理
              </Button>
            </template>
            <template #expandedRowRender="{ record }">
              <Descriptions :column="2" size="small" bordered>
                <DescriptionsItem label="差异原因" :span="2">
                  {{ record.reason ?? '—' }}
                </DescriptionsItem>
                <DescriptionsItem label="商编">
                  {{ record.merchantNo ?? '—' }}
                </DescriptionsItem>
                <DescriptionsItem label="渠道明细号">
                  {{ record.detailNo ?? '—' }}
                </DescriptionsItem>
                <DescriptionsItem label="处理人">
                  {{ record.operatorId ?? '—' }}
                </DescriptionsItem>
                <DescriptionsItem label="处理时间">
                  {{ record.resolvedTime ?? '—' }}
                </DescriptionsItem>
                <DescriptionsItem label="处理说明" :span="2">
                  {{ record.resolutionReason ?? '—' }}
                </DescriptionsItem>
                <DescriptionsItem label="外部凭证" :span="2">
                  {{ record.externalEvidence ?? '—' }}
                </DescriptionsItem>
              </Descriptions>
            </template>
          </Table>
        </template>
        <Empty v-else description="暂无对账详情" />
      </Spin>
    </Drawer>

    <Modal
      :open="manualOpen"
      :title="manualTitle"
      :confirm-loading="saving"
      :closable="!saving"
      :mask-closable="false"
      :cancel-button-props="{ disabled: saving }"
      ok-text="确认提交"
      destroy-on-close
      @ok="submitManual"
      @cancel="closeManual"
    >
      <Form v-if="manualAction" layout="vertical">
        <Alert
          class="mb-4"
          type="info"
          :message="
            manualAction.kind === 'resolve'
              ? '登记差异处理结果后，请刷新复核。资金状态须另行核实。'
              : manualAction.kind === 'reconcile'
                ? '对原平台商编的指定日账单执行核对；请在次日 09:00 后操作。'
                : '提交后系统会核查原请求并继续处理，请先确认渠道处理结果。'
          "
        />
        <p
          v-if="
            manualAction.kind === 'divide' || manualAction.kind === 'refund'
          "
          class="mb-4"
        >
          {{ manualAction.kind === 'divide' ? '资金订单' : '退款单' }}编号：{{
            manualAction.targetId
          }}
        </p>
        <p v-else-if="manualAction.kind === 'resolve'" class="mb-4">
          差异编号：{{ manualAction.id }}
        </p>
        <template v-else>
          <FormItem label="原支付渠道编号" required>
            <InputNumber
              v-model:value="retryChannelId"
              :min="1"
              :precision="0"
              :disabled="saving || !!sourceReconciliationId"
              class="w-full"
            />
          </FormItem>
          <FormItem label="账单日期" required>
            <Input
              v-model:value="retryDate"
              type="date"
              :disabled="saving || !!sourceReconciliationId"
            />
          </FormItem>
          <FormItem label="原平台商编" required>
            <Input
              v-model:value="retryParentMerchantNo"
              :maxlength="64"
              :disabled="saving || !!sourceReconciliationId"
              autocomplete="off"
            />
          </FormItem>
        </template>
        <FormItem label="操作原因" required>
          <Input.TextArea
            v-model:value="reason"
            :rows="3"
            :maxlength="limits.reason"
            show-count
            :disabled="saving"
          />
        </FormItem>
        <FormItem
          label="外部凭证"
          required
          extra="记录易宝工单号、原请求核查结果或内部留档编号。"
        >
          <Input.TextArea
            v-model:value="externalEvidence"
            :rows="3"
            :maxlength="limits.externalEvidence"
            show-count
            :disabled="saving"
          />
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>
