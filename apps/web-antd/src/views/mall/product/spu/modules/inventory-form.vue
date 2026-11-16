<script lang="ts" setup>
import type { MallSpuApi } from '#/api/mall/product/spu';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Alert, Image, InputNumber, message, Table, Tag } from 'ant-design-vue';

import { getSpu, updateSpu } from '#/api/mall/product/spu';

import {
  buildStockUpdatePayload,
  createStockDraft,
  getChangedStockValues,
  getSkuDisplayName,
  getStockChangeSummary,
} from '../inventory-utils';

const emit = defineEmits<{
  success: [];
}>();

const product = ref<MallSpuApi.Spu>();
const stockDraft = ref<Record<number, number>>({});

const skuRows = computed(() =>
  (product.value?.skus ?? []).filter(
    (sku): sku is MallSpuApi.Sku & { id: number } => sku.id !== undefined,
  ),
);
const summary = computed(() =>
  product.value
    ? getStockChangeSummary(product.value, stockDraft.value)
    : { changeCount: 0, stockDelta: 0, totalStock: 0 },
);
const title = computed(() =>
  product.value?.name ? `库存管理 · ${product.value.name}` : '库存管理',
);

const columns = [
  { key: 'picUrl', title: '图片', width: 76 },
  { key: 'specification', title: '商品规格' },
  { dataIndex: 'barCode', key: 'barCode', title: '商品条码', width: 160 },
  { key: 'currentStock', title: '当前库存', width: 110 },
  { key: 'nextStock', title: '调整后库存', width: 170 },
];

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!product.value) return;
    if (summary.value.changeCount === 0) {
      message.info('库存没有变化');
      await modalApi.close();
      return;
    }

    const changeCount = summary.value.changeCount;
    const changedStock = getChangedStockValues(product.value, stockDraft.value);
    try {
      buildStockUpdatePayload(product.value, changedStock);
    } catch (error) {
      message.warning(
        error instanceof Error ? error.message : '请检查库存输入',
      );
      return;
    }

    modalApi.lock();
    try {
      const latestProduct = await getSpu(product.value.id!);
      let payload: MallSpuApi.Spu;
      try {
        payload = buildStockUpdatePayload(latestProduct, changedStock);
      } catch (error) {
        if (error instanceof Error && error.message === '商品规格不存在') {
          product.value = latestProduct;
          stockDraft.value = createStockDraft(latestProduct);
          message.warning('商品规格已发生变化，请重新调整库存');
          return;
        }
        throw error;
      }
      await updateSpu(payload);
      await modalApi.close();
      message.success(`已更新 ${changeCount} 个规格的库存`);
      emit('success');
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      product.value = undefined;
      stockDraft.value = {};
      return;
    }

    const row = modalApi.getData() as MallSpuApi.Spu;
    if (!row?.id) {
      message.error('商品详情加载失败，请稍后重试');
      await modalApi.close();
      return;
    }
    modalApi.lock();
    try {
      product.value = await getSpu(row.id);
      stockDraft.value = createStockDraft(product.value);
    } catch {
      product.value = undefined;
      stockDraft.value = {};
      message.error('商品详情加载失败，请稍后重试');
      await modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="title" class="w-[820px]">
    <div class="space-y-4 px-1">
      <Alert
        message="保存后库存立即生效，请填写非负整数库存。"
        show-icon
        type="info"
      />

      <div
        v-if="product"
        class="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border pb-4"
      >
        <Image
          :height="48"
          :preview="false"
          :src="product.picUrl"
          :width="48"
          class="shrink-0 rounded"
        />
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium text-foreground">
            {{ product.name }}
          </div>
          <div class="mt-1 text-xs text-muted-foreground">
            商品编号 {{ product.id }} · {{ skuRows.length }} 个规格
          </div>
        </div>
        <div class="flex items-center gap-5 text-sm">
          <div>
            <span class="text-muted-foreground">调整后总库存</span>
            <strong class="ml-2 text-base">{{ summary.totalStock }}</strong>
          </div>
          <div>
            <span class="text-muted-foreground">库存变化</span>
            <Tag
              class="ml-2"
              :color="
                summary.stockDelta > 0
                  ? 'green'
                  : summary.stockDelta < 0
                    ? 'red'
                    : 'default'
              "
            >
              {{ summary.stockDelta > 0 ? '+' : '' }}{{ summary.stockDelta }}
            </Tag>
          </div>
        </div>
      </div>

      <Table
        :columns="columns"
        :data-source="skuRows"
        :pagination="false"
        :row-key="(record: MallSpuApi.Sku) => record.id!"
        :scroll="{ y: 420 }"
        size="small"
      >
        <template #emptyText>
          <div class="py-8 text-muted-foreground">暂无可维护的商品规格</div>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'picUrl'">
            <Image
              :height="40"
              :preview="false"
              :src="record.picUrl || product?.picUrl"
              :width="40"
              class="rounded"
            />
          </template>
          <template v-else-if="column.key === 'specification'">
            <div class="flex items-center gap-2">
              <IconifyIcon
                class="shrink-0 text-muted-foreground"
                icon="lucide:package"
              />
              <span>{{ getSkuDisplayName(record) }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'currentStock'">
            <span class="tabular-nums">{{ record.stock ?? 0 }}</span>
          </template>
          <template v-else-if="column.key === 'nextStock'">
            <div class="flex items-center gap-2">
              <InputNumber
                v-model:value="stockDraft[record.id]"
                :min="0"
                :precision="0"
                class="w-[120px]"
              />
              <span class="text-muted-foreground">件</span>
            </div>
          </template>
        </template>
      </Table>

      <div class="text-right text-sm text-muted-foreground">
        已修改 {{ summary.changeCount }} 个规格
      </div>
    </div>
  </Modal>
</template>
