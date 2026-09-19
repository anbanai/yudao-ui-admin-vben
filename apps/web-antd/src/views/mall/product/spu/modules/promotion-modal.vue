<script lang="ts" setup>
import type { PromotionAssetType, PromotionContext } from '../promotion-share';

import type { MallSpuApi } from '#/api/mall/product/spu';
import type { MemberUserApi } from '#/api/member/user';

import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue';

import { useAccess } from '@vben/access';
import { useVbenModal } from '@vben/common-ui';
import { ProductSpuStatusEnum } from '@vben/constants';
import { IconifyIcon } from '@vben/icons';

import { Button, message, Segmented, Spin, Tabs } from 'ant-design-vue';

import { getSpu } from '#/api/mall/product/spu';
import { getWxaQrcode } from '#/api/member/social';

import { renderPromotionAsset } from '../promotion-renderer';
import {
  buildPromotionCacheKey,
  buildPromotionContext,
  buildPromotionFilename,
  createMemberIdentity,
  createShopIdentity,
} from '../promotion-share';
import PromotionMemberSelect from './promotion-member-select.vue';

defineOptions({ name: 'ProductPromotionModal' });

type ActiveTab = 'link' | PromotionAssetType;
type IdentityMode = 'member' | 'shop';
type PreviewState =
  | { blob: Blob; status: 'ready'; url: string }
  | { message: string; status: 'error' }
  | { status: 'idle' }
  | { status: 'loading' };

const SHOP_AVATAR_URL = '/branding/logo-mark.png';
const SHOP_NAME = '不忍独享';
const H5_CONFIG_MESSAGE = '请配置 VITE_MALL_H5_DOMAIN';

const { hasAccessByCodes } = useAccess();
const canSelectMember = hasAccessByCodes(['member:user:query']);
const product = ref<MallSpuApi.Spu>();
const loadError = ref('');
const activeTab = ref<ActiveTab>('poster');
const identityMode = ref<IdentityMode>('shop');
const selectedMemberId = ref<number>();
const selectedMember = ref<MemberUserApi.User>();
const linkInput = ref<HTMLInputElement>();
const assetCache = new Map<string, Blob>();
const qrCache = new Map<string, Promise<string>>();
const previewStates = reactive<Record<PromotionAssetType, PreviewState>>({
  card: { status: 'idle' },
  h5: { status: 'idle' },
  poster: { status: 'idle' },
});
let generationRequestId = 0;
let lifecycleRequestId = 0;

const identityOptions = computed(() => [
  { label: '店铺公共', value: 'shop' },
  ...(canSelectMember ? [{ label: '指定推广员', value: 'member' }] : []),
]);

const promotionContext = computed<PromotionContext | undefined>(() => {
  if (!product.value) return undefined;
  let identity;
  if (identityMode.value === 'member') {
    if (!selectedMember.value) return undefined;
    identity = createMemberIdentity(selectedMember.value, SHOP_AVATAR_URL);
  } else {
    identity = createShopIdentity(SHOP_NAME, SHOP_AVATAR_URL);
  }
  try {
    return buildPromotionContext({
      h5Domain: import.meta.env.VITE_MALL_H5_DOMAIN,
      identity,
      product: product.value,
    });
  } catch {
    return undefined;
  }
});

