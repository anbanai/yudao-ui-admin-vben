<script lang="ts" setup>
import type { MallTradeConfigApi } from '#/api/mall/trade/config';

import { onMounted, ref } from 'vue';

import { DocAlert, Page } from '@vben/common-ui';
import { fenToYuan, yuanToFen } from '@vben/utils';

import { ElCard, ElMessage, ElTabPane, ElTabs } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { getTradeConfig, saveTradeConfig } from '#/api/mall/trade/config';
import { $t } from '#/locales';

import { schema } from './data';
import { setTradeConfigTab } from './utils';

const activeKey = ref('afterSale');
const formData = ref<MallTradeConfigApi.Config & { type?: string }>();
const loading = ref(true);

/** 获取配置 */
async function getConfigInfo() {
  loading.value = true;
  try {
    const res = await getTradeConfig();
    if (!res) {
      return;
    }
    const nextFormData = setTradeConfigTab(res, activeKey.value);
    if (!nextFormData) {
      return;
    }
    formData.value = nextFormData;
    // 转换金额单位
    formData.value.deliveryExpressFreePrice = Number.parseFloat(
      fenToYuan(formData.value.deliveryExpressFreePrice!),
    );
    formData.value.brokerageWithdrawMinPrice = Number.parseFloat(
      fenToYuan(formData.value.brokerageWithdrawMinPrice!),
    );
    // 设置到 values
    await formApi.setValues(formData.value);
    await formApi.setFieldValue('type', activeKey.value);
    formApi.updateSchema(schema);
  } catch {
    ElMessage.error('交易配置加载失败，请刷新重试');
  } finally {
    loading.value = false;
  }
}

/** 切换 Tab */
async function handleTabChange(key: number | string) {
  activeKey.value = String(key);
  const nextFormData = setTradeConfigTab(formData.value, activeKey.value);
  if (!nextFormData) {
    return;
  }
  formData.value = nextFormData;
  await formApi.setFieldValue('type', activeKey.value);
  formApi.updateSchema(schema);
}

/** 提交表单 */
async function handleSubmit() {
  const { valid } = await formApi.validate();
  if (!valid) {
    return;
  }
  // 提交表单
  const data = (await formApi.getValues()) as MallTradeConfigApi.Config;
  // 转换金额单位
  data.deliveryExpressFreePrice = yuanToFen(data.deliveryExpressFreePrice!);
  data.brokerageWithdrawMinPrice = yuanToFen(data.brokerageWithdrawMinPrice!);
  await saveTradeConfig(data);
  ElMessage.success($t('ui.actionMessage.operationSuccess'));
}

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 150,
  },
  layout: 'horizontal',
  handleSubmit,
  schema,
});

/** 初始化 */
onMounted(() => {
  getConfigInfo();
});
</script>

<template>
  <Page>
    <template #doc>
      <DocAlert
        title="【交易】交易订单"
        url="https://doc.iocoder.cn/mall/trade-order/"
      />
      <DocAlert
        title="【交易】购物车"
        url="https://doc.iocoder.cn/mall/trade-cart/"
      />
    </template>
    <ElCard v-loading="loading">
      <ElTabs :model-value="activeKey" @tab-change="handleTabChange">
        <ElTabPane
          label="售后"
          name="afterSale"
          :force-render="true"
          :disabled="loading || !formData"
        />
        <ElTabPane
          label="配送"
          name="delivery"
          :force-render="true"
          :disabled="loading || !formData"
        />
        <ElTabPane
          label="分销"
          name="brokerage"
          :force-render="true"
          :disabled="loading || !formData"
        />
        <ElTabPane
          label="客服"
          name="kefu"
          :force-render="true"
          :disabled="loading || !formData"
        />
      </ElTabs>
      <Form class="w-2/5" />
    </ElCard>
  </Page>
</template>
