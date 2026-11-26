<script lang="ts" setup>
import type {
  YouzanCustomerImportPreview,
  YouzanCustomerImportResult,
} from '#/api/member/youzan-import';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';
import { message, Modal } from 'ant-design-vue';
import { ref, watch } from 'vue';

import {
  confirmYouzanCustomerImport,
  downloadYouzanCustomerImportTemplate,
  getYouzanCustomerImportResult,
  previewYouzanCustomerImport,
} from '#/api/member/youzan-import';

const selectedFile = ref<File>();
const preview = ref<YouzanCustomerImportPreview>();
const result = ref<YouzanCustomerImportResult>();
const loading = ref(false);
const merchant = ref('');
const lookupBatchId = ref('');
watch(merchant, () => { preview.value = undefined; result.value = undefined; lookupBatchId.value = ''; });

async function download() {
  downloadFileFromBlobPart({ fileName: '客户测试名单.xlsx', source: await downloadYouzanCustomerImportTemplate() });
}

async function lookup() {
  if (!/^\d+$/.test(lookupBatchId.value)) return;
  loading.value = true;
  try {
    preview.value = undefined;
    result.value = undefined;
    result.value = await getYouzanCustomerImportResult(Number(lookupBatchId.value));
  } finally { loading.value = false; }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0];
  preview.value = undefined;
  result.value = undefined;
}

async function handlePreview() {
  if (!selectedFile.value) {
    message.warning('请先选择有赞客户模板');
    return;
  }
  loading.value = true;
  try {
    preview.value = undefined;
    result.value = undefined;
    preview.value = await previewYouzanCustomerImport(selectedFile.value, merchant.value);
    lookupBatchId.value = String(preview.value.batchId);
  } finally {
    loading.value = false;
  }
}

function handleConfirm() {
  if (!preview.value) return;
  const batchId = preview.value.batchId;
  Modal.confirm({
    title: '确认导入客户积分快照？',
    content: '本操作只保存有赞来源待恢复快照，不会修改会员余额。',
    okText: '确认导入',
    cancelText: '返回检查',
    onOk: async () => {
      loading.value = true;
      try {
        if (preview.value?.batchId !== batchId) return;
        result.value = await confirmYouzanCustomerImport(batchId);
        result.value = await getYouzanCustomerImportResult(result.value.batchId);
        preview.value = undefined;
        message.success('导入批次已完成');
      } finally {
        loading.value = false;
      }
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <a-card title="有赞客户积分导入">
      <a-alert
        class="mb-4"
        type="warning"
        show-icon
        message="导入仅建立待恢复的来源快照，不会直接增加会员积分；用户授权恢复流程保持独立。"
      />
      <div class="mb-4 flex items-center gap-3">
        <a-input v-model:value="merchant" placeholder="已授权的商家编号" :disabled="loading" />
        <a-button @click="download">下载空模板</a-button>
        <input type="file" accept=".xlsx" :disabled="loading" @change="onFileChange" />
        <a-button type="primary" :disabled="!merchant || !selectedFile" :loading="loading" @click="handlePreview">
          上传并预览
        </a-button>
      </div>
      <div class="mb-4 flex items-center gap-3">
        <a-input v-model:value="lookupBatchId" placeholder="批次编号" :disabled="loading" />
        <a-button :disabled="!lookupBatchId || loading" @click="lookup">查询批次结果</a-button>
      </div>
      <template v-if="preview">
        <a-alert
          class="mb-4"
          type="info"
          show-icon
          :message="`有效 ${preview.validCount} 行，需跳过 ${preview.invalidCount} 行；预览批次 ${preview.batchId} 于 ${preview.expiresAt} 过期。`"
        />
        <a-table
          :data-source="preview.rows"
          :pagination="{ pageSize: 20 }"
          :row-key="'rowNumber'"
          :columns="[
            { title: '源行号', dataIndex: 'rowNumber', key: 'rowNumber' },
            { title: '手机号（脱敏）', dataIndex: 'maskedMobile', key: 'maskedMobile' },
            { title: '校验结果', dataIndex: 'outcome', key: 'outcome' },
          ]"
        />
        <a-button type="primary" :loading="loading" @click="handleConfirm">
          确认导入待恢复快照
        </a-button>
      </template>
      <a-result
        v-if="result"
        :status="result.status === 1 ? 'success' : 'info'"
        :title="result.status === 1 ? '客户积分快照已导入' : '批次尚未导入'"
        :sub-title="`批次 ${result.batchId}：新增 ${result.importedRows ?? 0}，重复或已存在 ${result.skippedRows ?? 0}，来源快照变化 ${result.changedRows ?? 0}。余额未被修改。`"
      />
    </a-card>
  </Page>
</template>
