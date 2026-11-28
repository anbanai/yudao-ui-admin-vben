<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { Alert, Button, Form, FormItem, Modal, Select } from 'ant-design-vue';

import { getSimpleBrandList } from '#/api/mall/product/brand';
import { getAuthorizedYouzanProductMerchants } from '#/api/mall/product/youzan-import';

defineProps<{ busy: boolean }>();
const emit = defineEmits<{
  close: [];
  publish: [merchant: string, brand: number];
}>();
const merchant = ref<string>();
const brand = ref<number>();
const merchants = ref<{ label: string; value: string }[]>([]);
const brands = ref<{ label: string; value: number }[]>([]);
const loading = ref(false);
const error = ref('');
let request = 0;

async function loadMerchants() {
  loading.value = true;
  error.value = '';
  try {
    const available = await getAuthorizedYouzanProductMerchants();
    merchants.value = available.map(({ id, name }) => ({
      label: `${name}（#${id}）`,
      value: id,
    }));
  } catch {
    error.value = '商家列表加载失败';
  } finally {
    loading.value = false;
  }
}

async function chooseMerchant(id: string) {
  const current = ++request;
  merchant.value = id;
  brand.value = undefined;
  brands.value = [];
  error.value = '';
  loading.value = true;
  try {
    const available = await getSimpleBrandList({ merchantId: id });
    if (current === request)
      brands.value = available.flatMap(({ id, name }) =>
        id === null || id === undefined ? [] : [{ label: name, value: id }],
      );
  } catch {
    if (current === request) error.value = '品牌列表加载失败';
  } finally {
    if (current === request) loading.value = false;
  }
}

onMounted(loadMerchants);
</script>

<template>
  <Modal
    open
    title="发布商品"
    ok-text="确认上架"
    cancel-text="取消"
    :confirm-loading="busy"
    :closable="!busy"
    :mask-closable="!busy"
    :ok-button-props="{ disabled: busy || !merchant || !brand }"
    @cancel="!busy && emit('close')"
    @ok="!busy && merchant && brand && emit('publish', merchant, brand)"
  >
    <Form layout="vertical">
      <FormItem label="发布商家" html-for="publish-youzan-merchant" required>
        <Select
          id="publish-youzan-merchant"
          :value="merchant"
          :options="merchants"
          :disabled="busy"
          :loading="loading && !merchant"
          placeholder="请选择商家"
          show-search
          option-filter-prop="label"
          @update:value="typeof $event === 'string' && chooseMerchant($event)"
        />
      </FormItem>
      <FormItem label="商品品牌" html-for="publish-youzan-brand" required>
        <Select
          id="publish-youzan-brand"
          v-model:value="brand"
          :options="brands"
          :disabled="!merchant || busy || loading"
          :loading="loading && !!merchant"
          placeholder="请选择该商家的品牌"
          show-search
          option-filter-prop="label"
        />
      </FormItem>
      <Alert v-if="error" type="error" :message="error" show-icon>
        <template #action>
          <Button
            size="small"
            @click="merchant ? chooseMerchant(merchant) : loadMerchants()"
          >
            重试
          </Button>
        </template>
      </Alert>
      <Alert
        v-else-if="!loading && !merchants.length"
        type="info"
        message="当前账号没有可发布的商家"
        show-icon
      />
      <Alert
        v-else-if="merchant && !loading && !brands.length"
        type="info"
        message="该商家暂无可用品牌"
        show-icon
      />
    </Form>
  </Modal>
</template>
