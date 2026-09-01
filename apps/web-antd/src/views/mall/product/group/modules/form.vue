<script lang="ts" setup>
import type { MallProductGroupApi } from '#/api/mall/product/group';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createGroup, getGroup, updateGroup } from '#/api/mall/product/group';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const formData = ref<MallProductGroupApi.Group>();
const title = computed(() =>
  formData.value?.id ? '编辑商品分组' : '新增商品分组',
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    formItemClass: 'col-span-2',
    labelWidth: 90,
  },
  layout: 'horizontal',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    modalApi.lock();
    try {
      const data = (await formApi.getValues()) as MallProductGroupApi.Group;
      await (formData.value?.id ? updateGroup(data) : createGroup(data));
      await modalApi.close();
      emit('success');
      message.success('操作成功');
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      await formApi.resetForm();
      return;
    }
    const data = modalApi.getData() as MallProductGroupApi.Group;
    if (!data?.id) return;
    modalApi.lock();
    try {
      formData.value = await getGroup(data.id);
      await formApi.setValues(formData.value);
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="title" class="w-[520px]">
    <Form class="mx-4" />
  </Modal>
</template>
