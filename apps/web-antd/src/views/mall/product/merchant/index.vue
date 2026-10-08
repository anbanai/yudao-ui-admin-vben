<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { MallMerchantApi } from '#/api/mall/product/merchant';

import { confirm, Page, useVbenModal } from '@vben/common-ui';

import { message, Tag } from 'ant-design-vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  approveMerchant,
  freezeMerchant,
  getMerchantPage,
  rejectMerchant,
  submitMerchantReview,
  unfreezeMerchant,
} from '#/api/mall/product/merchant';

import { merchantStatusLabel, useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import QualificationPanel from './modules/qualification-panel.vue';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});
const [QualificationPanelModal, qualificationPanelApi] = useVbenModal({
  connectedComponent: QualificationPanel,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: MallMerchantApi.Merchant) {
  formModalApi.setData(row).open();
}

function handleDetail(row: MallMerchantApi.Merchant) {
  qualificationPanelApi.setData(row).open();
}

async function runAction(
  row: MallMerchantApi.Merchant,
  action: () => Promise<unknown>,
  text: string,
) {
  await confirm(`确认${text}商家“${row.name}”吗？`);
  await action();
  message.success(`${text}成功`);
  handleRefresh();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          getMerchantPage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          }),
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<MallMerchantApi.Merchant>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <QualificationPanelModal @success="handleRefresh" />
    <Grid table-title="商家列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新增商家',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              auth: ['product:merchant:create'],
              onClick: handleCreate,
            },
          ]"
        />
      </template>
      <template #status="{ row }">
        <Tag
          :color="
            row.status === 20
              ? 'success'
              : row.status === 40
                ? 'error'
                : 'default'
          "
        >
          {{ merchantStatusLabel(row.status) }}
        </Tag>
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '详情/资质',
              type: 'link',
              icon: ACTION_ICON.VIEW,
              auth: ['product:merchant:query'],
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '编辑',
              type: 'link',
              icon: ACTION_ICON.EDIT,
              auth: ['product:merchant:update'],
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '提交审核',
              type: 'link',
              ifShow: row.status === 0 || row.status === 30,
              auth: ['product:merchant:update'],
              onClick: () =>
                runAction(row, () => submitMerchantReview(row.id!), '提交审核'),
            },
            {
              label: '通过',
              type: 'link',
              ifShow: row.status === 10,
              auth: ['product:merchant:review'],
              onClick: () =>
                runAction(row, () => approveMerchant(row.id!), '审核通过'),
            },
            {
              label: '驳回',
              type: 'link',
              ifShow: row.status === 10,
              auth: ['product:merchant:review'],
              onClick: () =>
                runAction(row, () => rejectMerchant(row.id!), '驳回'),
            },
            {
              label: '冻结',
              type: 'link',
              ifShow: row.status === 20,
              auth: ['product:merchant:review'],
              onClick: () =>
                runAction(row, () => freezeMerchant(row.id!), '冻结'),
            },
            {
              label: '解冻',
              type: 'link',
              ifShow: row.status === 40,
              auth: ['product:merchant:review'],
              onClick: () =>
                runAction(row, () => unfreezeMerchant(row.id!), '解冻'),
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
