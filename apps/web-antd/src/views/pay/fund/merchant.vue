<script setup lang="ts">
import type { PageResult } from '@vben/request';

import type { MerchantOnboardingApi } from '#/api/pay/fund/merchant';

import { computed, onMounted, onUnmounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  enqueueMerchantOnboarding,
  getMerchantOnboarding,
  getMerchantOnboardingPage,
  saveMerchantOnboardingMaterials,
  uploadMerchantPrivateFile,
} from '#/api/pay/fund/merchant';

import {
  createMerchantMaterialRequests,
  createMerchantPageLoader,
  mayEditMaterials,
  parseMaterialInput,
  safeActionUrl,
} from './merchant-materials';

const { hasAccessByCodes } = useAccess();
const canQuery = computed(() => hasAccessByCodes(['pay:fund:merchant:query']));
const canEdit = computed(() => hasAccessByCodes(['pay:fund:merchant:update']));
const loading = ref(false);
const saving = ref(false);
const uploading = ref(false);
const rows = ref<MerchantOnboardingApi.Task[]>([]);
const total = ref(0);
const pageLoader = createMerchantPageLoader<
  PageResult<MerchantOnboardingApi.Task>
>({
  onResult(result) {
    rows.value = result.list;
    total.value = result.total;
  },
  onLoading(value) {
    loading.value = value;
  },
  onError() {
    message.error('任务查询失败，请稍后重试。');
  },
});
const pageNo = ref(1);
const pageSize = ref(10);
const merchantId = ref<number>();
const state = ref<string>();
const drawerOpen = ref(false);
const detailLoading = ref(false);
const detail = ref<MerchantOnboardingApi.Task>();
const materialRequests = createMerchantMaterialRequests();
const businessRole =
  ref<MerchantOnboardingApi.Task['businessRole']>('SHARE_MERCHANT');
const materialsJson = ref('');
const fileReferencesJson = ref('{}');
const filePath = ref('');

const stateLabels: Record<string, string> = {
  WAITING_MATERIALS: '待补充资料',
  READY: '等待提交',
  RETRY: '等待重试',
  SUBMITTED: '审核中',
  ACTION_REQUIRED: '需要处理',
  COMPLETED: '入网完成',
  SUPERSEDED: '审核版本已更新',
};
const stateOptions = Object.entries(stateLabels).map(([value, label]) => ({
  value,
  label,
}));
const groupLabels: Record<string, string> = {
  merchantSubjectInfo: '商户主体资料',
  merchantCorporationInfo: '法人或经营者资料',
  merchantContactInfo: '联系人资料',
  businessAddressInfo: '经营地址',
  'functionServiceQualificationInfo.shareScene': 'SHARE 分账场景',
};
const columns = [
  { title: '任务编号', dataIndex: 'onboardingId', width: 100 },
  { title: '商户', dataIndex: 'merchantName', width: 200 },
  { title: '状态', key: 'state', width: 150 },
  { title: '资料版本', dataIndex: 'materialsVersion', width: 100 },
  { title: '提交次数', dataIndex: 'attemptCount', width: 100 },
  { title: '下次重试', dataIndex: 'nextRetryTime', width: 180 },
  { title: '操作', key: 'action', width: 120 },
];
const editable = computed(
  () =>
    canEdit.value &&
    !detailLoading.value &&
    !!detail.value &&
    mayEditMaterials(detail.value.state),
);
const signUrl = computed(() => safeActionUrl(detail.value?.signUrl));
const authUrl = computed(() => safeActionUrl(detail.value?.authUrl));
const example = JSON.stringify(
  {
    merchantSubjectInfo: { merchantType: '请按官方文档填写' },
    merchantCorporationInfo: {},
    merchantContactInfo: {},
    businessAddressInfo: {},
    functionServiceQualificationInfo: { shareScene: '请按签约分账场景填写' },
  },
  null,
  2,
);

async function loadPage() {
  if (!canQuery.value) return;
  await pageLoader.load(() =>
    getMerchantOnboardingPage({
      pageNo: pageNo.value,
      pageSize: pageSize.value,
      merchantId: merchantId.value,
      state: state.value,
    }),
  );
}

async function openDetail(onboardingId: number) {
  if (!canQuery.value) return;
  clearSensitiveInput();
  detail.value = undefined;
  drawerOpen.value = true;
  detailLoading.value = true;
  const request = materialRequests.load(onboardingId, getMerchantOnboarding);
  const isCurrent = materialRequests.capture();
  try {
    const task = await request;
    if (!task || !isCurrent()) return;
    detail.value = task;
    businessRole.value = task.businessRole;
  } catch {
    if (isCurrent()) message.error('入网状态查询失败，请稍后重试。');
  } finally {
    if (isCurrent()) detailLoading.value = false;
  }
}

