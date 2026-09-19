<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { MallProductGroupApi } from '#/api/mall/product/group';
import type { MallSpuApi } from '#/api/mall/product/spu';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { confirm, DocAlert, Page, useVbenModal } from '@vben/common-ui';
import { ProductSpuStatusEnum } from '@vben/constants';
import { downloadFileFromBlobPart } from '@vben/utils';

import { message, Tabs, Tag } from 'ant-design-vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getGroupLabel,
  getSimpleGroupList,
  getSpuGroupMap,
} from '#/api/mall/product/group';
import {
  deleteSpu,
  exportSpu,
  getSpuPage,
  getTabsCount,
  updateStatus,
} from '#/api/mall/product/spu';
import { $t } from '#/locales';
import SpuGroupModal from '#/views/mall/product/group/modules/spu-group-modal.vue';

import {
  canBatchUpdateStatus,
  createBatchStatusController,
} from './batch-actions';
import { createSpuSelectionStore } from './components/spu-table-select-utils';
import { useGridColumns, useGridFormSchema } from './data';
import InventoryForm from './modules/inventory-form.vue';

const { push } = useRouter();
const route = useRoute();
const tabType = ref(0);
const groupList = ref<MallProductGroupApi.Group[]>([]);
const selection = createSpuSelectionStore();
const selectedCount = ref(0);
const [GroupModal, groupModalApi] = useVbenModal({
  connectedComponent: SpuGroupModal,
  destroyOnClose: true,
});
let groupsLoading: Promise<void> | undefined;

function loadGroups() {
  return (groupsLoading ??= getSimpleGroupList()
    .then((groups) => {
      groupList.value = groups;
    })
    .catch((error) => {
      groupsLoading = undefined;
      throw error;
    }));
}

function groupLabel(id: number) {
  const group = groupList.value.find((item) => item.id === id);
  return group ? getGroupLabel(group) : `分组 #${id}`;
}

function handleSelectionChange() {
  // 分组保留跨页选择，上下架仅操作当前页已勾选的商品。
  selectedProducts.value =
    gridApi.grid.getCheckboxRecords() as MallSpuApi.Spu[];
  selection.reconcilePage(
    gridApi.grid.getTableData().fullData as MallSpuApi.Spu[],
    selectedProducts.value,
  );
  selectedCount.value = selection.getSelected().length;
}

function openGrouping(operation: 'add' | 'remove', row?: MallSpuApi.Spu) {
  const spuIds = (row ? [row] : selection.getSelected()).flatMap((spu) =>
    spu.id ? [spu.id] : [],
  );
  if (spuIds.length === 0 || spuIds.length > 200) {
    message.warning('请选择1至200件商品');
    return;
  }
  groupModalApi.setData({ spuIds, operation }).open();
}

async function clearSelection() {
  selection.replace([]);
  selectedCount.value = 0;
  selectedProducts.value = [];
  await gridApi.grid.clearCheckboxRow();
  await gridApi.grid.clearCheckboxReserve();
}

async function handleGrouped() {
  await clearSelection();
  groupsLoading = undefined;
  await handleRefresh();
}
const selectedProducts = ref<MallSpuApi.Spu[]>([]);
const batchLoading = ref(false);
const canBatchEnable = computed(() =>
  canBatchUpdateStatus(
    selectedProducts.value,
    ProductSpuStatusEnum.ENABLE.status,
  ),
);
const canBatchDisable = computed(() =>
  canBatchUpdateStatus(
    selectedProducts.value,
    ProductSpuStatusEnum.DISABLE.status,
  ),
);

const [InventoryFormModal, inventoryFormModalApi] = useVbenModal({
  connectedComponent: InventoryForm,
  destroyOnClose: true,
});
const tabsData = ref([
  {
    name: '出售中',
    type: 0,
    count: 0,
  },
  {
    name: '仓库中',
    type: 1,
    count: 0,
  },
  {
    name: '已售罄',
    type: 2,
    count: 0,
  },
  {
    name: '警戒库存',
    type: 3,
    count: 0,
  },
  {
    name: '回收站',
    type: 4,
    count: 0,
  },
]);

/** 刷新表格 */
async function handleRefresh() {
  await gridApi.query();
  await getTabCount();
}

function getBatchActionName(targetStatus: number) {
  return targetStatus === ProductSpuStatusEnum.ENABLE.status ? '上架' : '下架';
}

