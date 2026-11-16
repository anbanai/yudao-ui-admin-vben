<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemMerchantUserApi } from '#/api/system/merchant-user';

import { confirm, Page, useVbenModal } from '@vben/common-ui';
import { DICT_TYPE } from '@vben/constants';
import { getDictLabel } from '@vben/hooks';

import { message } from 'ant-design-vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getMerchantUserPage,
  updateMerchantUserStatus,
} from '#/api/system/merchant-user';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';
import ResetPasswordForm from './modules/reset-password-form.vue';

defineOptions({ name: 'SystemMerchantUser' });

const [ResetPasswordModal, resetPasswordModalApi] = useVbenModal({
  connectedComponent: ResetPasswordForm,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

function handleResetPassword(row: SystemMerchantUserApi.MerchantUser) {
  resetPasswordModalApi.setData(row).open();
}

async function handleStatusChange(
  newStatus: number,
  row: SystemMerchantUserApi.MerchantUser,
): Promise<boolean | undefined> {
  try {
    await confirm(
      `你要将${row.username}的状态切换为【${getDictLabel(DICT_TYPE.COMMON_STATUS, newStatus)}】吗？`,
    );
  } catch {
    return false;
  }
  await updateMerchantUserStatus(row.id, newStatus);
  message.success($t('ui.actionMessage.operationSuccess'));
  return true;
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(handleStatusChange),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getMerchantUserPage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
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
  } as VxeTableGridOptions<SystemMerchantUserApi.MerchantUser>,
});
</script>

<template>
  <Page auto-content-height>
    <ResetPasswordModal @success="handleRefresh" />
    <Grid table-title="商家账号列表">
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '重置密码',
              type: 'link',
              icon: ACTION_ICON.EDIT,
              auth: ['system:merchant-user:update-password'],
              onClick: handleResetPassword.bind(null, row),
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
