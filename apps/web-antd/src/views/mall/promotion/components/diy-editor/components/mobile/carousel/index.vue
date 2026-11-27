<script setup lang="ts">
import type { CarouselProperty } from './config';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Carousel, Image } from 'ant-design-vue';

import {
  getCarouselImageUrls,
  getSavedCarouselRatio,
  resolveCarouselAspectRatio,
} from './ratio';

/** 轮播图 */
defineOptions({ name: 'Carousel' });

const props = defineProps<{ property: CarouselProperty }>();

const adaptive = computed(() => props.property.heightMode === 'adaptive');
const adaptiveCard = computed(
  () => adaptive.value && props.property.type === 'card',
);
const imageUrls = computed(() => getCarouselImageUrls(props.property.items));
const resolvedRatio = ref<number>();

watch(
  [
    adaptive,
    () => imageUrls.value.join('\0'),
    () => props.property.aspectRatio,
    () => props.property.aspectRatioSource,
  ],
  async ([enabled], _previous, onCleanup) => {
    let active = true;
    onCleanup(() => {
      active = false;
    });
    const urls = imageUrls.value;
    const property = props.property;
    resolvedRatio.value = getSavedCarouselRatio(urls, property)?.aspectRatio;
    if (!enabled) return;
    const dimensions = await resolveCarouselAspectRatio(urls, property);
    if (active) resolvedRatio.value = dimensions?.aspectRatio;
  },
  { immediate: true },
);

const frameStyle = computed(() => {
  const { height } = props.property;
  const ratio = resolvedRatio.value;
  const fallbackRatio = 375 / (height > 0 ? height : 174);
  return adaptive.value
    ? {
        aspectRatio: String(
          ratio && Number.isFinite(ratio) && ratio > 0 ? ratio : fallbackRatio,
        ),
      }
    : { height: `${height}px` };
});

const currentIndex = ref(0); // 当前索引

/** 处理索引变化 */
const handleIndexChange = (index: number) => {
  currentIndex.value = index + 1;
};
</script>
<template>
  <!-- 无图片 -->
  <div
    class="flex items-center justify-center bg-muted"
    :style="adaptive ? frameStyle : { height: '250px' }"
    v-if="property.items.length === 0"
  >
    <IconifyIcon
      icon="tdesign:image"
      class="text-[120px] text-muted-foreground"
    />
  </div>
  <div v-else class="relative" :class="{ 'carousel-card': adaptiveCard }">
    <div
      :class="{ 'carousel-adaptive': adaptive }"
      :style="adaptive ? frameStyle : undefined"
    >
      <Carousel
        :autoplay="property.autoplay"
        :autoplay-speed="property.interval * 1000"
        :dots="property.indicator !== 'number'"
        @change="handleIndexChange"
        :style="adaptive ? undefined : frameStyle"
      >
        <div v-for="(item, index) in property.items" :key="index">
          <img
            v-if="adaptive"
            :src="item.imgUrl"
            alt=""
            class="block h-full w-full object-cover"
          />
          <Image
            v-else
            class="h-full w-full object-cover"
            :src="item.imgUrl"
            :preview="false"
          />
        </div>
      </Carousel>
    </div>
    <div
      v-if="property.indicator === 'number'"
      class="absolute bottom-[10px] right-[10px] rounded-xl bg-foreground px-[8px] py-[2px] text-[10px] text-primary-foreground opacity-40"
    >
      {{ currentIndex }} / {{ property.items.length }}
    </div>
  </div>
</template>

<style scoped>
.carousel-card {
  padding: 10px 9.3333% 30px;
}

.carousel-adaptive {
  position: relative;
}

.carousel-adaptive :deep(.ant-carousel) {
  position: absolute;
  inset: 0;
}

.carousel-adaptive :deep(.slick-slider),
.carousel-adaptive :deep(.slick-list),
.carousel-adaptive :deep(.slick-track),
.carousel-adaptive :deep(.slick-slide),
.carousel-adaptive :deep(.slick-slide > div),
.carousel-adaptive :deep(.slick-slide > div > div) {
  height: 100%;
}
</style>
