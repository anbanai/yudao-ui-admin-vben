<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { MallProductGroupApi } from '#/api/mall/product/group';

import { Page, useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteGroup, getGroupPage } from '#/api/mall/product/group';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import MemberModal from './modules/member-modal.vue';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [MembersModal, membersModalApi] = useVbenModal({
  connectedComponent: MemberModal,
  destroyOnClose: true,
});

function refresh() {
  gridApi.query();
}

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: MallProductGroupApi.Group) {
  formModalApi.setData(row).open();
}

function handleMembers(row: MallProductGroupApi.Group) {
  membersModalApi.setData(row).open();
}

async function handleDelete(row: MallProductGroupApi.Group) {
  await deleteGroup(row.id!);
  message.success($t('ui.actionMessage.deleteSuccess', [row.name]));
  refresh();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          getGroupPage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          }),
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<MallProductGroupApi.Group>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="refresh" />
    <MembersModal />
    <Grid table-title="商品分组列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新增分组',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              auth: ['product:group:create'],
              onClick: handleCreate,
            },
          ]"
        />
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '成员管理',
              type: 'link',
              icon: ACTION_ICON.VIEW,
              auth: ['product:group:query'],
              onClick: () => handleMembers(row),
            },
            {
              label: $t('common.edit'),
              type: 'link',
              icon: ACTION_ICON.EDIT,
              auth: ['product:group:update'],
              onClick: () => handleEdit(row),
            },
            {
              label: $t('common.delete'),
              type: 'link',
              danger: true,
              icon: ACTION_ICON.DELETE,
              auth: ['product:group:delete'],
              popConfirm: {
                title: `确认删除分组“${row.name}”？非空分组无法删除。`,
                confirm: () => handleDelete(row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
