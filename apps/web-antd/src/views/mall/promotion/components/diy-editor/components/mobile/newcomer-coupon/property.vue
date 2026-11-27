<script setup lang="ts">
import type { NewcomerCouponProperty } from './config';

import type { MallCouponTemplateApi } from '#/api/mall/promotion/coupon/couponTemplate';

import { ref } from 'vue';

import { useVModel } from '@vueuse/core';
import { Alert, Button, Form, FormItem, Input, message } from 'ant-design-vue';

import { getCouponTemplate } from '#/api/mall/promotion/coupon/couponTemplate';
import CouponSelect from '#/views/mall/promotion/coupon/components/select.vue';

import ComponentContainerProperty from '../../component-container-property.vue';
const props = defineProps<{ modelValue: NewcomerCouponProperty }>();
const emit = defineEmits(['update:modelValue']);
const data = useVModel(props, 'modelValue', emit);
const select = ref<InstanceType<typeof CouponSelect>>();
async function choose(rows: MallCouponTemplateApi.CouponTemplate[]) {
  if (rows.length !== 1) {
    message.error('请选择且仅选择一个新人券模板');
    return;
  }
  const template = await getCouponTemplate(rows[0]!.id);
  if (
    !template ||
    template.status !== 0 ||
    template.takeType !== 1 ||
    !template.newcomerOnly
  ) {
    message.error('模板必须已启用、用户主动领取且开启首页新人券');
    return;
  }
  data.value.templateId = template.id;
}
</script>
<template>
  <ComponentContainerProperty v-model="data.style">
    <Form layout="vertical">
      <Alert
        type="info"
        message="仅向已确认无下单记录的会员展示。微信回访用户可静默识别，领取时校验登录和会员等级。"
        class="mb-3"
      />
      <FormItem label="新人券模板">
        <p>模板编号：{{ data.templateId ?? '未配置' }}</p>
        <div><Button @click="select?.open()">选择模板</Button></div>
        <div>
          <Button @click="data.templateId = undefined">清空模板</Button>
        </div>
      </FormItem>
      <FormItem label="标题"><Input v-model:value="data.title" /></FormItem>
      <FormItem label="领取按钮">
        <Input v-model:value="data.buttonText" />
      </FormItem>
    </Form>
    <CouponSelect ref="select" :take-type="1" @change="choose" />
  </ComponentContainerProperty>
</template>
