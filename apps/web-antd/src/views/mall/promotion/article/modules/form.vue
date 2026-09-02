<script lang="ts" setup>
import type { MallArticleApi } from '#/api/mall/promotion/article';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createArticle,
  getArticle,
  updateArticle,
} from '#/api/mall/promotion/article';
import { $t } from '#/locales';
import { SpuShowcase } from '#/views/mall/product/spu/components';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);

const editingId = ref<number>();
const getTitle = computed(() => {
  return editingId.value
    ? $t('ui.actionTitle.edit', ['文章'])
    : $t('ui.actionTitle.create', ['文章']);
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 120,
  },
  wrapperClass: 'grid-cols-2',
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
    const data = {
      ...(await formApi.getValues()),
      id: editingId.value,
    } as MallArticleApi.Article;
    try {
      await (editingId.value ? updateArticle(data) : createArticle(data));
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
      editingId.value = undefined;
      await formApi.reset();
      return;
    }
    // 加载数据
    const data = modalApi.getData() as MallArticleApi.Article;
    if (!data || !data.id) {
      editingId.value = undefined;
      await formApi.reset();
      return;
    }
    modalApi.lock();
    try {
      const result = await getArticle(data.id);
      editingId.value = result.id;
      // 设置到 values
      await formApi.setValues(result);
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-2/5" :close-on-click-modal="false">
    <Form class="mx-4">
      <!-- 自定义插槽：商品选择 -->
      <template #spuId="slotProps">
        <SpuShowcase v-bind="slotProps.componentField" :limit="1" />
      </template>
    </Form>
  </Modal>
</template>
