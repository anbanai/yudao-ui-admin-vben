<script lang="ts" setup>
import type { MemberLevelApi } from '#/api/member/level';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createLevel, getLevel, updateLevel } from '#/api/member/level';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const formData = ref<MemberLevelApi.Level>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', ['等级'])
    : $t('ui.actionTitle.create', ['等级']);
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 110,
  },
  layout: 'horizontal',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    // 提交表单
    const values = (await formApi.getValues()) as MemberLevelApi.Level & {
      pointTradeGiveMultiplierDisplay: number;
    };
    const data = {
      ...values,
      pointTradeGiveMultiplier: Math.round(
        values.pointTradeGiveMultiplierDisplay * 1000,
      ),
    };
    delete (data as Partial<typeof data>).pointTradeGiveMultiplierDisplay;
    try {
      await (formData.value?.id ? updateLevel(data) : createLevel(data));
      // 关闭并提示
      await modalApi.close();
      emit('success');
      message.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      return;
    }
    // 加载数据
    const data = modalApi.getData() as MemberLevelApi.Level;
    if (!data || !data.id) {
      await formApi.setValues({ pointTradeGiveMultiplierDisplay: 1 });
      return;
    }
    modalApi.lock();
    try {
      formData.value = await getLevel(data.id);
      // 设置到 values
      await formApi.setValues({
        ...formData.value,
        pointTradeGiveMultiplierDisplay:
          (formData.value.pointTradeGiveMultiplier ?? 1000) / 1000,
      });
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-1/2">
    <Form class="mx-4" />
  </Modal>
</template>