async function refreshDetail() {
  if (!detail.value || !canQuery.value) return;
  const onboardingId = detail.value.onboardingId;
  detailLoading.value = true;
  const request = materialRequests.load(onboardingId, getMerchantOnboarding);
  const isCurrent = materialRequests.capture();
  try {
    const task = await request;
    if (!task || !isCurrent()) return;
    detail.value = task;
    await loadPage();
  } catch {
    if (isCurrent()) message.error('入网状态查询失败，请稍后重试。');
  } finally {
    if (isCurrent()) detailLoading.value = false;
  }
}

async function enqueue() {
  if (saving.value) return;
  if (
    !canEdit.value ||
    !Number.isSafeInteger(merchantId.value) ||
    (merchantId.value ?? 0) <= 0
  ) {
    message.warning('请先填写已审核通过的商户编号。');
    return;
  }
  saving.value = true;
  try {
    await enqueueMerchantOnboarding(merchantId.value!);
    pageNo.value = 1;
    await loadPage();
    message.success('已建立待补料任务。');
  } catch {
    message.error('任务建立失败，请检查商户是否已审核通过。');
  } finally {
    saving.value = false;
  }
}

async function submitMaterials() {
  if (!editable.value || !detail.value || saving.value || uploading.value)
    return;
  const onboardingId = detail.value.onboardingId;
  const selectedBusinessRole = businessRole.value;
  const isCurrent = materialRequests.capture();
  let body;
  try {
    body = parseMaterialInput(materialsJson.value, fileReferencesJson.value);
  } catch {
    message.warning(
      '请检查 JSON 对象、必填资料组、SHARE 场景和私有文件编号，禁止填写渠道密钥。',
    );
    return;
  }
  saving.value = true;
  try {
    await saveMerchantOnboardingMaterials({
      onboardingId,
      businessRole: selectedBusinessRole,
      ...body,
    });
    if (!isCurrent()) return;
    clearSensitiveInput();
    message.success('资料已保存，系统将自动提交并跟进审核。');
    await refreshDetail();
  } catch {
    if (isCurrent()) {
      message.error('资料保存失败，请检查资料格式、文件归属与商户审核状态。');
    }
  } finally {
    saving.value = false;
  }
}

async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (
    !file ||
    !detail.value ||
    !editable.value ||
    uploading.value ||
    saving.value
  )
    return;
  const onboardingId = detail.value.onboardingId;
  const selectedPath = filePath.value;
  if (!/^[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*$/.test(selectedPath)) {
    message.warning(
      '先填写官方文件字段路径，例如 merchantSubjectInfo.businessLicenseUrl。',
    );
    input.value = '';
    return;
  }
  if (
    !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  ) {
    message.warning('请上传不超过 10 MB 的 JPEG、PNG 或 PDF。');
    input.value = '';
    return;
  }
  uploading.value = true;
  const isCurrent = materialRequests.capture();
  try {
    const uploaded = await materialRequests.upload(
      onboardingId,
      selectedPath,
      (id) => uploadMerchantPrivateFile(id, file),
    );
    if (!uploaded || !isCurrent()) return;
    const references: unknown = JSON.parse(fileReferencesJson.value || '{}');
    if (
      !references ||
      typeof references !== 'object' ||
      Array.isArray(references)
    )
      throw new Error('Invalid merchant private file reference object');
    fileReferencesJson.value = JSON.stringify(
      { ...references, [uploaded.fieldPath]: uploaded.fileId },
      null,
      2,
    );
    message.success('私有文件已上传，编号已加入引用对象。');
  } catch {
    if (isCurrent()) {
      message.error('私有上传失败，请检查文件引用对象和私有存储配置。');
    }
  } finally {
    uploading.value = false;
    input.value = '';
  }
}

function clearSensitiveInput() {
  materialsJson.value = '';
  fileReferencesJson.value = '{}';
  filePath.value = '';
}

function closeDrawer() {
  materialRequests.invalidate();
  drawerOpen.value = false;
  detailLoading.value = false;
  detail.value = undefined;
  clearSensitiveInput();
}

function search() {
  pageNo.value = 1;
  void loadPage();
}

function changePage(page: number, size: number) {
  pageNo.value = page;
  pageSize.value = size;
  void loadPage();
}

onMounted(loadPage);
onUnmounted(() => {
  pageLoader.invalidate();
  closeDrawer();
});
</script>

