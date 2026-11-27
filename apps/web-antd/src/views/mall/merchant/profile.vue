<script lang="ts" setup>
import type { MerchantWorkbenchApi } from '#/api/merchant/workbench';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Card as ACard, Alert, Button, Descriptions } from 'ant-design-vue';

import { getMerchantShopProfile } from '#/api/merchant/workbench';

const router = useRouter();
const loading = ref(false);
const profile = ref<MerchantWorkbenchApi.ShopProfile>();

async function load() {
  loading.value = true;
  try {
    profile.value = await getMerchantShopProfile();
  } catch {
    profile.value = undefined;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Page auto-content-height>
    <ACard title="店铺资料" :loading="loading" class="profile-card">
      <Descriptions v-if="profile" :column="1" size="small">
        <Descriptions.Item label="店铺名称">
          {{ profile.storeName || '—' }}
        </Descriptions.Item>
        <Descriptions.Item v-if="profile.logoUrl" label="店铺 Logo">
          <img
            :src="profile.logoUrl"
            alt="店铺 Logo"
            class="size-16 object-contain"
          />
        </Descriptions.Item>
        <Descriptions.Item label="店铺简介">
          {{ profile.description || '—' }}
        </Descriptions.Item>
      </Descriptions>
      <Alert v-else-if="!loading" type="error" message="店铺资料加载失败">
        <template #action>
          <Button size="small" @click="load">重试</Button>
        </template>
      </Alert>
    </ACard>
    <ACard
      v-if="
        router
          .resolve('/merchant/sf-settings')
          .matched.some((item) => item.path === '/merchant/sf-settings')
      "
      title="物流设置"
      class="profile-card"
    >
      <RouterLink to="/merchant/sf-settings">顺丰发货设置</RouterLink>
    </ACard>
  </Page>
</template>

<style scoped>
.profile-card {
  max-width: 720px;
  margin: 24px auto;
}
</style>
