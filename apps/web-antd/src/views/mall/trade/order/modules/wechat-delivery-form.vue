<script lang="ts" setup>
import type { MallWechatLogisticsApi } from '#/api/mall/trade/logistics/wechat';
import type { MallOrderApi } from '#/api/mall/trade/order';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Result,
  Spin,
  Tag,
} from 'ant-design-vue';

import { createWechatWaybill } from '#/api/mall/trade/logistics/wechat';

const order = ref<MallOrderApi.Order>();
const waybill = ref<MallWechatLogisticsApi.Waybill>();
const loading = ref(false);
const errorMessage = ref('');

const created = computed(
  () => waybill.value?.status === 'CREATED' && !!waybill.value.waybillId,
);

async function handleCreate() {
  if (!order.value?.id) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    waybill.value = await createWechatWaybill(order.value.id);
    if (waybill.value.status !== 'CREATED') {
      errorMessage.value =
        waybill.value.errorMessage ||
        '微信物流订单创建失败，请查看后台错误码后重试';
    }
  } finally {
    loading.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      order.value = undefined;
      waybill.value = undefined;
      errorMessage.value = '';
      return;
    }
    order.value = modalApi.getData<MallOrderApi.Order>();
    waybill.value = undefined;
  },
});
</script>

<template>
  <Modal title="微信打单发货" class="w-[520px]">
    <Spin :spinning="loading">
      <Descriptions v-if="order" :column="1" bordered size="small">
        <Descriptions.Item label="订单号">{{ order.no }}</Descriptions.Item>
        <Descriptions.Item label="收件人">
{{ order.receiverName }}
          {{ order.receiverMobile }}
</Descriptions.Item>
        <Descriptions.Item label="收货地址">
{{ order.receiverAreaName
          }}{{ order.receiverDetailAddress }}
</Descriptions.Item>
      </Descriptions>
      <Alert
        v-if="!waybill"
        class="mt-4"
        type="info"
        show-icon
        message="创建运单后，微信打单 PC 软件会自动拉取并打印面单。打印完成后请到物流打单工作台确认发货。"
      />
      <Result
        v-if="created"
        class="py-4"
        status="success"
        title="微信运单已创建"
        sub-title="请确认微信打单软件已打印标签，再到物流打单工作台确认发货"
      >
        <template #extra>
<Tag color="blue">{{ waybill?.waybillId }}</Tag>
</template>
      </Result>
      <Alert
        v-if="errorMessage"
        class="mt-4"
        type="error"
        show-icon
        :message="errorMessage"
      />
      <Divider />
      <div class="flex justify-end gap-2">
        <Button
          v-if="!waybill || !created"
          type="primary"
          :loading="loading"
          @click="handleCreate"
        >
          创建微信运单
        </Button>
        <Button v-else @click="modalApi.close">关闭</Button>
      </div>
    </Spin>
  </Modal>
</template>
