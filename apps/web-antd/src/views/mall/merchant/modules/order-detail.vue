<script setup lang="ts">
import type { MerchantWorkbenchApi } from '#/api/merchant/workbench';

import { onMounted, ref } from 'vue';

import { Alert, Button, Descriptions, Modal, Spin } from 'ant-design-vue';

import { getMerchantOrderDetail } from '#/api/merchant/workbench';

const props = defineProps<{ subOrderId: number }>();
const emit = defineEmits<{ close: [] }>();
const detail = ref<MerchantWorkbenchApi.OrderDetail>();
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    detail.value = await getMerchantOrderDetail(props.subOrderId);
  } catch {
    detail.value = undefined;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Modal open title="履约订单详情" :footer="null" @cancel="emit('close')">
    <Spin v-if="loading" />
    <Descriptions v-else-if="detail" :column="1" bordered size="small">
      <Descriptions.Item label="履约单号">
        {{ detail.subOrder.no }}
      </Descriptions.Item>
      <Descriptions.Item label="订单号">{{ detail.orderNo }}</Descriptions.Item>
      <Descriptions.Item label="收件人">
        {{ detail.receiver?.name || '—' }}
      </Descriptions.Item>
      <Descriptions.Item label="手机号">
        {{ detail.receiver?.mobile || '—' }}
      </Descriptions.Item>
      <Descriptions.Item label="详细地址">
        {{ detail.receiver?.detailAddress || '—' }}
      </Descriptions.Item>
      <Descriptions.Item label="商品">
        <div v-for="item in detail.items" :key="item.id">
          {{ item.spuName }} × {{ item.count }}
        </div>
      </Descriptions.Item>
      <Descriptions.Item v-if="detail.buyerRemark" label="买家备注">
        {{ detail.buyerRemark }}
      </Descriptions.Item>
    </Descriptions>
    <Alert v-else type="error" message="订单详情加载失败">
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
  </Modal>
</template>
