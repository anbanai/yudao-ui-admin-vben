<script lang="ts" setup>
import type {
  YouzanCustomerImportPreview,
  YouzanCustomerImportResult,
} from '#/api/member/youzan-import';

import { computed, ref, watch } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart, formatDateTime } from '@vben/utils';

import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Result,
  Space,
  Table,
} from 'ant-design-vue';

import {
  confirmYouzanCustomerImport,
  downloadYouzanCustomerImportTemplate,
  getYouzanCustomerImportResult,
  previewYouzanCustomerImport,
} from '#/api/member/youzan-import';
import ImportUploadCard from '#/components/youzan-import/import-upload-card.vue';

const { hasAccessByCodes } = useAccess();
const canImport = hasAccessByCodes(['member:youzan-import:import']);
const canQuery = hasAccessByCodes(['member:youzan-import:query']);
const file = ref<File>();
const preview = ref<YouzanCustomerImportPreview>();
const result = ref<YouzanCustomerImportResult>();
const loading = ref(false);
const historyOpen = ref(false);
const batchNumber = ref('');
const resultTitle = computed(() => {
  if (result.value?.status === 4) return '历史批次处理失败';
  if (result.value?.status === 3) return '历史批次等待系统处理';
  if (result.value?.status === 2) return '预览已过期';
  if (result.value?.status !== 1) return '批次尚未确认';
  return result.value.importedRows
    ? '会员积分和等级已导入，可凭手机号领取'
    : '批次已确认，无新增会员资产';
});

const columns = [
  { title: '源行号', dataIndex: 'rowNumber', width: 100 },
  { title: '手机号（脱敏）', dataIndex: 'maskedMobile', width: 160 },
  {
    title: '客户积分',
    dataIndex: 'legacyPoints',
    width: 100,
    customRender: ({ text }: { text?: null | number }) => text ?? '—',
  },
  {
    title: '会员等级',
    dataIndex: 'levelName',
    width: 140,
    customRender: ({ text }: { text?: null | string }) => text ?? '—',
  },
  { title: '处理结果', dataIndex: 'outcome' },
];

watch(file, () => {
  preview.value = undefined;
  result.value = undefined;
});

async function download() {
  downloadFileFromBlobPart({
    fileName: '有赞客户积分模板.xlsx',
    source: await downloadYouzanCustomerImportTemplate(),
  });
}

async function lookup(id: string) {
  id = id.trim();
  if (loading.value || !/^\d{1,19}$/.test(id)) return;
  loading.value = true;
  try {
    result.value = await getYouzanCustomerImportResult(id);
    batchNumber.value = id;
    preview.value = undefined;
    historyOpen.value = false;
  } finally {
    loading.value = false;
  }
}

async function handlePreview() {
  if (loading.value || !file.value) return;
  loading.value = true;
  try {
    preview.value = await previewYouzanCustomerImport(file.value);
    result.value = undefined;
    batchNumber.value = String(preview.value.batchId);
  } finally {
    loading.value = false;
  }
}

async function retryMigration() {
  if (!canImport || loading.value || result.value?.status !== 4) return;
  loading.value = true;
  try {
    result.value = await confirmYouzanCustomerImport(result.value.batchId);
  } finally {
    loading.value = false;
  }
}

function handleConfirm() {
  if (!preview.value || loading.value) return;
  const batchId = preview.value.batchId;
  Modal.confirm({
    title: '确认会员导入批次？',
    content: '确认后，会员可在小程序验证导入时的手机号，领取对应的积分和等级。',
    okText: '确认导入',
    cancelText: '返回预览',
    onOk: async () => {
      if (loading.value || preview.value?.batchId !== batchId) return;
      loading.value = true;
      try {
        result.value = await confirmYouzanCustomerImport(batchId);
        preview.value = undefined;
      } finally {
        loading.value = false;
      }
    },
  });
}
</script>

<template>
  <Page
    title="有赞客户积分导入"
    description="上传 Excel 核对积分和等级。确认后，会员可在小程序验证手机号领取。"
  >
    <template #extra>
      <Space v-if="canQuery || canImport" wrap>
        <Button v-if="canQuery" @click="download">下载模板</Button>
        <Button :disabled="loading" @click="historyOpen = true">
          查询批次
        </Button>
      </Space>
    </template>

    <div class="flex flex-col gap-4">
      <ImportUploadCard
        v-if="canImport"
        :busy="loading"
        :file="file"
        @file="file = $event"
        @preview="handlePreview"
      />
      <Alert
        v-else
        type="info"
        message="当前账号缺少会员导入权限。"
        show-icon
      />

      <Card v-if="preview" title="预览结果">
        <template #extra>
          <Button type="primary" :loading="loading" @click="handleConfirm">
            确认导入
          </Button>
        </template>
        <p class="mb-3">
          通过校验 {{ preview.validCount }} 行 · 跳过
          {{ preview.invalidCount }} 行 · 批次 {{ preview.batchId }} ·
          {{ formatDateTime(preview.expiresAt) }} 到期
        </p>
        <Table
          :columns="columns"
          :scroll="{ x: 650 }"
          :data-source="preview.rows"
          :pagination="{ pageSize: 20 }"
          row-key="rowNumber"
          size="small"
        />
      </Card>

      <Card v-if="result" title="批次结果">
        <template v-if="result.status === 4 && canImport" #extra>
          <Button :loading="loading" @click="retryMigration">重试处理</Button>
        </template>
        <Result
          :status="
            result.status === 4
              ? 'error'
              : result.status === 1
                ? 'success'
                : 'info'
          "
          :title="resultTitle"
          :sub-title="
            result.status === 4
              ? `批次 ${result.batchId} · 原始数据已保留，请管理员检查导入密钥及数据库后重试。`
              : result.status === 3
                ? `批次 ${result.batchId} · 通过校验 ${result.validRows} 行`
                : `批次 ${result.batchId} · 新增 ${result.importedRows ?? 0} · 跳过 ${result.skippedRows ?? 0} · 来源数据变化 ${result.changedRows ?? 0}`
          "
        />
        <Table
          :columns="columns"
          :scroll="{ x: 650 }"
          :data-source="result.rows"
          :pagination="{ pageSize: 20 }"
          row-key="rowNumber"
          size="small"
        />
      </Card>
    </div>

    <Modal
      v-if="canQuery || canImport"
      v-model:open="historyOpen"
      title="查询导入批次"
      ok-text="查询"
      cancel-text="取消"
      :confirm-loading="loading"
      :ok-button-props="{ disabled: !/^\d{1,19}$/.test(batchNumber.trim()) }"
      @ok="lookup(batchNumber)"
    >
      <label for="member-youzan-batch">批次编号</label>
      <Input
        id="member-youzan-batch"
        v-model:value="batchNumber"
        class="mt-2"
        @press-enter="lookup(batchNumber)"
      />
    </Modal>
  </Page>
</template>
