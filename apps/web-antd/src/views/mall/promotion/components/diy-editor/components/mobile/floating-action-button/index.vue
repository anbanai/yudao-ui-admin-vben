<script setup lang="ts">
import type {
  FloatingActionButtonItemProperty,
  FloatingActionButtonProperty,
} from './config';

import { ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Image } from 'ant-design-vue';

/** 悬浮按钮 */
defineOptions({ name: 'FloatingActionButton' });

/** 定义属性 */
defineProps<{ property: FloatingActionButtonProperty }>();

const expanded = ref(false); // 是否展开
const previewPopup = ref<FloatingActionButtonItemProperty | null>(null); // 预览弹窗卡片

/** 处理展开/折叠 */
function handleToggleFab() {
  expanded.value = !expanded.value;
}

/** 处理按钮项点击 */
function handleFabItemClick(item: FloatingActionButtonItemProperty) {
  expanded.value = false;
  // 弹窗卡片类型：展示预览弹窗
  if (item.type === 'popup') {
    previewPopup.value = item;
  }
}
</script>
<template>
  <div
    class="absolute bottom-8 right-[calc(50%-384px/2+32px)] z-20 flex items-center gap-3"
    :class="[
      {
        'flex-row': property.direction === 'horizontal',
        'flex-col': property.direction === 'vertical',
      },
    ]"
  >
    <template v-if="expanded">
      <div
        v-for="(item, index) in property.list"
        :key="index"
        class="flex flex-col items-center"
        @click="handleFabItemClick(item)"
      >
        <Image :src="item.imgUrl" :width="28" :height="28" :preview="false">
          <template #error>
            <div class="flex h-full w-full items-center justify-center">
              <IconifyIcon
                icon="lucide:image"
                :color="item.textColor"
                class="inset-0 size-6 items-center"
              />
            </div>
          </template>
        </Image>
        <span
          v-if="property.showText"
          class="mt-1 text-xs"
          :style="{ color: item.textColor }"
        >
          {{ item.text }}
        </span>
      </div>
    </template>
    <!-- todo: @owen 使用APP主题色 -->
    <Button type="primary" size="large" shape="circle" @click="handleToggleFab">
      <IconifyIcon
        icon="lucide:plus"
        class="transition-transform duration-300"
        :class="expanded ? 'rotate-[135deg]' : 'rotate-0'"
      />
    </Button>
  </div>
  <!-- 模态背景：展开时显示，点击后折叠 -->
  <div
    v-if="expanded"
    class="absolute left-[calc(50%-375px/2)] top-0 z-[11] h-full w-[375px] bg-foreground/40"
    @click="handleToggleFab"
  ></div>
  <!-- 弹窗卡片预览 -->
  <div
    v-if="previewPopup"
    class="absolute left-[calc(50%-375px/2)] top-0 z-[30] flex h-full w-[375px] items-center justify-center bg-foreground/40 px-6"
    @click="previewPopup = null"
  >
    <div class="w-full rounded-xl bg-card p-4 shadow-xl" @click.stop>
      <Image
        v-if="previewPopup.popupImgUrl"
        :src="previewPopup.popupImgUrl"
        :preview="false"
        class="mb-3 w-full rounded-lg object-cover"
      />
      <div
        v-if="previewPopup.popupTitle"
        class="mb-2 text-base font-semibold text-foreground"
      >
        {{ previewPopup.popupTitle }}
      </div>
      <div
        v-if="previewPopup.popupContent"
        class="whitespace-pre-wrap text-sm text-muted-foreground"
      >
        {{ previewPopup.popupContent }}
      </div>
    </div>
  </div>
</template>