<template>
  <Page
    title="商户支付入网"
    description="补充易宝入网资料，处理签约和认证待办。"
  >
    <Alert
      v-if="!canQuery"
      type="warning"
      message="当前账号没有商户入网查询权限。"
    />
    <Card v-else>
      <Form layout="inline" class="mb-5" @finish="search">
        <FormItem label="商户编号">
          <InputNumber
            v-model:value="merchantId"
            :min="1"
            :precision="0"
            placeholder="商户编号"
          />
        </FormItem>
        <FormItem label="入网状态">
          <Select
            v-model:value="state"
            :options="stateOptions"
            allow-clear
            placeholder="全部状态"
            class="w-44"
          />
        </FormItem>
        <Space>
          <Button type="primary" html-type="submit" :loading="loading">
            查询
          </Button>
          <Button @click="loadPage">刷新</Button>
          <Button v-if="canEdit" :loading="saving" @click="enqueue">
            建立待补料任务
          </Button>
        </Space>
      </Form>
      <Table
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        row-key="onboardingId"
        :scroll="{ x: 950 }"
        :pagination="{
          current: pageNo,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: changePage,
        }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'state'">
            <Tag
              :color="
                record.state === 'COMPLETED'
                  ? 'green'
                  : record.state === 'ACTION_REQUIRED'
                    ? 'orange'
                    : 'default'
              "
            >
              {{ stateLabels[record.state] ?? '未知状态' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Button type="link" @click="openDetail(record.onboardingId)">
              查看 / 补料
            </Button>
          </template>
        </template>
      </Table>
    </Card>

    <Drawer
      :open="drawerOpen"
      title="入网资料与待办"
      :width="720"
      destroy-on-close
      @close="closeDrawer"
    >
      <Spin v-if="detailLoading" />
      <template v-else-if="detail">
        <Descriptions :column="2" size="small" bordered>
          <DescriptionsItem label="任务编号">
            {{ detail.onboardingId }}
          </DescriptionsItem>
          <DescriptionsItem label="商户">
            {{ detail.merchantName }}（{{ detail.merchantId }}）
          </DescriptionsItem>
          <DescriptionsItem label="状态">
            {{ stateLabels[detail.state] ?? '未知状态' }}
          </DescriptionsItem>
          <DescriptionsItem label="资料版本">
            {{ detail.materialsVersion }}
          </DescriptionsItem>
          <DescriptionsItem label="审核时间" :span="2">
            {{ detail.merchantApprovalTime }}
          </DescriptionsItem>
        </Descriptions>
        <Space class="my-4" wrap>
          <Button @click="refreshDetail">刷新状态</Button>
          <a
            v-if="signUrl"
            :href="signUrl"
            target="_blank"
            rel="noopener noreferrer"
            >前往易宝签约</a>
          <a
            v-if="authUrl"
            :href="authUrl"
            target="_blank"
            rel="noopener noreferrer"
            >前往易宝认证</a>
        </Space>
        <Alert
          v-if="detail.lastError"
          class="mb-4"
          type="warning"
          message="渠道处理未完成，请检查资料或等待系统重试。"
        />
        <Alert
          v-if="detail.missingMaterials?.length"
          class="mb-4"
          type="info"
          :message="`待补充：${detail.missingMaterials.map((key) => groupLabels[key] ?? key).join('、')}`"
        />
        <template v-if="editable">
          <Alert
            class="mb-4"
            type="info"
            message="按易宝官方商户类型文档补充完整资料。资料保存后不回显；请保留内部合规的来源记录。"
          />
          <Form layout="vertical">
            <FormItem label="业务角色">
              <Select
                v-model:value="businessRole"
                :options="[
                  { label: '分账商户 SHARE_MERCHANT', value: 'SHARE_MERCHANT' },
                  {
                    label: '结算商户 SETTLED_MERCHANT',
                    value: 'SETTLED_MERCHANT',
                  },
                ]"
              />
            </FormItem>
            <FormItem
              label="官方入网资料 JSON"
              extra="主体、法人或经营者、地址为必填组；非小微还需联系人。SHARE 场景及证照有效期、照片、银行账户等按官方类型要求填写。"
            >
              <Input.TextArea
                v-model:value="materialsJson"
                :rows="13"
                :placeholder="example"
                autocomplete="off"
              />
            </FormItem>
            <FormItem
              label="上传私有证照"
              extra="填写官方文件字段路径后选择 JPEG、PNG 或 PDF，单文件不超过 10 MB。"
            >
              <Input
                v-model:value="filePath"
                class="mb-2"
                placeholder="merchantSubjectInfo.businessLicenseUrl"
                autocomplete="off"
              />
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                :disabled="uploading || saving"
                @change="uploadFile"
              />
            </FormItem>
            <FormItem
              label="私有文件引用 JSON"
              extra="官方字段路径 → 当前后台账号上传的私有文件编号；系统提交时生成短时地址。"
            >
              <Input.TextArea
                v-model:value="fileReferencesJson"
                :rows="4"
                autocomplete="off"
              />
            </FormItem>
            <Button
              type="primary"
              :loading="saving"
              :disabled="uploading"
              @click="submitMaterials"
            >
              保存并进入提交队列
            </Button>
          </Form>
        </template>
      </template>
    </Drawer>
  </Page>
</template>
