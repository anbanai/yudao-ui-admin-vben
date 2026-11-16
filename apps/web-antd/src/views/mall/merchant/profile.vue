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
  getMerchantShopProfile,
  updateMerchantShopProfile,
} from '#/api/merchant/workbench';

const loading = ref(false);
const saving = ref(false);
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
  } finally {
    loading.value = false;
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
  </Page>
</template>

<style scoped>
.profile-card {
  max-width: 720px;
  margin: 24px auto;
}
</style>