const batchStatusController = createBatchStatusController({
  confirm: (rows, targetStatus) =>
    confirm(
      `确认将选中的 ${rows.length} 件商品批量${getBatchActionName(targetStatus)}吗？`,
    ),
  async onCompleted({ failureCount, successCount }, targetStatus) {
    const actionName = getBatchActionName(targetStatus);
    const resultText = `批量${actionName}完成：成功 ${successCount} 件，失败 ${failureCount} 件`;
    if (failureCount === 0) {
      message.success(resultText);
    } else if (successCount > 0) {
      message.warning(resultText);
    } else {
      message.error(resultText);
    }
    await handleRefresh();
  },
  onLoadingChange: (loading) => {
    batchLoading.value = loading;
  },
  update: updateStatus,
});

/** 批量更新上下架状态 */
async function handleBatchStatusChange(targetStatus: number) {
  const result = await batchStatusController.run(
    selectedProducts.value,
    targetStatus,
  );
  if (result.status === 'invalid') {
    message.warning('请选择 1 至 100 个状态符合要求的商品');
  }
}

/** 导出表格 */
async function handleExport() {
  const data = await exportSpu({
    ...(await gridApi.formApi.getValues()),
    tabType: tabType.value,
  });
  downloadFileFromBlobPart({ fileName: '商品.xls', source: data });
}

/** 获得每个 Tab 的数量 */
async function getTabCount(params?: Record<string, any>) {
  const res = await getTabsCount(params ?? (await gridApi.formApi.getValues()));
  for (const objName in res) {
    const index = Number(objName);
    if (tabsData.value[index]) {
      tabsData.value[index].count = res[objName]!;
    }
  }
}

/** 创建商品 */
function handleCreate() {
  push({ name: 'ProductSpuAdd' });
}

/** 编辑商品 */
function handleEdit(row: MallSpuApi.Spu) {
  push({ name: 'ProductSpuEdit', params: { id: row.id } });
}

/** 删除商品 */
async function handleDelete(row: MallSpuApi.Spu) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
  });
  try {
    await deleteSpu(row.id!);
    message.success($t('ui.actionMessage.deleteSuccess', [row.name]));
    await handleRefresh();
  } finally {
    hideLoading();
  }
}

/** 更新状态 */
async function handleStatusChange(
  newStatus: number,
  row: MallSpuApi.Spu,
): Promise<boolean | undefined> {
  // 二次确认
  const text = newStatus ? '上架' : '下架';
  try {
    await confirm(`确认要${text + row.name}吗?`);
  } catch {
    return false;
  }
  // 更新状态
  await updateStatus({
    id: row.id!,
    status: newStatus,
  });
  // 提示并返回成功
  message.success(`${text}成功`);
  return true;
}

/** 添加到仓库 / 回收站的状态 */
async function handleStatus02Change(row: MallSpuApi.Spu, newStatus: number) {
  const text =
    newStatus === ProductSpuStatusEnum.RECYCLE.status
      ? '加入到回收站'
      : '恢复到仓库';
  await confirm(`确认要"${row.name}"${text}吗？`);
  const hideLoading = message.loading({
    content: `正在${text}中...`,
    duration: 0,
  });
  try {
    await updateStatus({ id: row.id!, status: newStatus });
    message.success(`${text}成功`);
    await handleRefresh();
  } finally {
    hideLoading();
  }
}

/** 查看商品详情 */
function handleDetail(row: MallSpuApi.Spu) {
  push({ name: 'ProductSpuDetail', params: { id: row.id } });
}

/** 管理商品 SKU 库存 */
function handleInventory(row: MallSpuApi.Spu) {
  inventoryFormModalApi.setData(row).open();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(handleStatusChange),
    checkboxConfig: {
      reserve: true,
      checkMethod: ({ row }: { row: MallSpuApi.Spu }) =>
        row.status !== ProductSpuStatusEnum.RECYCLE.status,
    },
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          selectedProducts.value = [];
          await gridApi.grid?.clearCheckboxRow();
          const result = await getSpuPage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            tabType: tabType.value,
            ...formValues,
          });
          const [groupMap] = await Promise.all([
            getSpuGroupMap(
              result.list.flatMap((spu) => (spu.id ? [spu.id] : [])),
            ),
            loadGroups(),
          ]);
          for (const spu of result.list) {
            if (spu.id) spu.groupIds = groupMap[spu.id] ?? [];
          }
          void getTabCount(formValues); // 跟随筛选刷新 tab 数量
          return result;
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<MallSpuApi.Spu>,
  gridEvents: {
    checkboxAll: handleSelectionChange,
    checkboxChange: handleSelectionChange,
    dataRendered: async () => {
      const selected = selection.getSelectedFromPage(
        gridApi.grid.getTableData().fullData as MallSpuApi.Spu[],
      );
      if (selected.length > 0)
        await gridApi.grid.setCheckboxRow(selected, true);
      handleSelectionChange();
    },
  },
});

function onChangeTab(key: any) {
  tabType.value = Number(key);
  gridApi.query();
}

