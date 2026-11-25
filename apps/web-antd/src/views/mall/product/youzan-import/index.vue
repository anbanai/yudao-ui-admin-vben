<script setup lang="ts">
import type { Batch } from '#/api/mall/product/youzan-import';
import { computed, onActivated, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';
import { Alert, Button, Card, Input, Space, Table } from 'ant-design-vue';
import { confirmBatch, preview, result, template } from '#/api/mall/product/youzan-import';

const router = useRouter();
const merchant = ref('');
const batchId = ref('');
const file = ref<File>();
const batch = ref<Batch>();
const busy = ref(false);
const labels: Record<string, string> = { PENDING: '待补资料', ERROR: '错误', CONFLICT: '冲突，不写入', DUPLICATE: '重复，跳过', DIFFERENCE: '差异，不覆盖' };
const rows = computed(() => (batch.value?.lines ?? []).map(({ action, row, before, bindingState }) => ({
  number: row.number, key: row.item?.key, name: row.item?.name, specification: row.item?.specification,
  bindingState, reason: bindingState === 'BOUND' ? '已绑定' : row.error ?? (action === 'PENDING' && !row.item?.name ? '待补资料：缺商品名称' : labels[action]),
  source: row.item && `${row.item.cents == null ? '待补价格' : (row.item.cents / 100).toFixed(2) + ' 元'} / ${row.item.stock ?? '待补库存'}`,
  current: before && `${before.price == null ? '无' : (before.price / 100).toFixed(2)} 元 / ${before.stock ?? '无'}`,
  hints: Object.entries(row.item?.hints ?? {}).map(([key, value]) => `${key}：${value}`).join('；'),
})));
watch(merchant, () => { batch.value = undefined; batchId.value = ''; });
async function run(action: 'confirm' | 'preview' | 'result') {
  if (busy.value) return;
  busy.value = true;
  const saved = batch.value;
  batch.value = undefined;
  try {
    if (action === 'confirm' && saved && !saved.confirmed) batch.value = await confirmBatch(merchant.value, saved.batchId);
    if (action === 'preview' && file.value) batch.value = await preview(merchant.value, file.value);
    if (action === 'result') batch.value = await result(merchant.value, batchId.value);
    if (batch.value) batchId.value = batch.value.batchId;
  } finally { busy.value = false; }
}
function pick(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0];
  batch.value = undefined;
}
onActivated(() => { if (batch.value?.confirmed && !busy.value) void run('result'); });
async function download() { downloadFileFromBlobPart({ fileName: '有赞商品模板.xlsx', source: await template() }); }
</script>
<template>
  <Page title="有赞商品导入"><Card>
    <Alert message="确认只建立待补资料草稿。已有规格的价格和库存不会修改；商品不会自动上架。" type="info" />
    <Space wrap class="my-4">
      <Input v-model:value="merchant" placeholder="已授权的商家编号" :disabled="busy" />
      <Button @click="download">下载空模板</Button>
      <input type="file" accept=".xlsx" :disabled="busy" @change="pick" />
      <Button :disabled="!merchant || !file || busy" @click="run('preview')">上传并预览</Button>
      <Button type="primary" :disabled="!batch || batch.confirmed || busy" @click="run('confirm')">明确确认此批次</Button>
    </Space>
    <Space><Input v-model:value="batchId" placeholder="批次编号" :disabled="busy" @change="batch = undefined" />
      <Button :disabled="!merchant || !batchId || busy" @click="run('result')">查询批次结果</Button></Space>
    <template v-if="batch">
      <p>{{ batch.confirmed ? '已确认' : '未确认' }} · {{ rows.length }} 个来源行 · 未使用列：{{ batch.unusedColumns.join('、') }}</p>
      <Table :data-source="rows" row-key="number" size="small" :scroll="{ x: 1050 }">
        <Table.Column title="原行" data-index="number" /><Table.Column title="商品名称" data-index="name" />
        <Table.Column title="规格" data-index="specification" /><Table.Column title="来源价 / 库存" data-index="source" />
        <Table.Column title="当前价 / 库存" data-index="current" /><Table.Column title="映射参考" data-index="hints" />
        <Table.Column title="处理结果" data-index="reason" /><Table.Column title="操作"><template #default="{ record }">
          <Button v-if="batch.confirmed && record.bindingState === 'UNBOUND'" @click="router.push({ name: 'ProductSpuAdd', query: { yzBatch: batch.batchId, yzProduct: record.key.product, yzMerchant: merchant } })">补资料</Button>
        </template></Table.Column>
      </Table>
    </template>
  </Card></Page>
</template>
