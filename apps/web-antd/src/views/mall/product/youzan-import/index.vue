<script setup lang="ts">
import type { Batch } from '#/api/mall/product/youzan-import';

import { computed, onActivated, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

import { Button, Card, Input, Modal, Space, Table } from 'ant-design-vue';

import {
  confirmBatch,
  getAuthorizedYouzanProductMerchants,
  preview,
  result,
  template,
} from '#/api/mall/product/youzan-import';
import ImportUploadCard from '#/components/youzan-import/import-upload-card.vue';

const router = useRouter();
const { hasAccessByCodes } = useAccess();
const canCreateProduct = computed(() =>
  hasAccessByCodes(['product:spu:create']),
);
const merchant = ref('');
const batchId = ref('');
const file = ref<File>();
const batch = ref<Batch>();
const busy = ref(false);
const historyOpen = ref(false);
const labels: Record<string, string> = {
  PENDING: '待补资料',
  ERROR: '错误',
  CONFLICT: '冲突，跳过',
  DUPLICATE: '重复，跳过',
  DIFFERENCE: '有差异，保留商城数据',
};
const rows = computed(() =>
  (batch.value?.lines ?? []).map(({ action, row, before, bindingState }) => ({
    number: row.number,
    key: row.item?.key,
    name: row.item?.name,
    specification: row.item?.specification,
    bindingState,
    reason:
      bindingState === 'BOUND'
        ? '已绑定'
        : (row.error ??
          (action === 'PENDING' && !row.item?.name
            ? '待补资料（缺商品名称）'
            : labels[action])),
    source:
      row.item &&
      `${row.item.cents === null ? '待补价格' : `${(row.item.cents / 100).toFixed(2)} 元`} / ${row.item.stock ?? '待补库存'}`,
    current:
      before &&
      `${before.price === null ? '无' : (before.price / 100).toFixed(2)} 元 / ${before.stock ?? '无'}`,
    hints: Object.entries(row.item?.hints ?? {})
      .map(([key, value]) => `${key}：${value}`)
      .join('；'),
  })),
);
const draftCount = computed(
  () =>
    batch.value?.lines.filter(({ action }) => action === 'PENDING').length ?? 0,
);
const validBatchId = computed(() =>
  /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(batchId.value.trim()),
);

watch([merchant, file], () => {
  batch.value = undefined;
});
watch(merchant, () => {
  batchId.value = '';
});

async function loadMerchants() {
  const merchants = await getAuthorizedYouzanProductMerchants();
  return merchants.map(({ id, name }) => ({
    label: `${name}（#${id}）`,
    value: id,
  }));
}

async function run(action: 'confirm' | 'preview' | 'refresh' | 'result') {
  if (busy.value || !merchant.value) return;
  busy.value = true;
  try {
    if (action === 'preview' && file.value) {
      batch.value = await preview(merchant.value, file.value);
    } else if (action === 'confirm' && batch.value && !batch.value.confirmed) {
      batch.value = await confirmBatch(merchant.value, batch.value.batchId);
    } else if (action === 'result' && validBatchId.value) {
      batch.value = await result(merchant.value, batchId.value.trim());
      historyOpen.value = false;
    } else if (action === 'refresh' && batch.value) {
      batch.value = await result(merchant.value, batch.value.batchId);
    }
    if (batch.value) batchId.value = batch.value.batchId;
  } finally {
    busy.value = false;
  }
}

async function download() {
  downloadFileFromBlobPart({
    fileName: '有赞商品模板.xlsx',
    source: await template(),
  });
}

onActivated(() => {
  if (batch.value?.confirmed) void run('refresh');
});
</script>

<template>
  <Page
    title="有赞商品导入"
    description="导入有赞商品草稿，补齐资料和规格后可手动上架。"
  >
    <template #extra>
      <Space wrap>
        <Button @click="download">下载模板</Button>
        <Button :disabled="!merchant || busy" @click="historyOpen = true">
          查询批次
        </Button>
      </Space>
    </template>

    <div class="flex flex-col gap-4">
      <ImportUploadCard
        v-model:merchant="merchant"
        :busy="busy"
        :file="file"
        :load-options="loadMerchants"
        @file="file = $event"
        @preview="run('preview')"
      />
      <Card v-if="batch" :title="batch.confirmed ? '批次结果' : '预览结果'">
        <template #extra>
          <Button
            v-if="!batch.confirmed"
            type="primary"
            :loading="busy"
            @click="run('confirm')"
          >
            {{ draftCount ? '确认生成草稿' : '确认批次' }}
          </Button>
          <Button v-else :loading="busy" @click="run('refresh')">
            刷新结果
          </Button>
        </template>
        <p class="mb-3">
          批次 {{ batch.batchId }} · {{ rows.length }} 个来源行 ·
          {{ batch.confirmed ? '已生成' : '可生成' }}
          {{ draftCount }} 条规格草稿
        </p>
        <Table
          :data-source="rows"
          row-key="number"
          size="small"
          :scroll="{ x: 1050 }"
        >
          <Table.Column title="原行" data-index="number" />
          <Table.Column title="商品名称" data-index="name" />
          <Table.Column title="规格" data-index="specification" />
          <Table.Column title="来源价 / 库存" data-index="source" />
          <Table.Column title="当前价 / 库存" data-index="current" />
          <Table.Column title="映射参考" data-index="hints" />
          <Table.Column title="处理结果" data-index="reason" />
          <Table.Column v-if="canCreateProduct" title="操作">
            <template #default="{ record }">
              <Button
                v-if="batch.confirmed && record.bindingState === 'UNBOUND'"
                @click="
                  router.push({
                    name: 'ProductSpuAdd',
                    query: {
                      yzBatch: batch.batchId,
                      yzProduct: record.key.product,
                      yzMerchant: merchant,
                    },
                  })
                "
              >
                补资料
              </Button>
            </template>
          </Table.Column>
        </Table>
        <details v-if="batch.unusedColumns.length" class="mt-3 text-sm">
          <summary>查看未导入的列</summary>
          <p class="mt-2">{{ batch.unusedColumns.join('、') }}</p>
        </details>
      </Card>
    </div>

    <Modal
      v-model:open="historyOpen"
      title="查询导入批次"
      ok-text="查询"
      cancel-text="取消"
      :confirm-loading="busy"
      :ok-button-props="{ disabled: !validBatchId }"
      @ok="run('result')"
    >
      <label for="product-youzan-batch">批次编号</label>
      <Input
        id="product-youzan-batch"
        v-model:value="batchId"
        class="mt-2"
        @press-enter="run('result')"
      />
    </Modal>
  </Page>
</template>
