<script lang="ts" setup>
import type { MallDeliveryExpressTemplateApi } from '#/api/mall/trade/delivery/expressTemplate';
import type { SystemAreaApi } from '#/api/system/area';

import { nextTick, ref, watch } from 'vue';

import { isNonNegativeNumber } from '@vben/utils';

import { ElInputNumber, ElTreeSelect } from 'element-plus';

import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';

import { useFreesColumns } from '../data';

interface Props {
  items?: MallDeliveryExpressTemplateApi.DeliveryExpressTemplateFree[];
  chargeMode?: number;
  areaTree?: SystemAreaApi.Area[];
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  chargeMode: 1,
  areaTree: () => [],
});

const emit = defineEmits(['update:items']);

const tableData = ref<any[]>([]);
/** 表格配置 */
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useFreesColumns(props.chargeMode),
    data: tableData.value,
    minHeight: 200,
    autoResize: true,
    border: true,
    rowConfig: {
      keyField: 'seq',
      isHover: true,
    },
    pagerConfig: {
      enabled: false,
    },
    toolbarConfig: {
      enabled: false,
    },
  },
});

/** 监听外部传入的数据 */
watch(
  () => props.items,
  async (items) => {
    if (!items) {
      return;
    }
    tableData.value = [...items];
    await nextTick();
    await gridApi.grid.reloadData(tableData.value);
  },
  {
    immediate: true,
  },
);

/** 监听计费方式变化 */
watch(
  () => props.chargeMode,
  () => {
    const columns = useFreesColumns(props.chargeMode);
    if (gridApi.grid && columns) {
      gridApi.grid.reloadColumn(columns);
    }
  },
);

/** 处理新增 */
function handleAdd() {
  const newRow = {
    areaIds: [],
    freeCount: undefined,
    freePrice: undefined,
  };
  tableData.value.push(newRow);
  emit('update:items', [...tableData.value]);
}

/** 处理删除 */
function handleDelete(row: any) {
  const index = tableData.value.findIndex((item) => item.seq === row.seq);
  if (index !== -1) {
    tableData.value.splice(index, 1);
  }
  emit('update:items', [...tableData.value]);
}

/** 处理行数据变更 */
function handleRowChange(row: any) {
  const index = tableData.value.findIndex((item) => item.seq === row.seq);
  if (index === -1) {
    tableData.value.push(row);
  } else {
    tableData.value[index] = row;
  }
  emit('update:items', [...tableData.value]);
}

/** 表单校验 */
function validate() {
  for (let i = 0; i < tableData.value.length; i++) {
    const item = tableData.value[i];
    if (!item.areaIds || item.areaIds.length === 0) {
      throw new Error(`包邮设置第 ${i + 1} 行：区域不能为空`);
    }
    if (!isNonNegativeNumber(item.freeCount)) {
      throw new Error(`包邮设置第 ${i + 1} 行：包邮门槛不能小于 0`);
    }
    if (!isNonNegativeNumber(item.freePrice)) {
      throw new Error(`包邮设置第 ${i + 1} 行：包邮金额不能小于 0`);
    }
  }
}

defineExpose({
  validate,
});
</script>

<template>
  <Grid class="w-full">
    <template #areaIds="{ row }">
      <!-- TODO 芋艿：可优化，使用 Cascade。不过貌似 ele 在 multiple 貌似有 bug！ -->
      <ElTreeSelect
        v-model="row.areaIds"
        :data="areaTree"
        node-key="id"
        :props="{
          label: 'name',
          children: 'children',
        }"
        placeholder="请选择地区"
        class="w-full"
        multiple
        show-checkbox
        collapse-tags
        collapse-tags-tooltip
        :max-collapse-tags="1"
        @change="handleRowChange(row)"
      />
    </template>
    <template #freeCount="{ row }">
      <ElInputNumber
        v-model="row.freeCount"
        :min="0"
        @change="handleRowChange(row)"
        controls-position="right"
        class="!w-full"
      />
    </template>
    <template #freePrice="{ row }">
      <ElInputNumber
        v-model="row.freePrice"
        :min="0"
        :precision="2"
        @change="handleRowChange(row)"
        controls-position="right"
        class="!w-full"
      />
    </template>
    <template #actions="{ row }">
      <TableAction
        :actions="[
          {
            label: '删除',
            type: 'danger',
            link: true,
            popConfirm: {
              title: '确认删除该区域吗？',
              confirm: handleDelete.bind(null, row),
            },
          },
        ]"
      />
    </template>
    <template #bottom>
      <TableAction
        class="mt-2 flex justify-center"
        :actions="[
          {
            label: '添加包邮区域',
            type: 'default',
            onClick: handleAdd,
          },
        ]"
      />
    </template>
  </Grid>
</template>
