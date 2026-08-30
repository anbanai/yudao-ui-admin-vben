<script setup lang="ts">
import type { CSSProperties } from 'vue';

import type { ContentCompactType } from '@vben-core/typings';

import { computed } from 'vue';

interface Props {
  /**
   * 内容区域定宽
   */
  contentCompact: ContentCompactType;
  /**
   * 定宽布局宽度
   */
  contentCompactWidth: number;
  padding: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  /**
   * 悬浮面板模式：内容区域包裹在圆角卡片中
   * @default false
   */
  panelFloat?: boolean;
  /**
   * 悬浮面板模式下，卡片与画布边缘的间距
   * @default 12
   */
  panelGap?: number;
}

const props = withDefaults(defineProps<Props>(), {
  panelFloat: false,
  panelGap: 12,
});

const overlayViewportStyle: CSSProperties = {
  height:
    'calc(var(--vben-viewport-height) - var(--vben-header-height, 0px) - var(--vben-footer-height, 0px))',
};

const style = computed((): CSSProperties => {
  const {
    contentCompact,
    panelFloat,
    panelGap,
    padding,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingTop,
  } = props;

  const compactStyle: CSSProperties =
    contentCompact === 'compact'
      ? { margin: '0 auto', width: `${props.contentCompactWidth}px` }
      : {};
  if (panelFloat) {
    // 悬浮面板模式：内容卡片与画布边缘保留间距，原有内边距由卡片承担
    return {
      ...compactStyle,
      flex: 1,
      minWidth: 0,
      padding: `${panelGap}px`,
    };
  }
  return {
    ...compactStyle,
    flex: 1,
    minWidth: 0,
    padding: `${padding}px`,
    paddingBottom: `${paddingBottom}px`,
    paddingLeft: `${paddingLeft}px`,
    paddingRight: `${paddingRight}px`,
    paddingTop: `${paddingTop}px`,
  };
});

const cardStyle = computed((): CSSProperties => {
  const { paddingBottom, paddingLeft, paddingRight, paddingTop, padding } =
    props;
  return {
    padding: `${padding}px`,
    paddingBottom: `${paddingBottom}px`,
    paddingLeft: `${paddingLeft}px`,
    paddingRight: `${paddingRight}px`,
    paddingTop: `${paddingTop}px`,
  };
});
</script>

<template>
  <main :style="style" class="relative min-w-0 bg-background-deep">
    <div
      v-if="$slots.overlay"
      data-layout-region="content-overlay"
      class="pointer-events-none sticky top-0 z-150 h-0 w-full"
    >
      <div
        :style="overlayViewportStyle"
        data-layout-region="overlay-viewport"
        class="pointer-events-none relative min-h-0 w-full"
      >
        <slot name="overlay"></slot>
      </div>
    </div>
    <div
      v-if="panelFloat"
      class="border-border bg-background rounded-xl border shadow-sm"
      :style="cardStyle"
    >
      <slot></slot>
    </div>
    <template v-else>
      <slot></slot>
    </template>
  </main>
</template>
