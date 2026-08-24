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
const initData = ref<MallSpuApi.Spu | MallSpuApi.Spu[]>();

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
    radioChange: handleRadioChange,
  },
});

/** 打开弹窗 */
async function openModal(data?: MallSpuApi.Spu | MallSpuApi.Spu[]) {
  initData.value = data;
  visible.value = true;
  // 等待 Grid 组件完全初始化后再查询数据
  await nextTick();
  if (gridApi.grid) {
    // 1. 先查询数据
    await gridApi.query();
    // 2. 设置已选中行
    if (props.multiple && Array.isArray(data) && data.length > 0) {
      setTimeout(() => {
        const tableData = gridApi.grid.getTableData().fullData;
        data.forEach((spu) => {
          const row = tableData.find(
            (item: MallSpuApi.Spu) => item.id === spu.id,
          );
          if (row) {
            gridApi.grid.setCheckboxRow(row, true);
          }
        });
      }, 300);
    } else if (!props.multiple && data && !Array.isArray(data)) {
      setTimeout(() => {
        const tableData = gridApi.grid.getTableData().fullData;
        const row = tableData.find(
          (item: MallSpuApi.Spu) => item.id === data.id,
        );
        if (row) {
          gridApi.grid.setRadioRow(row);
        }
      }, 300);
    }
  }
}

/** 关闭弹窗 */
async function closeModal() {
  visible.value = false;
  await gridApi.grid.clearCheckboxRow();
  await gridApi.grid.clearRadioRow();
  initData.value = undefined;
}

/** 确认选择（多选模式） */
function handleConfirm() {
  const selectedRows = gridApi.grid.getCheckboxRecords() as MallSpuApi.Spu[];
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
