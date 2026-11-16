<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue';

import type { MallMerchantApi } from '#/api/mall/product/merchant';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import {
  Alert as AAlert,
  Button as AButton,
  Descriptions as ADescriptions,
  DescriptionsItem as ADescriptionsItem,
  Empty as AEmpty,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Modal as AModal,
  Select as ASelect,
  Spin as ASpin,
  Table as ATable,
  Tag as ATag,
  Textarea as ATextarea,
  Timeline as ATimeline,
  TimelineItem as ATimelineItem,
  message,
  Modal,
} from 'ant-design-vue';

import {
  approveMerchantApplication,
  bindLegacyMerchantAccount,
  freezeMerchant,
  getAdminMerchantApplicationHistory,
  getMerchantApplication,
  getMerchantApplicationPage,
  getMerchantApplicationReviewRecords,
  getMerchantBusinessTypePage,
  rejectMerchantApplication,
  unfreezeMerchant,
} from '#/api/mall/product/merchant';
import { MerchantStatus } from '#/api/mall/product/merchant';
import { compareMerchantApplications } from '#/api/mall/product/merchant/application-contract';

const statusMap: Record<number, { color: string; label: string }> = {
  [MerchantStatus.DRAFT]: { color: 'default', label: '草稿' },
  [MerchantStatus.PENDING]: { color: 'processing', label: '待审核' },
  [MerchantStatus.APPROVED]: { color: 'success', label: '已通过' },
  [MerchantStatus.REJECTED]: { color: 'error', label: '需补充材料' },
  [MerchantStatus.FROZEN]: { color: 'warning', label: '已暂停' },
  [MerchantStatus.CHANGE_PENDING]: {
    color: 'processing',
    label: '资料变更审核中',
  },
  [MerchantStatus.CHANGE_REJECTED]: { color: 'error', label: '资料变更被退回' },
};

const applicationStatusMap = Object.fromEntries(
  Object.entries(statusMap).filter(([value]) => Number(value) <= 30),
);
const versions = ref<MallMerchantApi.Application[]>([]);
const previousDetail = ref<MallMerchantApi.Application>();
const differences = computed(() =>
  detail.value && previousDetail.value
    ? compareMerchantApplications(previousDetail.value, detail.value)
    : [],
);
const detailLoading = ref(false);
const loading = ref(false);
const reviewing = ref(false);
const applications = ref<MallMerchantApi.Application[]>([]);
const total = ref(0);
const current = ref(1);
const pageSize = ref(10);
const filters = reactive({ name: '', status: undefined as number | undefined });
const detailOpen = ref(false);
const detail = ref<MallMerchantApi.Application>();
const reviewRecords = ref<MallMerchantApi.ReviewRecord[]>([]);
const businessTypeLabels = ref<Record<string, string>>({});
const rejectReason = ref('');
const legacyAccountId = ref<number>();
let detailRequest = 0;
const canReview = computed(
  () =>
    detail.value?.type !== 'LEGACY' &&
    detail.value?.status === MerchantStatus.PENDING &&
    (detail.value?.merchantStatus === MerchantStatus.PENDING ||
      detail.value?.merchantStatus === MerchantStatus.CHANGE_PENDING) &&
    detail.value?.versionNo ===
      Math.max(...versions.value.map((item) => item.versionNo ?? 0)),
);
watch(detailOpen, (open) => {
  if (!open) detailRequest++;
});

const columns = [
  { title: '商家名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '店铺名称', dataIndex: 'storeName', key: 'storeName', width: 160 },
  { title: '申请版本', dataIndex: 'versionNo', key: 'versionNo', width: 100 },
  {
    title: '经营状态',
    dataIndex: 'merchantStatus',
    key: 'merchantStatus',
    width: 140,
  },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  {
    title: '提交时间',
    dataIndex: 'submittedTime',
    key: 'submittedTime',
    width: 170,
  },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' as const },
];

const pagination = computed<TablePaginationConfig>(() => ({
  current: current.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count) => `共 ${count} 条`,
}));

async function load() {
  loading.value = true;
  try {
    const [result, businessTypes] = await Promise.all([
      getMerchantApplicationPage({
        pageNo: current.value,
        pageSize: pageSize.value,
        name: filters.name || undefined,
        status: filters.status,
      }),
      getMerchantBusinessTypePage({ pageNo: 1, pageSize: 200 }),
    ]);
    applications.value = result.list;
    total.value = result.total;
    businessTypeLabels.value = Object.fromEntries(
      businessTypes.list.map((item) => [item.code, item.name]),
    );
  } finally {
    loading.value = false;
  }
}

