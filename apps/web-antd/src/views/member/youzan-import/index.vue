<script lang="ts" setup>
import type {
  YouzanCustomerImportPreview,
  YouzanCustomerImportResult,
} from '#/api/member/youzan-import';

import { computed, ref, watch } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

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
  getAuthorizedYouzanMemberMerchants,
  getYouzanCustomerImportResult,
  previewYouzanCustomerImport,
} from '#/api/member/youzan-import';
import ImportUploadCard from '#/components/youzan-import/import-upload-card.vue';

const { hasAccessByCodes } = useAccess();
const canImport = hasAccessByCodes(['member:youzan-import:import']);
const canQuery = hasAccessByCodes(['member:youzan-import:query']);
const merchant = ref('');
const file = ref<File>();
const preview = ref<YouzanCustomerImportPreview>();
const result = ref<YouzanCustomerImportResult>();
const loading = ref(false);
const historyOpen = ref(false);
const batchNumber = ref('');
const resultTitle = computed(() => {
  if (result.value?.status !== 1) return '批次尚未确认';
  return result.value.importedRows
    ? '会员资产已导入，等待领取'
    : '批次已确认，无新增会员资产';
});

const columns = [
  { title: '源行号', dataIndex: 'rowNumber', width: 100 },
  { title: '手机号（脱敏）', dataIndex: 'maskedMobile', width: 160 },
  { title: '处理结果', dataIndex: 'outcome' },
];

watch([merchant, file], () => {
  preview.value = undefined;
  result.value = undefined;
});

async function loadMerchants() {
  const merchantIds = await getAuthorizedYouzanMemberMerchants();
  return merchantIds.map((id) => ({
    label: `商家 #${id}`,
    value: id,
  }));
}

async function download() {
  downloadFileFromBlobPart({
    fileName: '有赞客户积分模板.xlsx',
    source: await downloadYouzanCustomerImportTemplate(),
  });
}

async function lookup() {
  const id = batchNumber.value.trim();
  if (loading.value || !/^\d{1,19}$/.test(id)) return;
  loading.value = true;
  try {
    result.value = await getYouzanCustomerImportResult(id);
    preview.value = undefined;
    historyOpen.value = false;
  } finally {
    loading.value = false;
  }
}

async function handlePreview() {
  if (loading.value || !merchant.value || !file.value) return;
  loading.value = true;
  try {
    preview.value = await previewYouzanCustomerImport(
      file.value,
      merchant.value,
    );
    result.value = undefined;
    batchNumber.value = String(preview.value.batchId);
  } finally {
    loading.value = false;
  }
}

function handleConfirm() {
  if (!preview.value || loading.value) return;
  const batchId = preview.value.batchId;
  Modal.confirm({
    title: '确认会员导入批次？',
    content: '新导入的会员资产可在微信小程序授权手机号后领取。',
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
    description="导入旧积分和等级，会员可在微信小程序授权手机号后领取。"
  >
    <template #extra>
      <Space v-if="canQuery" wrap>
        <Button @click="download">下载模板</Button>
        <Button :disabled="loading" @click="historyOpen = true">
          查询批次
        </Button>
      </Space>
    </template>

    <div class="flex flex-col gap-4">
      <ImportUploadCard
        v-if="canImport"
        v-model:merchant="merchant"
        :busy="loading"
        :file="file"
        :load-options="loadMerchants"
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
          {{ preview.expiresAt }} 到期
        </p>
        <Table
          :columns="columns"
          :data-source="preview.rows"
          :pagination="{ pageSize: 20 }"
          row-key="rowNumber"
          size="small"
        />
      </Card>

      <Card v-if="result" title="批次结果">
        <Result
          :status="result.status === 1 ? 'success' : 'info'"
          :title="resultTitle"
          :sub-title="`批次 ${result.batchId} · 新增 ${result.importedRows ?? 0} · 跳过 ${result.skippedRows ?? 0} · 来源数据变化 ${result.changedRows ?? 0}`"
        />
        <Table
          :columns="columns"
          :data-source="result.rows"
          :pagination="{ pageSize: 20 }"
          row-key="rowNumber"
          size="small"
        />
      </Card>
    </div>

    <Modal
      v-if="canQuery"
      v-model:open="historyOpen"
      title="查询导入批次"
      ok-text="查询"
      cancel-text="取消"
      :confirm-loading="loading"
      :ok-button-props="{ disabled: !/^\d{1,19}$/.test(batchNumber.trim()) }"
      @ok="lookup"
    >
      <label for="member-youzan-batch">批次编号</label>
      <Input
        id="member-youzan-batch"
        v-model:value="batchNumber"
        class="mt-2"
        @press-enter="lookup"
      />
    </Modal>
  </Page>
</template>
