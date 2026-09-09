<script lang="ts" setup>
import type { MallSpuApi } from '#/api/mall/product/spu';
import type {
  PropertyAndValues,
  RuleConfig,
} from '#/views/mall/product/spu/components';

import { computed, ref, watch } from 'vue';

import {
  copyValueToTarget,
  formatToFraction,
  getNestedValue,
  isEmpty,
} from '@vben/utils';

import { Button, Image, Input, InputNumber, message } from 'ant-design-vue';

import { VxeColumn, VxeTable } from '#/adapter/vxe-table';
import { ImageUpload } from '#/components/upload';

import { createEmptySku } from './sku-reconcile';

defineOptions({ name: 'SkuList' });

const props = withDefaults(
  defineProps<{
    batchResetKey?: number;
    isActivityComponent?: boolean; // 是否作为 sku 活动配置组件
    isBatch?: boolean; // 是否作为批量操作组件
    isComponent?: boolean; // 是否作为 sku 选择组件
    isDetail?: boolean; // 是否作为 sku 详情组件
    propertyList?: PropertyAndValues[];
    propFormData?: MallSpuApi.Spu;
    ruleConfig?: RuleConfig[];
  }>(),
  {
    propFormData: () => ({}) as MallSpuApi.Spu,
    propertyList: () => [],
    ruleConfig: () => [],
    isBatch: false,
    isDetail: false,
    isComponent: false,
    isActivityComponent: false,
    batchResetKey: 0,
  },
);

const emit = defineEmits<{
  (e: 'selectionChange', value: MallSpuApi.Sku[]): void;
}>();

const { isBatch, isDetail, isComponent, isActivityComponent } = props;

const formData = computed(() => props.propFormData);
const tableHeaders = computed(() =>
  props.propertyList.map((item) => ({
    id: item.id,
    label: item.name,
  })),
);

function getPropertyValueName(sku: MallSpuApi.Sku, propertyId: number) {
  return sku.properties?.find((property) => property.propertyId === propertyId)
    ?.valueName;
}