const h5Configured = computed(() => {
  try {
    const url = new URL(import.meta.env.VITE_MALL_H5_DOMAIN ?? '');
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
});
const h5Available = computed(() => Boolean(promotionContext.value?.h5Url));
const currentPreview = computed(() =>
  activeTab.value === 'link' ? undefined : previewStates[activeTab.value],
);
const previewAspectClass = computed(() => ({
  'aspect-[3/5]': activeTab.value === 'poster',
  'aspect-[5/4]': activeTab.value === 'card',
  'aspect-square': activeTab.value === 'h5',
}));

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function revokePreviewUrls() {
  const revoked = new Set<string>();
  for (const type of ['card', 'h5', 'poster'] as const) {
    const state = previewStates[type];
    if (state.status === 'ready' && !revoked.has(state.url)) {
      URL.revokeObjectURL(state.url);
      revoked.add(state.url);
    }
    previewStates[type] = { status: 'idle' };
  }
}

function invalidatePreviews() {
  generationRequestId += 1;
  revokePreviewUrls();
  assetCache.clear();
  qrCache.clear();
}

function resetSession() {
  lifecycleRequestId += 1;
  invalidatePreviews();
  product.value = undefined;
  loadError.value = '';
  activeTab.value = 'poster';
  identityMode.value = 'shop';
  selectedMemberId.value = undefined;
  selectedMember.value = undefined;
}

async function getMiniProgramQr(context: PromotionContext) {
  const scene = context.miniProgramScene;
  const cached = qrCache.get(scene);
  if (cached) return cached;
  const request = getWxaQrcode({
    path: context.miniProgramPath,
    scene,
    width: 280,
  });
  qrCache.set(scene, request);
  try {
    return await request;
  } catch (error) {
    if (qrCache.get(scene) === request) qrCache.delete(scene);
    throw error;
  }
}

async function ensureAsset(type: PromotionAssetType) {
  const context = promotionContext.value;
  const currentProduct = product.value;
  if (!context || !currentProduct) return;
  if (type === 'h5' && !context.h5Url) return;
  const key = buildPromotionCacheKey(
    currentProduct,
    context.identity.shareId,
    type,
  );
  const state = previewStates[type];
  if (state.status === 'ready') return;

  const requestId = ++generationRequestId;
  previewStates[type] = { status: 'loading' };
  try {
    let blob = assetCache.get(key);
    if (!blob) {
      const miniProgramQrCode =
        type === 'poster' || type === 'card'
          ? await getMiniProgramQr(context)
          : undefined;
      blob = await renderPromotionAsset({
        context,
        ...(miniProgramQrCode ? { miniProgramQrCode } : {}),
        type,
      });
    }
    const url = URL.createObjectURL(blob);
    if (
      requestId !== generationRequestId ||
      promotionContext.value !== context
    ) {
      URL.revokeObjectURL(url);
      return;
    }
    assetCache.set(key, blob);
    previewStates[type] = { blob, status: 'ready', url };
  } catch (error) {
    if (requestId !== generationRequestId) return;
    previewStates[type] = {
      message: errorMessage(error, '推广图片生成失败'),
      status: 'error',
    };
  }
}

async function handleIdentityModeChange(value: number | string) {
  identityMode.value = value as IdentityMode;
  selectedMemberId.value = undefined;
  selectedMember.value = undefined;
  invalidatePreviews();
  if (identityMode.value === 'shop' && activeTab.value !== 'link') {
    await ensureAsset(activeTab.value);
  }
}

async function handleMemberChange(member?: MemberUserApi.User) {
  selectedMember.value = member;
  selectedMemberId.value = member?.id;
  invalidatePreviews();
  if (member && activeTab.value !== 'link') {
    await ensureAsset(activeTab.value);
  }
}

async function handleTabChange(value: number | string) {
  activeTab.value = value as ActiveTab;
  if (activeTab.value !== 'link') await ensureAsset(activeTab.value);
}

function downloadAsset(type: PromotionAssetType) {
  const state = previewStates[type];
  if (state.status !== 'ready' || !product.value) return;
  const anchor = document.createElement('a');
  anchor.href = state.url;
  anchor.download = buildPromotionFilename(product.value.name ?? '商品', type);
  anchor.click();
}

async function copyLink() {
  const link = promotionContext.value?.h5Url;
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    message.success('推广链接已复制');
  } catch {
    await nextTick();
    linkInput.value?.focus();
    linkInput.value?.select();
    message.warning('请手动复制推广链接');
  }
}

function openPreview(url?: string) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      resetSession();
      return;
    }
    resetSession();
    const requestId = lifecycleRequestId;
    const row = modalApi.getData() as MallSpuApi.Spu;
    if (!row?.id) {
      loadError.value = '商品编号不存在';
      return;
    }
    modalApi.lock();
    let shouldGeneratePreview = false;
    try {
      const latestProduct = await getSpu(row.id);
      if (requestId !== lifecycleRequestId) return;
      product.value = latestProduct;
      if (latestProduct.status !== ProductSpuStatusEnum.ENABLE.status) {
        loadError.value = '仅支持推广已上架商品';
        return;
      }
      if (!promotionContext.value) {
        loadError.value = '商品推广信息不完整';
        return;
      }
      shouldGeneratePreview = true;
    } catch (error) {
      if (requestId === lifecycleRequestId) {
        loadError.value = errorMessage(error, '商品信息加载失败');
      }
    } finally {
      modalApi.unlock();
    }
    if (shouldGeneratePreview && requestId === lifecycleRequestId) {
      await ensureAsset(activeTab.value);
    }
  },
});

onBeforeUnmount(resetSession);
</script>

