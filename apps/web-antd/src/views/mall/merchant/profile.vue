<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button as AButton,
  Card as ACard,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  Textarea as ATextarea,
  message,
} from 'ant-design-vue';

import {
  getMerchantSfConfig,
  getMerchantShopProfile,
  updateMerchantSfConfig,
  updateMerchantShopProfile,
} from '#/api/merchant/workbench';

const loading = ref(false);
const saving = ref(false);
const sfSaving = ref(false);
const sfLoading = ref(false);
const sfForm = reactive({ monthlyCard: '', monthlyCardMasked: '' });
const form = reactive({
  merchantId: undefined as number | undefined,
  storeName: '',
  logoUrl: '',
  description: '',
});

async function load() {
  loading.value = true;
  try {
    Object.assign(form, await getMerchantShopProfile());
    sfLoading.value = true;
    Object.assign(sfForm, await getMerchantSfConfig());
  } finally {
    loading.value = false;
    sfLoading.value = false;
  }
}

async function save() {
  if (!form.storeName.trim()) {
    message.warning('请输入店铺名称');
    return;
  }
  saving.value = true;
  try {
    await updateMerchantShopProfile({
      ...form,
      storeName: form.storeName.trim(),
    });
    message.success('店铺资料已保存');
  } finally {
    saving.value = false;
  }
}

async function saveSfConfig() {
  if (!sfForm.monthlyCard.trim()) {
    message.warning('请输入顺丰月结卡号');
    return;
  }
  sfSaving.value = true;
  try {
    await updateMerchantSfConfig({ monthlyCard: sfForm.monthlyCard.trim() });
    sfForm.monthlyCard = '';
    const config = await getMerchantSfConfig();
    Object.assign(sfForm, config);
    message.success('顺丰月结卡已保存');
  } finally {
    sfSaving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Page auto-content-height>
    <ACard title="店铺资料" :loading="loading" class="profile-card">
      <AForm layout="vertical" @submit.prevent="save">
        <AFormItem label="店铺名称" required>
          <AInput v-model:value="form.storeName" :maxlength="80" />
        </AFormItem>
        <AFormItem label="店铺 Logo 地址">
          <AInput v-model:value="form.logoUrl" placeholder="https://..." />
        </AFormItem>
        <AFormItem label="店铺简介">
          <ATextarea
            v-model:value="form.description"
            :rows="5"
            :maxlength="500"
            show-count
          />
        </AFormItem>
        <AButton type="primary" :loading="saving" html-type="submit">
          保存
        </AButton>
      </AForm>
    </ACard>
    <ACard title="顺丰月结卡" :loading="sfLoading" class="profile-card">
      <AForm layout="vertical" @submit.prevent="saveSfConfig">
        <AFormItem label="当前卡号">
          <AInput :value="sfForm.monthlyCardMasked || '未配置'" disabled />
        </AFormItem>
        <AFormItem label="月结卡号" required>
          <AInput.Password
            v-model:value="sfForm.monthlyCard"
            placeholder="请输入商家专属顺丰月结卡号"
          />
        </AFormItem>
        <AButton type="primary" :loading="sfSaving" html-type="submit">
          保存月结卡
        </AButton>
      </AForm>
    </ACard>
  </Page>
</template>

<style scoped>
.profile-card {
  max-width: 720px;
  margin: 24px auto;
}
</style>