onMounted(async () => {
  // 解析路由的 categoryId
  if (route.query.categoryId) {
    await gridApi.formApi.setValues({
      categoryIds: [Number(route.query.categoryId)],
    });
  }
  // 获得每个 Tab 的数量
  await getTabCount();
});
</script>

<template>
  <Page auto-content-height>
    <GroupModal @success="handleGrouped" />
    <template #doc>
      <DocAlert
        title="【商品】商品 SPU 与 SKU"
        url="https://doc.iocoder.cn/mall/product-spu-sku/"
      />
    </template>

    <InventoryFormModal @success="handleRefresh" />

    <Grid>
      <template #toolbar-actions>
        <Tabs @change="onChangeTab" class="w-full">
          <Tabs.TabPane
            v-for="item in tabsData"
            :key="item.type"
            :tab="`${item.name} (${item.count})`"
          />
        </Tabs>
      </template>
      <template #toolbar-tools>
        <div v-if="selectedCount" class="mr-2">已选 {{ selectedCount }} 件</div>
        <TableAction
          :actions="[
            {
              label: '清空选择',
              ifShow: () => selectedCount > 0,
              onClick: clearSelection,
            },
            {
              label: '批量加入分组',
              auth: ['product:group:update', 'product:spu:update'],
              disabled: selectedCount === 0,
              onClick: () => openGrouping('add'),
            },
            {
              label: '批量移出分组',
              auth: ['product:group:update', 'product:spu:update'],
              disabled: selectedCount === 0,
              onClick: () => openGrouping('remove'),
            },
            {
              label: $t('ui.actionTitle.create', ['商品']),
              type: 'primary',
              icon: ACTION_ICON.ADD,
              auth: ['product:spu:create'],
              onClick: handleCreate,
            },
            {
              label: `批量上架${selectedProducts.length ? ` (${selectedProducts.length})` : ''}`,
              icon: 'lucide:circle-arrow-up',
              auth: ['product:spu:update'],
              disabled: !canBatchEnable || batchLoading,
              loading: batchLoading,
              onClick: () =>
                handleBatchStatusChange(ProductSpuStatusEnum.ENABLE.status),
            },
            {
              label: `批量下架${selectedProducts.length ? ` (${selectedProducts.length})` : ''}`,
              icon: 'lucide:circle-arrow-down',
              auth: ['product:spu:update'],
              disabled: !canBatchDisable || batchLoading,
              loading: batchLoading,
              onClick: () =>
                handleBatchStatusChange(ProductSpuStatusEnum.DISABLE.status),
            },
            {
              label: $t('ui.actionTitle.export'),
              icon: ACTION_ICON.DOWNLOAD,
              auth: ['product:spu:export'],
              onClick: handleExport,
            },
          ]"
        />
      </template>
      <template #groups="{ row }">
        <div v-if="!row.groupIds?.length" class="text-muted-foreground">
          未分组
        </div>
        <Tag v-for="id in row.groupIds" :key="id" class="my-1">
          <span>{{ groupLabel(id) }}</span>
        </Tag>
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '分组',
              type: 'link',
              auth: ['product:group:update', 'product:spu:update'],
              onClick: () => openGrouping('add', row),
            },
            {
              label: $t('common.edit'),
              type: 'link',
              icon: ACTION_ICON.EDIT,
              auth: ['product:spu:update'],
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '库存',
              type: 'link',
              icon: 'lucide:boxes',
              auth: ['product:spu:update'],
              ifShow: () => row.status !== ProductSpuStatusEnum.RECYCLE.status,
              onClick: handleInventory.bind(null, row),
            },
            {
              label: $t('common.detail'),
              type: 'link',
              icon: ACTION_ICON.VIEW,
              onClick: handleDetail.bind(null, row),
            },
            {
              label: $t('common.delete'),
              type: 'link',
              danger: true,
              icon: ACTION_ICON.DELETE,
              auth: ['product:spu:delete'],
              ifShow: () => tabType === 4,
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.name]),
                confirm: handleDelete.bind(null, row),
              },
            },
            {
              label: '恢复',
              type: 'link',
              icon: ACTION_ICON.EDIT,
              auth: ['product:spu:update'],
              ifShow: () => tabType === 4,
              onClick: handleStatus02Change.bind(
                null,
                row,
                ProductSpuStatusEnum.DISABLE.status,
              ),
            },
            {
              label: '回收',
              type: 'link',
              icon: ACTION_ICON.EDIT,
              auth: ['product:spu:update'],
              ifShow: () => tabType !== 4,
              onClick: handleStatus02Change.bind(
                null,
                row,
                ProductSpuStatusEnum.RECYCLE.status,
              ),
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
