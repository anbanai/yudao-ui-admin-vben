<script setup lang="ts">
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { MallAfterSaleApi } from '#/api/mall/trade/afterSale';
import type { MallOrderApi } from '#/api/mall/trade/order';

import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { confirm, Page, useVbenModal } from '@vben/common-ui';
import { DICT_TYPE } from '@vben/constants';
import { useTabs } from '@vben/hooks';
import { $t } from '@vben/locales';

import {
  Descriptions,
  Input,
  message,
  Modal,
  Tag,
  Timeline,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  agreeAfterSale,
  cancelReturnShipment,
  getAfterSale,
  getReturnShipment,
  getReturnShipmentTraces,
  manualReturnShipment,
  receiveAfterSale,
  refundAfterSale,
  retryReturnShipment,
} from '#/api/mall/trade/afterSale';
import { useDescription } from '#/components/description';
import { DictTag } from '#/components/dict-tag';
import { TableAction } from '#/components/table-action';

import DisagreeForm from '../modules/disagree-form.vue';
import RefuseForm from '../modules/refuse-form.vue';
import { AFTER_SALE_REFUND_WAY, agreeAndRefundAfterSale } from '../refund-flow';
import {
  useAfterSaleInfoSchema,
  useOperateLogSchema,
  useOrderInfoSchema,
  useProductColumns,
  useRefundStatusSchema,
} from './data';

defineOptions({ name: 'TradeAfterSaleDetail' });

const route = useRoute();
const router = useRouter();
const tabs = useTabs();
const { hasAccessByCodes } = useAccess();

const loading = ref(false);
const afterSaleId = ref(0);
const afterSale = ref<MallAfterSaleApi.AfterSale>({
  order: {},
  orderItem: {},
  logs: [],
});
const returnShipment = ref<MallAfterSaleApi.ReturnShipment>();
const traces = ref<MallAfterSaleApi.ReturnShipment['traces']>([]);
const manualModalOpen = ref(false);
const manualLogisticsId = ref('');
const manualLogisticsNo = ref('');

function maskMobile(mobile?: string) {
  if (!mobile) return '';
  return mobile.length >= 7
    ? `${mobile.slice(0, 3)}****${mobile.slice(-4)}`
    : '****';
}

const [OrderDescriptions] = useDescription({
  title: '订单信息',
  bordered: false,
  column: 3,
  class: 'mx-4',
  schema: useOrderInfoSchema(),
});

const [AfterSaleDescriptions] = useDescription({
  title: '售后信息',
  bordered: false,
  column: 3,
  class: 'mx-4',
  schema: useAfterSaleInfoSchema(),
});

const [RefundStatusDescriptions] = useDescription({
  title: '退款状态',
  bordered: false,
  column: 1,
  class: 'mx-4',
  schema: useRefundStatusSchema(),
});