function handleTableChange(next: TablePaginationConfig) {
  current.value = next.current ?? 1;
  pageSize.value = next.pageSize ?? 10;
  void load();
}

async function selectVersion(id: number, request = ++detailRequest) {
  detailLoading.value = true;
  detail.value = undefined;
  previousDetail.value = undefined;
  try {
    const selected = await getMerchantApplication(id);
    const previous = versions.value
      .filter((item) => (item.versionNo ?? 0) < (selected.versionNo ?? 0))
      .sort((a, b) => (b.versionNo ?? 0) - (a.versionNo ?? 0))[0];
    const previousApplication = previous?.id
      ? await getMerchantApplication(previous.id)
      : undefined;
    if (request !== detailRequest || !detailOpen.value) return;
    detail.value = selected;
    previousDetail.value = previousApplication;
    legacyAccountId.value = selected.currentOwnerAccountId;
  } catch {
    if (request === detailRequest)
      message.error('申请详情加载失败，请重新打开');
  } finally {
    if (request === detailRequest) detailLoading.value = false;
  }
}

async function openDetail(row: MallMerchantApi.Application) {
  detailOpen.value = true;
  const request = ++detailRequest;
  detailLoading.value = true;
  rejectReason.value = '';
  detail.value = undefined;
  previousDetail.value = undefined;
  reviewRecords.value = [];
  versions.value = [];
  legacyAccountId.value = undefined;
  try {
    const [history, records] = row.merchantId
      ? await Promise.all([
          getAdminMerchantApplicationHistory(row.merchantId),
          getMerchantApplicationReviewRecords(row.merchantId),
        ])
      : [[], []];
    if (request !== detailRequest || !detailOpen.value) return;
    versions.value = history;
    reviewRecords.value = records;
    await selectVersion(row.id!, request);
  } catch {
    if (request === detailRequest)
      message.error('审核历史加载失败，请重新打开');
  } finally {
    if (request === detailRequest) detailLoading.value = false;
  }
}

async function bindLegacyAccount() {
  if (!detail.value?.merchantId || !legacyAccountId.value) return;
  reviewing.value = true;
  try {
    await bindLegacyMerchantAccount(
      detail.value.merchantId,
      legacyAccountId.value,
    );
    message.success('历史商家已关联账号，请商家登录后补正并提交审核');
    await selectVersion(detail.value.id!);
    await load();
  } finally {
    reviewing.value = false;
  }
}

function confirmApprove() {
  if (!detail.value?.id || !canReview.value) return;
  const applicationId = detail.value.id;
  Modal.confirm({
    title: '通过商家入驻申请？',
    content: `确认通过“${detail.value.name}”的入驻申请吗？`,
    onOk: async () => {
      reviewing.value = true;
      try {
        await approveMerchantApplication(applicationId);
        message.success('审核已通过');
        detailOpen.value = false;
        await load();
      } finally {
        reviewing.value = false;
      }
    },
  });
}

async function handleReject() {
  if (!detail.value?.id) return;
  if (!rejectReason.value.trim()) {
    message.warning('请填写补充材料意见');
    return;
  }
  reviewing.value = true;
  try {
    await rejectMerchantApplication(detail.value.id, rejectReason.value.trim());
    message.success('已退回补充材料');
    detailOpen.value = false;
    await load();
  } finally {
    reviewing.value = false;
  }
}

function updateMerchantOperatingStatus(action: 'freeze' | 'unfreeze') {
  const merchantId = detail.value?.merchantId;
  const applicationId = detail.value?.id;
  if (!merchantId || !applicationId) return;
  const isFreeze = action === 'freeze';
  Modal.confirm({
    title: isFreeze ? '冻结商家？' : '解冻商家？',
    content: isFreeze
      ? `冻结“${detail.value?.name || ''}”后，商家将立即停止商品和履约操作。`
      : `确认恢复“${detail.value?.name || ''}”的经营权限吗？`,
    okType: isFreeze ? 'danger' : 'primary',
    onOk: async () => {
      reviewing.value = true;
      try {
        if (isFreeze) {
          await freezeMerchant(merchantId);
        } else {
          await unfreezeMerchant(merchantId);
        }
        message.success(isFreeze ? '商家已冻结' : '商家已解冻');
        if (detailOpen.value && detail.value?.id === applicationId) {
          await selectVersion(applicationId);
        }
        await load();
      } finally {
        reviewing.value = false;
      }
    },
  });
}

