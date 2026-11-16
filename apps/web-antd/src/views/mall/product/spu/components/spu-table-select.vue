<!-- SPU 商品选择弹窗组件 -->
<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { MallCategoryApi } from '#/api/mall/product/category';
import type { MallSpuApi } from '#/api/mall/product/spu';

import { computed, nextTick, ref } from 'vue';

import { Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSpuPage } from '#/api/mall/product/spu';

import { useGridFormSchema } from './spu-select-data';
import {
  createSpuSelectionRowsLoader,
  createSpuSelectionSession,
  createSpuSelectionStore,
} from './spu-table-select-utils';

interface SpuTableSelectProps {
  multiple?: boolean; // 是否单选：true - checkbox；false - radio
}

const props = withDefaults(defineProps<SpuTableSelectProps>(), {
  multiple: false,
});

const emit = defineEmits<{
  change: [spu: MallSpuApi.Spu | MallSpuApi.Spu[]];
}>();

const categoryList = ref<MallCategoryApi.Category[]>([]); // 分类列表

/** 弹窗显示状态 */
const visible = ref(false);
const loadSelectionRows = createSpuSelectionRowsLoader();
const selectionSession = createSpuSelectionSession();
const selectionStore = createSpuSelectionStore();
let currentSessionId: number | undefined;

/** 获取当前查询结果 */
function getCurrentSpus() {
  return gridApi.grid.getTableData().fullData as MallSpuApi.Spu[];
}

/** 将当前查询结果的勾选变化同步到弹窗独立状态 */
function handleCheckboxSelectionChange() {
  selectionStore.reconcilePage(
    getCurrentSpus(),
    gridApi.grid.getCheckboxRecords() as MallSpuApi.Spu[],
  );
}

/** 查询、搜索或分页后恢复当前结果中的已选商品 */
async function restoreCheckboxSelection(sessionId = currentSessionId) {
  if (
    sessionId === undefined ||
    !selectionSession.isActive(sessionId) ||
    !props.multiple ||
    !visible.value
  ) {
    return;
  }
  const selectedRows = selectionStore.getSelectedFromPage(getCurrentSpus());
  if (selectedRows.length > 0) {
    await gridApi.grid.setCheckboxRow(selectedRows, true);
  }
}

/** 单选：处理选中变化 */
function handleRadioChange() {
  const selectedRow = gridApi.grid.getRadioRecord() as MallSpuApi.Spu;
  if (selectedRow) {
    emit('change', selectedRow);
    closeModal();
  }
}

/** 搜索表单 Schema */
const formSchema = useGridFormSchema((categories) => {
  categoryList.value = categories;
  gridApi.grid?.refreshColumn();
});

/** 表格列配置 */
const gridColumns = computed<VxeGridProps['columns']>(() => {
  const columns: VxeGridProps['columns'] = [];
  if (props.multiple) {
    columns.push({ type: 'checkbox', width: 55 });
  } else {
    columns.push({ type: 'radio', width: 55 });
  }
  columns.push(
    {
      field: 'id',
      title: '商品编号',
      minWidth: 100,
      align: 'center',
    },
    {
      field: 'picUrl',
      title: '商品图',
      width: 100,
      align: 'center',
      cellRender: {
        name: 'CellImage',
      },
    },
    {
      field: 'name',
      title: '商品名称',
      minWidth: 200,
    },
    {
      field: 'categoryId',
      title: '商品分类',
      minWidth: 120,
      formatter: ({ cellValue }) => {
        const category = categoryList.value?.find((c) => c.id === cellValue);
        return category?.name || '-';
      },
    },
  );
  return columns;
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: formSchema,
    layout: 'horizontal',
    collapsed: false,
  },
  gridOptions: {
    columns: gridColumns.value,
    height: 500,
    border: true,
    checkboxConfig: {
      reserve: true,
    },
    radioConfig: {
      reserve: true,
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    proxyConfig: {
      autoLoad: false,
      ajax: {
        async query({ page }: any, formValues: any) {
          return await getSpuPage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            tabType: 0,
            ...formValues,
          });
        },
      },
    },
  },
  gridEvents: {
    checkboxAll: handleCheckboxSelectionChange,
    checkboxChange: handleCheckboxSelectionChange,
    dataRendered: () => {
      void restoreCheckboxSelection();
    },
    initRendered: () => {
      void restoreCheckboxSelection();
    },
    radioChange: handleRadioChange,
  },
});

/** 打开弹窗 */
async function openModal(data?: MallSpuApi.Spu | MallSpuApi.Spu[]) {
  const sessionId = selectionSession.begin();
  currentSessionId = sessionId;
  selectionStore.replace(props.multiple && Array.isArray(data) ? data : []);
  visible.value = true;
  // 等待 Grid 组件完全初始化后再查询数据
  await nextTick();
  if (selectionSession.isActive(sessionId) && gridApi.grid) {
    await Promise.all([
      gridApi.grid.clearCheckboxRow(),
      gridApi.grid.clearCheckboxReserve(),
      gridApi.grid.clearRadioRow(),
      gridApi.grid.clearRadioReserve(),
    ]);
    if (!selectionSession.isActive(sessionId)) {
      return;
    }
    // 1. 查询完成并渲染表格数据
    const tableData = await loadSelectionRows(
      async () => {
        await gridApi.query();
        await nextTick();
      },
      () => selectionSession.isActive(sessionId),
      () => gridApi.grid.getTableData().fullData as MallSpuApi.Spu[],
    );
    if (!selectionSession.isActive(sessionId)) {
      return;
    }
    // 2. 设置已选中行
    if (props.multiple && Array.isArray(data) && data.length > 0) {
      await restoreCheckboxSelection(sessionId);
    } else if (!props.multiple && data && !Array.isArray(data)) {
      const row = tableData.find((item) => item.id === data.id);
      if (row) {
        await gridApi.grid.setRadioRow(row);
      }
    }
  }
}

/** 关闭弹窗 */
async function closeModal() {
  selectionSession.invalidate();
  currentSessionId = undefined;
  visible.value = false;
  selectionStore.replace([]);
  await Promise.all([
    gridApi.grid.clearCheckboxRow(),
    gridApi.grid.clearCheckboxReserve(),
    gridApi.grid.clearRadioRow(),
    gridApi.grid.clearRadioReserve(),
  ]);
}

/** 确认选择（多选模式） */
function handleConfirm() {
  const selectedRows = selectionStore.getSelected();
  emit('change', selectedRows);
  closeModal();
}

defineExpose({
  open: openModal,
}); // 对外暴露的方法
</script>

<template>
  <Modal
    v-model:open="visible"
    title="选择商品"
    width="950px"
    :destroy-on-close="true"
    :footer="props.multiple ? undefined : null"
    @ok="handleConfirm"
    @cancel="closeModal"
  >
    <Grid />
  </Modal>
</template>
