<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { MallProductGroupApi } from '#/api/mall/product/group';
import type { MallSpuApi } from '#/api/mall/product/spu';

import { computed, reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { CommonStatusEnum } from '@vben/constants';

import { Button, InputNumber, message } from 'ant-design-vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  addGroupSpus,
  getGroupSpuPage,
  removeGroupSpus,
  updateGroupSpuSort,
} from '#/api/mall/product/group';
import { SpuTableSelect } from '#/views/mall/product/spu/components';

import { useMemberGridColumns, useMemberGridFormSchema } from '../data';
import {
  buildGroupMemberBatchRequest,
  mergeGroupMemberCandidates,
} from '../member-utils';

type GroupMember = Omit<MallSpuApi.Spu, 'id'> & {
  groupSort?: number;
  id: number;
};

const group = ref<MallProductGroupApi.Group>();
const selectorRef = ref<InstanceType<typeof SpuTableSelect>>();
const sortDraft = reactive<Record<number, number>>({});
const title = computed(() => `分组成员 - ${group.value?.name || ''}`);

function refresh() {
  gridApi.query();
}

function currentRows() {
  return gridApi.grid.getTableData().fullData as GroupMember[];
}

function openSelector() {
  selectorRef.value?.open(currentRows());
}

async function handleSelected(selected: MallSpuApi.Spu | MallSpuApi.Spu[]) {
  if (!group.value?.id || !Array.isArray(selected)) return;
  const spuIds = mergeGroupMemberCandidates(
    selected,
    currentRows().flatMap((spu) => (spu.id ? [spu.id] : [])),
  );
  if (spuIds.length === 0) {
    message.info('所选商品已在当前分组中');
    return;
  }
  await addGroupSpus(buildGroupMemberBatchRequest(group.value.id, spuIds));
  message.success('商品已加入分组');
  refresh();
}

async function removeMembers(rows: GroupMember[]) {
  if (!group.value?.id) return;
  const spuIds = rows.flatMap((spu) => (spu.id ? [spu.id] : []));
  if (spuIds.length === 0) return;
  await removeGroupSpus(buildGroupMemberBatchRequest(group.value.id, spuIds));
  message.success('商品已移出分组');
  refresh();
}

async function removeSelected() {
  await removeMembers(gridApi.grid.getCheckboxRecords() as GroupMember[]);
}

async function saveSort(row: GroupMember) {
  if (!group.value?.id || !row.id) return;
  await updateGroupSpuSort({
    groupId: group.value.id,
    spuId: row.id,
    sort: sortDraft[row.id] ?? row.groupSort ?? 0,
  });
  message.success('组内排序已保存');
  refresh();
}

const [Modal, modalApi] = useVbenModal({
  onOpenChange(isOpen) {
    if (!isOpen) {
      group.value = undefined;
      return;
    }
    group.value = modalApi.getData() as MallProductGroupApi.Group;
    refresh();
  },
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useMemberGridFormSchema() },
  gridOptions: {
    columns: useMemberGridColumns(),
    height: 560,
    proxyConfig: {
      autoLoad: false,
      ajax: {
        query: async ({ page }, formValues) => {
          if (!group.value?.id) return { list: [], total: 0 };
          const result = await getGroupSpuPage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            groupId: group.value.id,
            ...formValues,
          });
          for (const row of result.list) {
            if (row.id) sortDraft[row.id] = row.groupSort ?? 0;
          }
          return result;
        },
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<GroupMember>,
});
</script>

<template>
  <Modal :title="title" class="w-4/5" :footer="false">
    <Grid table-title="分组商品">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '添加商品',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              auth: ['product:group:update'],
              disabled: group?.status !== CommonStatusEnum.ENABLE,
              onClick: openSelector,
            },
            {
              label: '批量移除',
              danger: true,
              auth: ['product:group:update'],
              onClick: removeSelected,
            },
          ]"
        />
      </template>
      <template #sort="{ row }">
        <div class="flex items-center gap-2">
          <InputNumber
            v-model:value="sortDraft[row.id]"
            :min="0"
            class="w-20"
            size="small"
          />
          <Button type="link" size="small" @click="saveSort(row)">保存</Button>
        </div>
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '移除',
              type: 'link',
              danger: true,
              auth: ['product:group:update'],
              popConfirm: {
                title: `确认将“${row.name}”移出当前分组？`,
                confirm: () => removeMembers([row]),
              },
            },
          ]"
        />
      </template>
    </Grid>
    <SpuTableSelect ref="selectorRef" multiple @change="handleSelected" />
  </Modal>
</template>
