<script setup lang="ts">
import type { CarouselProperty } from './config';

import { ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Carousel, Image } from 'ant-design-vue';

/** 轮播图 */
defineOptions({ name: 'Carousel' });

defineProps<{ property: CarouselProperty }>();

const currentIndex = ref(0); // 当前索引

/** 处理索引变化 */
const handleIndexChange = (index: number) => {
  currentIndex.value = index + 1;
};
</script>
<template>
  <!-- 无图片 -->
  <div
    class="flex items-center justify-center bg-gray-300"
    :style="{
      height: property.items.length === 0 ? '250px' : `${property.height}px`,
    }"
    v-if="property.items.length === 0"
  >
    <IconifyIcon icon="tdesign:image" class="text-[120px] text-gray-800" />
  </div>
  <div
    v-else
    class="carousel relative"
    :style="{ height: `${property.height}px` }"
  >
    <Carousel
      :autoplay="property.autoplay"
      :autoplay-speed="property.interval * 1000"
      :dots="property.indicator !== 'number'"
      @change="handleIndexChange"
      :style="{ height: `${property.height}px` }"
    >
      <div
        v-for="(item, index) in property.items"
        :key="index"
        class="h-full w-full"
        :style="{ height: `${property.height}px` }"
      >
        <Image
          class="block h-full w-full object-cover"
          :src="item.imgUrl"
          :preview="false"
        />
      </div>
    </Carousel>
    <div
      v-if="property.indicator === 'number'"
      class="absolute bottom-[10px] right-[10px] rounded-xl bg-black px-[8px] py-[2px] text-[10px] text-white opacity-40"
    >
      {{ currentIndex }} / {{ property.items.length }}
    </div>
  </div>
</template>
<style scoped lang="scss">
.carousel {
  :deep(.slick-list),
  :deep(.slick-track),
  :deep(.slick-slide),
  :deep(.slick-slide > div),
  :deep(.slick-slide > div > div) {
    height: 100%;
  }
}
</style>
