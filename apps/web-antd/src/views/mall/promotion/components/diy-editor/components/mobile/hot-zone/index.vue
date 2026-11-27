<script setup lang="ts">
import type { HotZoneProperty } from './config';

import { ref, watch } from 'vue';

/** 热区 */
defineOptions({ name: 'HotZone' });

const props = defineProps<{ property: HotZoneProperty }>();
const imageFailed = ref(false);

watch(
  () => props.property.imgUrl,
  () => {
    imageFailed.value = false;
  },
);
</script>

<template>
  <div class="min-h-30px relative h-full w-full">
    <div
      v-if="!props.property.imgUrl || imageFailed"
      class="flex min-h-16 items-center justify-center border border-dashed px-3 text-center text-sm"
      role="status"
    >
      {{
        props.property.imgUrl ? '热区底图加载失败' : '热区未设置底图'
      }}，点击此处可选中组件
    </div>
    <template v-else>
      <img
        :key="props.property.imgUrl"
        :src="props.property.imgUrl"
        alt=""
        class="pointer-events-none block h-auto w-full select-none"
        draggable="false"
        @error="imageFailed = true"
      />
      <div
        v-for="(item, index) in props.property.list"
        :key="index"
        class="absolute z-10 flex cursor-move items-center justify-center border text-sm opacity-80"
        :style="{
          width: `${item.width}px`,
          height: `${item.height}px`,
          top: `${item.top}px`,
          left: `${item.left}px`,
          color: 'hsl(var(--primary))',
          background:
            'color-mix(in srgb, hsl(var(--primary)) 30%, transparent)',
          borderColor: 'hsl(var(--primary))',
        }"
      >
        {{ item.name }}
      </div>
    </template>
  </div>
</template>
