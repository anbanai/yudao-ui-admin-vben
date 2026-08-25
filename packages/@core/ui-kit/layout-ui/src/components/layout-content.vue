<script setup lang="ts">
import type { CSSProperties } from 'vue';

import type { ContentCompactType } from '@vben-core/typings';

import { computed } from 'vue';

import { useLayoutContentStyle } from '@vben-core/composables';
import { Slot } from '@vben-core/shadcn-ui';

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

// @ts-expect-error - unused
const { contentElement, overlayStyle } = useLayoutContentStyle();

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
      padding: `${panelGap}px`,
    };
  }
  return {
    ...compactStyle,
    flex: 1,
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
  <main ref="contentElement" :style="style" class="relative bg-background-deep">
    <Slot :style="overlayStyle">
      <slot name="overlay"></slot>
    </Slot>
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
