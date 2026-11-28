<script setup lang="ts">
import type { MallDiyPageApi } from '#/api/mall/promotion/diy/page';
import type { TabBarProperty } from '#/views/mall/promotion/components/diy-editor/components/mobile/tab-bar/config';

import { onMounted, ref, unref } from 'vue';
import { useRoute } from 'vue-router';

import { message } from 'ant-design-vue';

import {
  getDiyPageProperty,
  updateDiyPageProperty,
} from '#/api/mall/promotion/diy/page';
import { getDiyTemplateProperty } from '#/api/mall/promotion/diy/template';
import { DiyEditor, PAGE_LIBS } from '#/views/mall/promotion/components';
import { prepareDiyCarouselRatios } from '#/views/mall/promotion/components/diy-editor/components/mobile/carousel/ratio';
import { normalizeMallDiyAssetUrls } from '#/views/mall/promotion/components/diy-editor/static-assets';

/** 装修页面表单 */
defineOptions({ name: 'DiyPageDecorate' });

const route = useRoute();

const formData = ref<MallDiyPageApi.DiyPage>();
const memberTabBar = ref<TabBarProperty>();

/** 获取详情 */
async function getPageDetail(id: any) {
  const hideLoading = message.loading({
    content: '加载中...',
    duration: 0,
  });
  try {
    formData.value = await getDiyPageProperty(id);
  } finally {
    hideLoading();
  }
}

/** 提交表单 */
async function submitForm() {
  const data = unref(formData);
  if (!data || saving) return;
  saving = true;
  const hideLoading = message.loading({
    content: '保存中...',
    duration: 0,
  });
  try {
    await updateDiyPageProperty({
      ...data,
      property: await prepareDiyCarouselRatios(data.property),
    });
    message.success('保存成功');
  } finally {
    saving = false;
    hideLoading();
  }
}

let saving = false;

/** 初始化 */
onMounted(async () => {
  if (!route.params.id) {
    message.warning('参数错误，页面编号不能为空！');
    return;
  }
  formData.value = {} as MallDiyPageApi.DiyPage;
  await getPageDetail(route.params.id);
  if (formData.value?.templateId && formData.value.name === '我的') {
    const template = await getDiyTemplateProperty(formData.value.templateId);
    const property = template.property;
    const config =
      typeof property === 'string' ? JSON.parse(property) : property;
    memberTabBar.value = normalizeMallDiyAssetUrls(config?.tabBar);
  }
});
</script>
<template>
  <DiyEditor
    v-if="formData?.id"
    v-model="formData!.property"
    :title="formData!.name"
    :member-center="!!formData.templateId && formData.name === '我的'"
    :member-tab-bar="memberTabBar"
    :libs="PAGE_LIBS"
    @save="submitForm"
  />
</template>
