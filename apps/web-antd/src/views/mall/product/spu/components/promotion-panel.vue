<script lang="ts" setup>
import type { MallSpuApi } from '#/api/mall/product/spu';

import { computed, nextTick, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Descriptions,
  Image,
  Input,
  Modal,
  Tag,
  Tabs,
  message,
} from 'ant-design-vue';

import { getSpu } from '#/api/mall/product/spu';

const props = withDefaults(
  defineProps<{ modelValue?: boolean; spuId?: number; initialSpu?: MallSpuApi.Spu }>(),
  { modelValue: false, spuId: undefined, initialSpu: undefined },
);
const emit = defineEmits<{ (event: 'update:modelValue', value: boolean): void }>();

const loading = ref(false);
const activeTab = ref('poster');
const product = ref<MallSpuApi.Spu>();
const posterCanvas = ref<HTMLCanvasElement>();

const productUrl = computed(() => {
  if (!product.value?.id) return '';
  return `${window.location.origin}/pages/goods/index?id=${product.value.id}`;
});
const cardData = computed(() =>
  JSON.stringify(
    {
      type: 'product',
      id: product.value?.id,
      name: product.value?.name,
      image: product.value?.picUrl,
      price: isPointProduct.value ? undefined : formatPrice(product.value?.price),
      point: isPointProduct.value ? product.value?.marketingConfig?.pointQuantity : undefined,
      url: productUrl.value,
    },
    null,
    2,
  ),
);
const isPointProduct = computed(() => Boolean(product.value?.marketingConfig?.pointProduct));
const posterLabel = computed(() => (isPointProduct.value ? '兑换积分' : '最新价格'));
const posterValue = computed(() =>
  isPointProduct.value
    ? `${product.value?.marketingConfig?.pointQuantity ?? 0} 积分`
    : `${product.value?.marketingConfig?.priceSymbol ?? '¥'} ${formatPrice(product.value?.price)}`,
);
const canPromote = computed(() => Boolean(product.value?.id && product.value.status !== -1));
const statusText = computed(() => {
  if (!product.value) return '未加载';
  if (product.value.status === -1) return '商品已失效';
  if (product.value.status === 0) return '商品未上架，推广链接可预览';
  return '可推广';
});

function formatPrice(value?: number) {
  return ((value ?? 0) / 100).toFixed(2);
}

async function loadProduct() {
  if (!props.modelValue || !props.spuId) return;
  loading.value = true;
  try {
    // Always read by id before building a share payload so unsaved list data is never promoted.
    product.value = await getSpu(props.spuId);
  } finally {
    loading.value = false;
  }
}

async function copyText(value: string, label: string) {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  message.success(`${label}已复制`);
}

async function drawPoster(): Promise<void> {
  const canvas = posterCanvas.value;
  if (!canvas || !product.value) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (product.value.picUrl) {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    const imageReady = new Promise<void>((resolve) => {
      image.onload = () => {
        context.drawImage(image, 0, 0, canvas.width, 270);
        drawPosterText(context);
        resolve();
      };
      image.onerror = () => resolve();
    });
    image.src = product.value.picUrl;
    await imageReady;
    return;
  }
  drawPosterText(context);
}

function drawPosterText(context: CanvasRenderingContext2D) {
  if (!product.value) return;
  context.fillStyle = '#111827';
  context.font = 'bold 28px sans-serif';
  context.fillText(product.value.name || '商品', 32, 320);
  context.fillStyle = '#dc2626';
  context.font = 'bold 26px sans-serif';
  context.fillText(posterValue.value, 32, 365);
  context.fillStyle = '#6b7280';
  context.font = '16px sans-serif';
  context.fillText(`${posterLabel.value} · 商品 ID ${product.value.id}`, 32, 400);
}

async function downloadPoster() {
  await drawPoster();
  const canvas = posterCanvas.value;
  if (!canvas || !product.value) return;
  const link = document.createElement('a');
  link.download = `${product.value.name || '商品'}-推广海报.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

watch(() => [props.modelValue, props.spuId], loadProduct, { immediate: true });
watch(product, async () => {
  await nextTick();
  await drawPoster();
});
</script>

<template>
  <Modal
    :open="modelValue"
    title="商品推广"
    :confirm-loading="loading"
    :footer="null"
    width="720px"
    @cancel="emit('update:modelValue', false)"
  >
    <Alert v-if="product" class="mb-4" :message="statusText" :type="canPromote ? 'success' : 'warning'" show-icon />
    <Alert v-else class="mb-4" message="商品数据加载中" type="info" show-icon />
    <Tabs v-model:active-key="activeTab">
      <Tabs.TabPane key="poster" tab="海报">
        <div class="flex items-start gap-5">
          <div class="rounded border bg-white p-2">
            <canvas ref="posterCanvas" width="280" height="430" class="h-[430px] w-[280px]" />
          </div>
          <div class="flex flex-1 flex-col gap-3">
            <Descriptions v-if="product" :column="1" size="small" bordered>
              <Descriptions.Item label="商品">{{ product.name }}</Descriptions.Item>
              <Descriptions.Item label="商品 ID">{{ product.id }}</Descriptions.Item>
              <Descriptions.Item :label="posterLabel">{{ posterValue }}</Descriptions.Item>
            </Descriptions>
            <Button :disabled="!product" @click="drawPoster">预览海报</Button>
            <Button :disabled="!product" @click="downloadPoster">下载海报</Button>
          </div>
        </div>
      </Tabs.TabPane>
      <Tabs.TabPane key="card" tab="卡片">
        <div class="flex flex-col gap-3">
          <div class="rounded border p-4">
            <div class="flex items-center gap-3">
              <Image :src="product?.picUrl" width="72" height="72" class="rounded object-cover" />
              <div><div class="font-medium">{{ product?.name }}</div><div class="text-red-500">{{ posterValue }}</div></div>
            </div>
          </div>
          <Button @click="copyText(cardData, '卡片数据')">复制卡片数据</Button>
        </div>
      </Tabs.TabPane>
      <Tabs.TabPane key="mini" tab="小程序卡片数据">
        <Input.TextArea :value="cardData" :rows="10" readonly />
        <Button class="mt-3" @click="copyText(cardData, '小程序卡片数据')">复制 JSON</Button>
      </Tabs.TabPane>
      <Tabs.TabPane key="h5" tab="H5 / 链接">
        <Input :value="productUrl" readonly addon-before="H5 链接" />
        <div class="mt-3 flex gap-2"><Button :disabled="!productUrl" @click="copyText(productUrl, '链接')">复制链接</Button><a :href="productUrl" target="_blank" rel="noopener">预览 H5</a></div>
      </Tabs.TabPane>
    </Tabs>
    <div class="mt-4 flex items-center gap-2"><Tag :color="canPromote ? 'green' : 'red'">{{ canPromote ? '权限正常' : '推广受限' }}</Tag><span class="text-gray-500">推广内容基于刚刚读取的商品数据生成</span></div>
  </Modal>
</template>