function formatTime(value?: Date | string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function getStatus(status?: number) {
  return statusMap[status ?? 0] ?? { color: 'default', label: '未知' };
}

function getReviewActionLabel(action?: string) {
  const labels: Record<string, string> = {
    SUBMIT: '提交审核',
    APPROVE: '审核通过',
    REJECT: '退回补充',
    FREEZE: '冻结经营权限',
    UNFREEZE: '恢复经营权限',
    BIND_LEGACY: '关联历史商家账号',
    LEGACY: '历史数据迁移',
  };
  return labels[action ?? ''] || '审核记录';
}

function getBusinessTypeLabel(code: string) {
  return businessTypeLabels.value[code] || code;
}

onMounted(load);
</script>

<template>
  <section class="review-page">
    <div class="filter-row">
      <AInput
        v-model:value="filters.name"
        allow-clear
        class="max-w-[240px]"
        placeholder="商家或店铺名称"
        @press-enter="load"
      />
      <ASelect
        v-model:value="filters.status"
        allow-clear
        class="w-[150px]"
        placeholder="审核状态"
        :options="
          Object.entries(applicationStatusMap).map(([value, item]) => ({
            label: item.label,
            value: Number(value),
          }))
        "
      />
      <AButton
        type="primary"
        @click="
          current = 1;
          load();
        "
      >
        查询
      </AButton>
      <AButton
        @click="
          filters.name = '';
          filters.status = undefined;
          current = 1;
          load();
        "
      >
        重置
      </AButton>
    </div>

    <ATable
      :columns="columns"
      :data-source="applications"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 1120 }"
      row-key="id"
      size="middle"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <ATag :color="getStatus(record.status).color">
            {{ getStatus(record.status).label }}
          </ATag>
        </template>
        <template v-else-if="column.key === 'merchantStatus'">
          <ATag :color="getStatus(record.merchantStatus).color">
            {{ getStatus(record.merchantStatus).label }}
          </ATag>
        </template>
        <template v-else-if="column.key === 'submittedTime'">
          {{ formatTime(record.submittedTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <AButton
            type="link"
            size="small"
            @click="openDetail(record as MallMerchantApi.Application)"
          >
            查看申请
          </AButton>
        </template>
      </template>
    </ATable>

    <AModal
      v-model:open="detailOpen"
      :confirm-loading="reviewing"
      title="入驻申请审核"
      width="900px"
      :footer="null"
      destroy-on-close
    >
      <ASpin v-if="detailLoading" />
      <template v-if="detail">
        <AAlert
          v-if="detail.type === 'LEGACY'"
          class="mb-4"
          type="info"
          show-icon
          message="历史导入版本保留原始状态。未完成审核的商家需关联自助注册账号，由商家补全材料、同意协议并重新提交。"
        />
        <div v-if="detail.type === 'LEGACY'" class="mb-4 flex gap-2">
          <AInputNumber
            v-model:value="legacyAccountId"
            :disabled="Boolean(detail.currentOwnerAccountId)"
            :min="1"
            :precision="0"
            placeholder="已注册商家账号编号"
          />
          <AButton :loading="reviewing" @click="bindLegacyAccount">
            {{ detail.currentOwnerAccountId ? '重试账号同步' : '关联申请账号' }}
          </AButton>
        </div>
        <ASelect
          class="mb-4 w-full"
          :value="detail.id"
          :disabled="detailLoading || reviewing"
          :options="
            versions.map((item) => ({
              value: item.id,
              label: `版本 ${item.versionNo} · ${getStatus(item.status).label}`,
            }))
          "
          @change="(id) => typeof id === 'number' && selectVersion(id)"
        />
        <ADescriptions bordered :column="2" size="small">
          <ADescriptionsItem label="商家名称">
            {{ detail.name || '-' }}
          </ADescriptionsItem>
          <ADescriptionsItem label="店铺名称">
            {{ detail.storeName || '-' }}
          </ADescriptionsItem>
          <ADescriptionsItem label="企业主体">
            {{ detail.companyName || '-' }}
          </ADescriptionsItem>
          <ADescriptionsItem label="统一社会信用代码">
            {{ detail.creditCode || '-' }}
          </ADescriptionsItem>
          <ADescriptionsItem label="法人代表">
            {{ detail.legalPerson || '-' }}
          </ADescriptionsItem>
          <ADescriptionsItem label="联系人">
            {{ detail.contactName || '-' }}
            {{ detail.contactMobile || '' }}
          </ADescriptionsItem>
          <ADescriptionsItem label="经营类型" :span="2">
            {{
              detail.businessTypes?.map(getBusinessTypeLabel).join('、') || '-'
            }}
          </ADescriptionsItem>
        </ADescriptions>

        <div class="panel-heading">资质材料</div>
        <ATable
          :columns="[
            { title: '资质编码', dataIndex: 'code', key: 'code' },
            { title: '资质名称', dataIndex: 'name', key: 'name' },
            {
              title: '证件编号',
              dataIndex: 'certificateNo',
              key: 'certificateNo',
            },
            { title: '有效期', key: 'validity' },
            { title: '文件', key: 'file' },
          ]"
          :data-source="detail.qualifications || []"
          :pagination="false"
          row-key="code"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'validity'">
              {{ record.validStart || '-' }} 至 {{ record.validEnd || '-' }}
            </template>
            <template v-else-if="column.key === 'file'">
              <a
                v-if="record.previewUrl"
                :href="record.previewUrl"
                target="_blank"
                rel="noreferrer"
              >
                {{ record.fileName || '查看文件' }}
              </a>
              <span v-else>{{
                record.previewUnavailable
                  ? '原文件不可授权预览，需重新上传'
                  : '-'
              }}</span>
            </template>
          </template>
        </ATable>

        <div class="panel-heading">与上一申请版本对比</div>
        <ATable
          v-if="previousDetail"
          :columns="[
            { title: '字段', dataIndex: 'field', key: 'field' },
            { title: '上一版本', dataIndex: 'previous', key: 'previous' },
            { title: '当前版本', dataIndex: 'current', key: 'current' },
          ]"
          :data-source="differences"
          :pagination="false"
          row-key="field"
          size="small"
        />
        <AEmpty v-else description="首个申请版本" />

        <div class="panel-heading">审核记录</div>
        <ATimeline v-if="reviewRecords.length">
          <ATimelineItem
            v-for="record in reviewRecords"
            :key="record.id || `${record.action}-${record.reviewTime}`"
          >
            <div class="review-record-heading">
              <span>{{ getReviewActionLabel(record.action)
                }}{{
                  record.reviewerId ? ` · 审核人 ${record.reviewerId}` : ''
                }}</span>
              <span>{{ formatTime(record.reviewTime) }}</span>
            </div>
            <div v-if="record.reason">{{ record.reason }}</div>
          </ATimelineItem>
        </ATimeline>
        <AEmpty v-else description="暂无审核记录" />

        <template v-if="canReview">
          <AFormItem class="mt-5" label="补充材料意见" required>
            <ATextarea
              v-model:value="rejectReason"
              :maxlength="500"
              placeholder="说明需要商家补充或修正的材料"
              :rows="3"
              show-count
            />
          </AFormItem>
          <div class="review-actions">
            <AButton :loading="reviewing" danger @click="handleReject">
              退回补充
            </AButton>
            <AButton
              type="primary"
              :loading="reviewing"
              @click="confirmApprove"
            >
              通过申请
            </AButton>
          </div>
        </template>
        <div
          v-if="
            detail.merchantStatus === MerchantStatus.APPROVED ||
            detail.merchantStatus === MerchantStatus.FROZEN
          "
          class="review-actions"
        >
          <AButton
            v-if="detail.merchantStatus === MerchantStatus.APPROVED"
            danger
            :loading="reviewing"
            @click="updateMerchantOperatingStatus('freeze')"
          >
            冻结经营权限
          </AButton>
          <AButton
            v-else
            type="primary"
            :loading="reviewing"
            @click="updateMerchantOperatingStatus('unfreeze')"
          >
            解冻经营权限
          </AButton>
        </div>
      </template>
    </AModal>
  </section>
</template>

<style scoped>
.review-page {
  padding: 12px 0 0;
}

.filter-row,
.review-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}

.review-actions {
  justify-content: flex-end;
  margin: 20px 0 0;
}

.panel-heading {
  margin: 22px 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.review-record-heading {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 4px;
}
</style>
