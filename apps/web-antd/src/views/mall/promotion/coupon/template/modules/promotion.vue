<script setup lang="ts">
import type { MallCouponTemplateApi } from '#/api/mall/promotion/coupon/couponTemplate';
import type { CouponPromotion } from '#/api/mall/promotion/coupon/promotion';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, Input, message } from 'ant-design-vue';

import { createCouponPromotion } from '#/api/mall/promotion/coupon/promotion';
const template = ref<MallCouponTemplateApi.CouponTemplate>();
const source = ref('admin');
const channel = ref('miniapp');
const result = ref<CouponPromotion>();
let key = '';
const [Modal, modalApi] = useVbenModal({
  confirmText: '生成推广内容',
  onOpenChange(open: boolean) {
    if (open) {
      template.value =
        modalApi.getData() as MallCouponTemplateApi.CouponTemplate;
      result.value = undefined;
      key = crypto.randomUUID();
      source.value = 'admin';
      channel.value = 'miniapp';
    }
  },
  async onConfirm() {
    if (!template.value || result.value) return;
    modalApi.lock();
    try {
      result.value = await createCouponPromotion({
        templateId: template.value.id,
        source: source.value,
        channel: channel.value,
        idempotencyKey: key,
      });
    } finally {
      modalApi.unlock();
    }
  },
});
async function copyPath() {
  try {
    await navigator.clipboard.writeText(result.value!.miniProgramPath);
    message.success('已复制小程序路径');
  } catch {
    message.warning('自动复制失败，请手动选中路径复制');
  }
}
</script>
<template>
  <Modal title="优惠券推广">
    <div class="space-y-3">
      <p>模板：{{ template?.name }}</p>
      <div>
        <p>来源</p>
        <Input
          v-model:value="source"
          aria-label="推广来源"
          :disabled="!!result"
          :maxlength="64"
        />
      </div>
      <div>
        <p>渠道</p>
        <Input
          v-model:value="channel"
          aria-label="推广渠道"
          :disabled="!!result"
          :maxlength="64"
        />
      </div>
      <template v-if="result">
        <p>推广码：{{ result.shortCode }}</p>
        <p>小程序路径</p>
        <Input.TextArea :value="result.miniProgramPath" readonly :rows="3" />
        <Button @click="copyPath">复制路径</Button>
        <p>使用此路径制作小程序链接或卡片，沿用小程序现有分享入口。</p>
      </template>
    </div>
  </Modal>
</template>