const [ProductGrid, productGridApi] = useVbenVxeGrid({
  gridOptions: {
    cellConfig: {
      height: 60,
    },
    columns: useProductColumns(),
    data: [],
    height: 'auto',
    border: true,
    pagerConfig: {
      enabled: false,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<MallOrderApi.OrderItem>,
});

const [OperateLogGrid, operateLogGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useOperateLogSchema(),
    data: [],
    border: true,
    pagerConfig: {
      enabled: false,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions,
});

const [DisagreeModal, disagreeModalApi] = useVbenModal({
  connectedComponent: DisagreeForm,
  destroyOnClose: true,
});

const [RefuseModal, refuseModalApi] = useVbenModal({
  connectedComponent: RefuseForm,
  destroyOnClose: true,
});

/** 获得详情 */
async function getDetail() {
  loading.value = true;
  try {
    const res = await getAfterSale(afterSaleId.value);
    if (res === null) {
      message.error('售后订单不存在');
      handleBack();
      return;
    }
    afterSale.value = res;
    try {
      returnShipment.value = await getReturnShipment(afterSaleId.value);
    } catch {
      returnShipment.value = undefined;
    }
    try {
      traces.value = (await getReturnShipmentTraces(afterSaleId.value)) || [];
    } catch {
      traces.value = [];
    }
    productGridApi.setGridOptions({ data: [afterSale.value.orderItem] });
    operateLogGridApi.setGridOptions({
      data: afterSale.value.logs || [],
    });
  } finally {
    loading.value = false;
  }
}

async function handleRetryReturnShipment() {
  await confirm('确认重试创建顺丰退货取件单？');
  await retryReturnShipment(afterSaleId.value);
  message.success('已提交重试');
  await getDetail();
}

async function handleCancelReturnShipment() {
  await confirm('确认取消尚未揽收的取件单？');
  await cancelReturnShipment(afterSaleId.value);
  message.success('已取消取件');
  await getDetail();
}

async function handleManualReturnShipment() {
  if (!manualLogisticsId.value || !manualLogisticsNo.value) {
    message.warning('请填写物流公司编号和物流单号');
    return;
  }
  await manualReturnShipment(afterSaleId.value, {
    logisticsId: Number(manualLogisticsId.value),
    logisticsNo: manualLogisticsNo.value,
  });
  manualModalOpen.value = false;
  message.success('已补录退货物流');
  await getDetail();
}

function openManualReturnShipment() {
  manualModalOpen.value = true;
}

/** 同意售后 */
async function handleAgree() {
  await confirm(
    afterSale.value.way === AFTER_SALE_REFUND_WAY
      ? '是否同意售后并立即退款？'
      : '是否同意售后？',
  );
  const hideLoading = message.loading({
    content: '正在处理中...',
    duration: 0,
  });
  try {
    await agreeAndRefundAfterSale(afterSale.value.id!, afterSale.value.way, {
      agreeAfterSale,
      refundAfterSale,
    });
    message.success(
      afterSale.value.way === AFTER_SALE_REFUND_WAY
        ? '退款操作已提交，请以退款状态为准'
        : $t('ui.actionMessage.operationSuccess'),
    );
  } finally {
    await getDetail();
    hideLoading();
  }
}

/** 拒绝售后 */
function handleDisagree() {
  disagreeModalApi.setData({ afterSale: afterSale.value }).open();
}

/** 确认收货 */
async function handleReceive() {
  await confirm('是否确认收货？');
  const hideLoading = message.loading({
    content: '正在处理中...',
    duration: 0,
  });
  try {
    await receiveAfterSale(afterSale.value.id!);
    message.success($t('ui.actionMessage.operationSuccess'));
  } finally {
    await getDetail();
    hideLoading();
  }
}

/** 拒绝收货 */
function handleRefuse() {
  refuseModalApi.setData({ afterSale: afterSale.value }).open();
}

/** 确认退款 */
async function handleRefund() {
  await confirm('是否确认退款？');
  const hideLoading = message.loading({
    content: '正在处理中...',
    duration: 0,
  });
  try {
    await refundAfterSale(afterSale.value.id!);
    message.success($t('ui.actionMessage.operationSuccess'));
  } finally {
    await getDetail();
    hideLoading();
  }
}

/** 返回列表页 */
function handleBack() {
  tabs.closeCurrentTab();
  router.push({ name: 'TradeAfterSale' });
}

/** Only refund-capable operators can approve refund-only requests in one step. */
function canAgreeAfterSale() {
  if (!hasAccessByCodes(['trade:after-sale:agree'])) {
    return false;
  }
  return (
    afterSale.value.way !== AFTER_SALE_REFUND_WAY ||
    hasAccessByCodes(['trade:after-sale:refund'])
  );
}

/** 初始化 */
onMounted(() => {
  afterSaleId.value = Number(route.params.id);
  getDetail();
});
</script>

<template>
  <Page auto-content-height :title="afterSale.no" :loading="loading">
    <template #extra>
      <TableAction
        :actions="[
          {
            label: '返回',
            type: 'default',
            icon: 'lucide:arrow-left',
            onClick: handleBack,
          },
          {
            label:
              afterSale.way === AFTER_SALE_REFUND_WAY
                ? '同意并退款'
                : '同意售后',
            type: 'primary',
            onClick: handleAgree,
            ifShow: afterSale.status === 10 && canAgreeAfterSale(),
          },
          {
            label: '拒绝售后',
            type: 'primary',
            danger: true,
            onClick: handleDisagree,
            ifShow:
              afterSale.status === 10 &&
              hasAccessByCodes(['trade:after-sale:disagree']),
          },
          {
            label: '确认收货',
            type: 'primary',
            onClick: handleReceive,
            ifShow:
              afterSale.status === 30 &&
              hasAccessByCodes(['trade:after-sale:receive']),
          },
          {
            label: '重试创建取件单',
            type: 'primary',
            onClick: handleRetryReturnShipment,
            ifShow:
              returnShipment?.status === 'CREATE_FAILED' &&
              hasAccessByCodes(['trade:after-sale:return-shipment:retry']),
          },
          {
            label: '取消取件单',
            type: 'default',
            danger: true,
            onClick: handleCancelReturnShipment,
            ifShow:
              ['CREATING', 'PICKUP_PENDING'].includes(
                returnShipment?.status || '',
              ) &&
              hasAccessByCodes(['trade:after-sale:return-shipment:cancel']),
          },
          {
            label: '人工补录物流',
            type: 'default',
            onClick: openManualReturnShipment,
            ifShow:
              afterSale.status === 20 &&
              hasAccessByCodes(['trade:after-sale:return-shipment:manual']),
          },
          {
            label: '拒绝收货',
            type: 'primary',
            danger: true,
            onClick: handleRefuse,
            ifShow:
              afterSale.status === 30 &&
              hasAccessByCodes(['trade:after-sale:receive']),
          },
          {
            label: '确认退款/重试退款',
            type: 'primary',
            onClick: handleRefund,
            ifShow:
              afterSale.status === 40 &&
              hasAccessByCodes(['trade:after-sale:refund']),
          },
        ]"
      />
    </template>

    <!-- 拒绝售后弹窗 -->
    <DisagreeModal @success="getDetail" />

    <!-- 拒绝收货弹窗 -->
    <RefuseModal @success="getDetail" />

    <Modal
      v-model:open="manualModalOpen"
      title="人工补录退货物流"
      @ok="handleManualReturnShipment"
    >
      <div class="mb-3">物流公司编号</div>
      <Input
        v-model:value="manualLogisticsId"
        class="mb-4"
        placeholder="请输入物流公司编号"
      />
      <div class="mb-3">物流单号</div>
      <Input v-model:value="manualLogisticsNo" placeholder="请输入物流单号" />
    </Modal>

    <!-- 订单信息 -->
    <div class="mb-4">
      <OrderDescriptions :data="afterSale" />
    </div>
    <!-- 售后信息 -->
    <div class="mb-4">
      <AfterSaleDescriptions :data="afterSale" />
    </div>
    <!-- 退款状态 -->
    <div class="mb-4">
      <RefundStatusDescriptions :data="afterSale" />
    </div>
    <div v-if="returnShipment" class="mb-4">
      <Descriptions title="退货取件物流" bordered size="small" :column="2">
        <Descriptions.Item label="服务商">
{{
          returnShipment.provider || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="状态">
{{
          returnShipment.statusName || returnShipment.status || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="运单号">
{{
          returnShipment.waybillNo || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="预约时间">
{{
          returnShipment.appointmentTime || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="费用承担">
{{
          returnShipment.feePayerName || returnShipment.feePayer || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="预计/实际费用">
          {{ returnShipment.estimatedFee ?? '-' }} /
          {{ returnShipment.actualFee ?? '-' }} 分
        </Descriptions.Item>
        <Descriptions.Item label="已扣退款运费">
          {{ returnShipment.refundDeductedFee ?? '-' }} 分
        </Descriptions.Item>
        <Descriptions.Item label="取件联系人">
{{ returnShipment.pickupContactName || '-' }}
          {{
            maskMobile(returnShipment.pickupContactMobile)
          }}
</Descriptions.Item>
        <Descriptions.Item label="取件地址">
{{
          returnShipment.pickupAddress || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="退货地址">
{{
          returnShipment.returnAddress || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item
          v-if="returnShipment.errorMessage"
          label="异常原因"
          :span="2"
        >
          <span class="text-red-500">{{ returnShipment.errorMessage }}</span>
        </Descriptions.Item>
      </Descriptions>
      <Timeline
        v-if="traces?.length"
        class="mt-4"
        :items="
          traces.map((item) => ({
            label: item.occurredTime || item.operateTime,
            children: `${item.description || item.content || ''}${item.location ? ` · ${item.location}` : ''}`,
          }))
        "
      />
    </div>
    <!-- 商品信息 -->
    <div class="mb-4">
      <ProductGrid table-title="商品信息">
        <template #spuName="{ row }">
          <div class="flex flex-1 flex-col items-start gap-1 text-left">
            <span class="text-sm">{{ row.spuName }}</span>
            <div class="flex flex-wrap gap-1">
              <Tag
                v-for="property in row.properties"
                :key="property.propertyId!"
                size="small"
              >
                {{ property.propertyName }}: {{ property.valueName }}
              </Tag>
            </div>
          </div>
        </template>
      </ProductGrid>
    </div>
    <!-- 操作日志 -->
    <div>
      <OperateLogGrid table-title="售后日志">
        <template #userType="{ row }">
          <Tag v-if="row.userId === 0" color="default">系统</Tag>
          <DictTag v-else :type="DICT_TYPE.USER_TYPE" :value="row.userType" />
        </template>
      </OperateLogGrid>
    </div>
  </Page>
</template>