<template>
  <Modal :footer="false" class="w-[960px]" title="商品推广">
    <div v-if="product" class="space-y-5">
      <div class="flex h-14 min-w-0 items-center gap-3">
        <img
          :alt="product.name"
          :src="product.picUrl"
          class="h-14 w-14 shrink-0 rounded object-cover"
        />
        <div class="min-w-0">
          <div class="truncate text-sm font-medium">{{ product.name }}</div>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="font-semibold text-rose-600">
              ¥{{ ((product.price ?? 0) / 100).toFixed(2) }}
            </span>
            <span
              v-if="
                product.marketPrice &&
                product.marketPrice > (product.price ?? 0)
              "
              class="text-xs text-gray-400 line-through"
            >
              ¥{{ (product.marketPrice / 100).toFixed(2) }}
            </span>
          </div>
        </div>
      </div>

      <p v-if="loadError" class="text-sm text-red-500">{{ loadError }}</p>

      <div
        v-if="!loadError"
        class="grid gap-6 min-[900px]:grid-cols-[280px_minmax(0,1fr)]"
      >
        <div class="space-y-5">
          <section class="space-y-2">
            <div class="text-xs font-medium text-gray-500">推广身份</div>
            <Segmented
              v-model:value="identityMode"
              :options="identityOptions"
              block
              @change="handleIdentityModeChange"
            />
            <PromotionMemberSelect
              v-if="identityMode === 'member' && canSelectMember"
              v-model="selectedMemberId"
              @change="handleMemberChange"
            />
          </section>

          <section class="space-y-2">
            <div class="text-xs font-medium text-gray-500">推广形式</div>
            <Tabs
              v-model:active-key="activeTab"
              size="small"
              @change="handleTabChange"
            >
              <Tabs.TabPane key="poster" tab="商品海报" />
              <Tabs.TabPane key="card" tab="商品卡片" />
              <Tabs.TabPane key="h5" :disabled="!h5Available" tab="H5 二维码" />
              <Tabs.TabPane
                key="link"
                :disabled="!h5Available"
                tab="推广链接"
              />
            </Tabs>
            <p v-if="!h5Configured" class="text-xs text-amber-600">
              {{ H5_CONFIG_MESSAGE }}
            </p>
          </section>

          <div
            v-if="activeTab === 'link' && promotionContext?.h5Url"
            class="space-y-3"
          >
            <input
              ref="linkInput"
              :value="promotionContext.h5Url"
              class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              readonly
            />
            <div class="flex flex-wrap gap-2">
              <Button @click="copyLink">
                <IconifyIcon class="mr-1" icon="lucide:copy" />
                复制链接
              </Button>
              <Button @click="openPreview(promotionContext.h5Url)">
                <IconifyIcon class="mr-1" icon="lucide:external-link" />
                打开预览
              </Button>
            </div>
          </div>

          <div
            v-else-if="currentPreview?.status === 'ready'"
            class="flex flex-wrap gap-2"
          >
            <Button @click="downloadAsset(activeTab as PromotionAssetType)">
              <IconifyIcon class="mr-1" icon="lucide:download" />
              下载 PNG
            </Button>
            <Button @click="openPreview(currentPreview.url)">
              <IconifyIcon class="mr-1" icon="lucide:external-link" />
              打开预览
            </Button>
          </div>
        </div>

        <div
          v-if="activeTab !== 'link'"
          class="flex min-h-80 items-center justify-center bg-gray-50 p-4"
        >
          <div
            class="flex max-h-[520px] w-full max-w-[520px] items-center justify-center overflow-hidden"
            :class="previewAspectClass"
          >
            <Spin v-if="currentPreview?.status === 'loading'" />
            <img
              v-else-if="currentPreview?.status === 'ready'"
              alt="推广图片预览"
              :src="currentPreview.url"
              class="h-full w-full object-contain"
            />
            <div
              v-else-if="currentPreview?.status === 'error'"
              class="space-y-3 text-center"
            >
              <p class="text-sm text-red-500">{{ currentPreview.message }}</p>
              <Button
                size="small"
                @click="ensureAsset(activeTab as PromotionAssetType)"
              >
                <IconifyIcon class="mr-1" icon="lucide:refresh-cw" />
                重试
              </Button>
            </div>
            <span v-else class="text-sm text-gray-400">请选择推广员</span>
          </div>
        </div>
      </div>
    </div>
    <p v-else-if="loadError" class="py-12 text-center text-sm text-red-500">
      {{ loadError }}
    </p>
  </Modal>
</template>
