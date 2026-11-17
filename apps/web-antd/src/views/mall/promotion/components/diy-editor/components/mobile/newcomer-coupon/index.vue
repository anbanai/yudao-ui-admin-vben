<script setup lang="ts">
import type { NewcomerCouponProperty } from './config';

import type { MallCouponTemplateApi } from '#/api/mall/promotion/coupon/couponTemplate';

import { ref, watch } from 'vue';

import { getCouponTemplate } from '#/api/mall/promotion/coupon/couponTemplate';
const props = defineProps<{ property: NewcomerCouponProperty }>();
const template = ref<MallCouponTemplateApi.CouponTemplate>();
const error = ref('');
watch(
  () => props.property.templateId,
  async (id, _, onCleanup) => {
    let active = true;
    onCleanup(() => {
      active = false;
    });
    template.value = undefined;
    error.value = '';
    if (!id) return;
    try {
      const result = await getCouponTemplate(id);
      if (!active) return;
      if (
        !result ||
        result.status !== 0 ||
        result.takeType !== 1 ||
        !result.newcomerOnly
      ) {
        error.value = '新人券模板不可用';
        return;
      }
      template.value = result;
    } catch {
      if (active) error.value = '模板加载失败';
    }
  },
  { immediate: true },
);
</script>
<template>
  <div class="m-2 rounded-lg bg-orange-50 p-4">
    <h3 class="font-bold">{{ property.title }}</h3>
    <p v-if="template">
      {{ template.name }} ·
      {{ template.couponType === 2 ? '商品兑换券' : '新人专享优惠券' }}
    </p>
    <p v-else>
      {{ error || (property.templateId ? '正在读取模板' : '请选择新人券模板') }}
    </p>
    <p class="mt-2 text-orange-600">{{ property.buttonText }}</p>
  </div>
</template>