function formatDetailMoney(value: null | number | string | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

const skuList = ref<MallSpuApi.Sku[]>([createEmptySku()]);

watch(
  () => props.batchResetKey,
  () => {
    if (props.isBatch) {
      skuList.value = [createEmptySku()];
    }
  },
);

/** 批量添加 */
function batchAdd() {
  validateProperty();
  (formData.value.skus ?? []).forEach((item: MallSpuApi.Sku) => {
    copyValueToTarget(item, skuList.value[0]);
  });
}

/** 校验商品属性属性值 */
function validateProperty() {
  // 校验商品属性属性值是否为空，有一个为空都不给过
  const warningInfo = '存在属性属性值为空，请先检查完善属性值后重试！！！';
  if (formData.value.specType && props.propertyList.length === 0) {
    message.warning(warningInfo);
    throw new Error(warningInfo);
  }
  for (const item of props.propertyList as PropertyAndValues[]) {
    if (!item.values || isEmpty(item.values)) {
      message.warning(warningInfo);
      throw new Error(warningInfo);
    }
  }
}

/** 校验 SKU 数据：保存时，每个商品规格的表单要校验。例如：销售金额最低是 0.01 */
function validateSku() {
  validateProperty();
  const skus = formData.value.skus ?? [];
  if (skus.length === 0) {
    const warningInfo = '至少需要配置一个商品规格。';
    message.warning(warningInfo);
    throw new Error(warningInfo);
  }
  let warningInfo = '请检查商品各行相关属性配置，';
  let validate = true;

  for (const sku of skus) {
    for (const rule of props.ruleConfig as RuleConfig[]) {
      const value = getNestedValue(sku, rule.name);
      if (!rule.rule(value)) {
        validate = false;
        warningInfo += rule.message;
        break;
      }
    }

    if (!validate) {
      message.warning(warningInfo);
      throw new Error(warningInfo);
    }
  }
}

/**
 * 选择时触发
 *
 * @param {object} param0 参数对象
 * @param {MallSpuApi.Sku[]} param0.records 传递过来的选中的 sku 是一个数组
 */
function handleSelectionChange({ records }: { records: MallSpuApi.Sku[] }) {
  emit('selectionChange', records);
}

const activitySkuListRef = ref();

/** 获取 SKU 表格引用 */
function getSkuTableRef() {
  return activitySkuListRef.value;
}

defineExpose({
  validateSku,
  getSkuTableRef,
});
</script>

<template>
  <div class="w-full">
    <!-- 情况一：添加/修改 -->
    <VxeTable
      v-if="!isDetail && !isActivityComponent"
      :data="isBatch ? skuList : formData?.skus || []"
      border
      max-height="500"
      :column-config="{
        resizable: true,
      }"
      :resizable-config="{
        dragMode: 'fixed',
      }"
      size="small"
    >
      <VxeColumn align="center" title="图片" width="120" fixed="left">
        <template #default="{ row }">
          <ImageUpload
            v-model:value="row.picUrl"
            :max-number="1"
            :max-size="2"
            :show-description="false"
          />
        </template>
      </VxeColumn>
      <template v-if="formData?.specType && !isBatch">
        <!-- 根据商品属性动态添加 -->
        <VxeColumn
          v-for="item in tableHeaders"
          :key="item.id"
          :title="item.label"
          align="center"
          fixed="left"
          min-width="80"
        >
          <template #default="{ row }">
            <span class="font-bold text-[#40aaff]">
              {{ getPropertyValueName(row, item.id) }}
            </span>
          </template>
        </VxeColumn>
      </template>
      <VxeColumn align="center" title="商品条码" width="168">
        <template #default="{ row }">
          <Input v-model:value="row.barCode" class="w-full" />
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="销售价" width="168">
        <template #default="{ row }">
          <InputNumber
            v-model:value="row.price"
            :min="0"
            :precision="2"
            :step="0.1"
            class="w-full"
          />
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="市场价" width="168">
        <template #default="{ row }">
          <InputNumber
            v-model:value="row.marketPrice"
            :min="0"
            :precision="2"
            :step="0.1"
            class="w-full"
          />
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="成本价" width="168">
        <template #default="{ row }">
          <InputNumber
            v-model:value="row.costPrice"
            :min="0"
            :precision="2"
            :step="0.1"
            class="w-full"
          />
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="库存" width="168">
        <template #default="{ row }">
          <InputNumber v-model:value="row.stock" :min="0" class="w-full" />
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="重量(kg)" width="168">
        <template #default="{ row }">
          <InputNumber
            v-model:value="row.weight"
            :min="0"
            :precision="2"
            :step="0.1"
            class="w-full"
          />
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="体积(m^3)" width="168">
        <template #default="{ row }">
          <InputNumber
            v-model:value="row.volume"
            :min="0"
            :precision="2"
            :step="0.1"
            class="w-full"
          />
        </template>
      </VxeColumn>
      <template v-if="formData?.subCommissionType">
        <VxeColumn align="center" title="一级返佣(元)" width="168">
          <template #default="{ row }">
            <InputNumber
              v-model:value="row.firstBrokeragePrice"
              :min="0"
              :precision="2"
              :step="0.1"
              class="w-full"
            />
          </template>
        </VxeColumn>
        <VxeColumn align="center" title="二级返佣(元)" width="168">
          <template #default="{ row }">
            <InputNumber
              v-model:value="row.secondBrokeragePrice"
              :min="0"
              :precision="2"
              :step="0.1"
              class="w-full"
            />
          </template>
        </VxeColumn>
      </template>
      <VxeColumn
        v-if="isBatch && formData?.specType"
        align="center"
        fixed="right"
        title="操作"
        width="100"
      >
        <template #default>
          <Button v-if="isBatch" type="link" size="small" @click="batchAdd">
            批量添加
          </Button>
        </template>
      </VxeColumn>
    </VxeTable>

    <!-- 情况二：详情 -->
    <VxeTable
      v-if="isDetail"
      ref="activitySkuListRef"
      :data="formData?.skus || []"
      border
      max-height="500"
      size="small"
      :column-config="{
        resizable: true,
      }"
      :resizable-config="{
        dragMode: 'fixed',
      }"
      :checkbox-config="isComponent ? { reserve: true } : undefined"
      @checkbox-change="handleSelectionChange"
      @checkbox-all="handleSelectionChange"
    >
      <VxeColumn v-if="isComponent" type="checkbox" width="45" fixed="left" />
      <VxeColumn align="center" title="图片" max-width="140" fixed="left">
        <template #default="{ row }">
          <Image
            v-if="row.picUrl"
            :src="row.picUrl"
            class="h-[50px] w-[50px] cursor-pointer"
            :preview="true"
          />
        </template>
      </VxeColumn>
      <template v-if="formData?.specType && !isBatch">
        <!-- 根据商品属性动态添加 -->
        <VxeColumn
          v-for="item in tableHeaders"
          :key="item.id"
          :title="item.label"
          align="center"
          max-width="80"
          fixed="left"
        >
          <template #default="{ row }">
            <span class="font-bold text-[#40aaff]">
              {{ getPropertyValueName(row, item.id) }}
            </span>
          </template>
        </VxeColumn>
      </template>
      <VxeColumn align="center" title="商品条码" width="100">
        <template #default="{ row }">
          {{ row.barCode }}
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="销售价(元)" width="80">
        <template #default="{ row }">
          {{ formatDetailMoney(row.price) }}
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="市场价(元)" width="80">
        <template #default="{ row }">
          {{ formatDetailMoney(row.marketPrice) }}
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="成本价(元)" width="80">
        <template #default="{ row }">
          {{ formatDetailMoney(row.costPrice) }}
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="库存" width="80">
        <template #default="{ row }">
          {{ row.stock }}
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="重量(kg)" width="80">
        <template #default="{ row }">
          {{ row.weight }}
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="体积(m^3)" width="80">
        <template #default="{ row }">
          {{ row.volume }}
        </template>
      </VxeColumn>
      <template v-if="formData?.subCommissionType">
        <VxeColumn align="center" title="一级返佣(元)" width="80">
          <template #default="{ row }">
            {{ formatDetailMoney(row.firstBrokeragePrice) }}
          </template>
        </VxeColumn>
        <VxeColumn align="center" title="二级返佣(元)" width="80">
          <template #default="{ row }">
            {{ formatDetailMoney(row.secondBrokeragePrice) }}
          </template>
        </VxeColumn>
      </template>
    </VxeTable>

    <!-- 情况三：作为活动组件 -->
    <VxeTable
      v-if="isActivityComponent"
      :data="formData?.skus || []"
      border
      max-height="500"
      size="small"
      :column-config="{
        resizable: true,
      }"
      :resizable-config="{
        dragMode: 'fixed',
      }"
    >
      <VxeColumn v-if="isComponent" type="checkbox" width="45" fixed="left" />
      <VxeColumn align="center" title="图片" max-width="140" fixed="left">
        <template #default="{ row }">
          <Image
            :src="row.picUrl"
            class="h-[60px] w-[60px] cursor-pointer"
            :preview="true"
          />
        </template>
      </VxeColumn>
      <template v-if="formData?.specType">
        <!-- 根据商品属性动态添加 -->
        <VxeColumn
          v-for="item in tableHeaders"
          :key="item.id"
          :title="item.label"
          align="center"
          width="80"
          fixed="left"
        >
          <template #default="{ row }">
            <span class="font-bold text-[#40aaff]">
              {{ getPropertyValueName(row, item.id) }}
            </span>
          </template>
        </VxeColumn>
      </template>
      <VxeColumn align="center" title="商品条码" width="100">
        <template #default="{ row }">
          {{ row.barCode }}
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="销售价(元)" width="80">
        <template #default="{ row }">
          {{ formatToFraction(row.price) }}
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="市场价(元)" width="80">
        <template #default="{ row }">
          {{ formatToFraction(row.marketPrice) }}
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="成本价(元)" width="80">
        <template #default="{ row }">
          {{ formatToFraction(row.costPrice) }}
        </template>
      </VxeColumn>
      <VxeColumn align="center" title="库存" width="80">
        <template #default="{ row }">
          {{ row.stock }}
        </template>
      </VxeColumn>
      <!-- 方便扩展每个活动配置的属性不一样  -->
      <slot name="extension"></slot>
    </VxeTable>
  </div>
</template>
