<script lang="ts" setup>
import type { SystemMerchantUserApi } from '#/api/system/merchant-user';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { resetMerchantUserPassword } from '#/api/system/merchant-user';
import { $t } from '#/locales';

import { useResetPasswordFormSchema } from '../data';

const emit = defineEmits(['success']);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 80,
  },
  layout: 'horizontal',
  schema: useResetPasswordFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const data = await formApi.getValues();
      await resetMerchantUserPassword(data.id, data.password);
      await modalApi.close();
      emit('success');
      message.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData() as SystemMerchantUserApi.MerchantUser;
    if (!data?.id) {
      return;
    }
    await formApi.setValues({ id: data.id });
  },
});
</script>

<template>
  <Modal title="重置商家账号密码">
    <Form class="mx-4" />
  </Modal>
</template>
