<script setup lang="ts">
import type { CSSProperties } from 'vue';

import {
  computed,
  onUnmounted,
  shallowRef,
  useSlots,
  watch,
  watchEffect,
} from 'vue';

import { useScrollLock } from '@vben-core/composables';
import { VbenScrollbar } from '@vben-core/shadcn-ui';

import { useSidebarDrag } from '../hooks/use-sidebar-drag';
import { SidebarCollapseButton, SidebarFixedButton } from './widgets';

interface Props {
  /**
   * 折叠区域高度
   * @default 42
   */
  collapseHeight?: number;
  /**
   * 折叠宽度
   * @default 48
   */
  collapseWidth?: number;
  /**
   * 隐藏的dom是否可见
   * @default true
   */
  domVisible?: boolean;
  /**
   * 标准侧栏展开宽度
   */
  expandedWidth?: number;
  /**
   * 扩展区域extra-title的高度
   */
  extraTitleHeight?: number;
  /**
   * 扩展区域宽度
   */
  extraWidth: number;
  /**
   * 固定扩展区域
   * @default false
   */
  fixedExtra?: boolean;
  /**
   * 头部高度
   */
  headerHeight: number;
  /**
   * 是否移动端抽屉模式
   * @default false
   */
  isMobile?: boolean;
  /**
   * 是否侧边混合模式
   * @default false
   */
  isSidebarMixed?: boolean;
  /**
   * 顶部margin
   * @default 60
   */
  marginTop?: number;
  /**
   * 混合菜单宽度
   * @default 80
   */
  mixedWidth?: number;
  /**
   * 顶部padding
   * @default 60
   */
  paddingTop?: number;
  /**
   * 悬浮面板模式：侧边栏以圆角卡片形式悬浮于画布之上
   * @default false
   */
  panelFloat?: boolean;
  /**
   * 悬浮面板模式下，面板与画布边缘的间距
   * @default 12
   */
  panelGap?: number;
  /**
   * 是否显示
   * @default true
   */
  show?: boolean;
  /**
   * 显示折叠按钮
   * @default true
   */
  showCollapseButton?: boolean;
  /**
   * 显示固定按钮
   * @default true
   */
  showFixedButton?: boolean;
  /**
   * 主题
   */
  theme: string;
  /**
   * 子主题
   */
  themeSub: string;
  /**
   * 宽度
   */
  width: number;
  /**
   * zIndex
   * @default 0
   */
  zIndex?: number;
}

const props = withDefaults(defineProps<Props>(), {
  collapseHeight: 42,
  collapseWidth: 48,
  domVisible: true,
  expandedWidth: 180,
  extraTitleHeight: undefined,
  fixedExtra: false,
  isMobile: false,
  isSidebarMixed: false,
  marginTop: 0,
  mixedWidth: 70,
  panelFloat: false,
  panelGap: 12,
  paddingTop: 0,
  show: true,
  showCollapseButton: true,
  showFixedButton: true,
  zIndex: 0,
});

const emit = defineEmits<{ leave: []; 'update:width': [value: number] }>();
const draggable = defineModel<boolean>('draggable');
const collapse = defineModel<boolean>('collapse');
const extraCollapse = defineModel<boolean>('extraCollapse');
const expandOnHovering = defineModel<boolean>('expandOnHovering');
const expandOnHover = defineModel<boolean>('expandOnHover');
const extraVisible = defineModel<boolean>('extraVisible');

const isLocked = useScrollLock({ immediate: false });
const slots = useSlots();

const asideRef = shallowRef<HTMLElement | null>(null);
const dragBarRef = shallowRef<HTMLElement | null>(null);

const hiddenSideStyle = computed((): CSSProperties => {
  const widthValue = props.show ? getMenuWidthValue(true) : '0px';
  return {
    flexBasis: widthValue,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
  };
});

const sidebarVisualWidth = computed(() => {
  const currentWidth = Number.parseFloat(getMenuWidthValue(false));
  if (!props.isMobile && !props.isSidebarMixed) {
    return Math.max(currentWidth, props.expandedWidth);
  }
  if (
    props.isSidebarMixed &&
    props.panelFloat &&
    props.show &&
    props.width > 0 &&
    extraVisible.value
  ) {
    return props.width + props.panelGap + props.extraWidth;
  }
  return currentWidth;
});

const dragBarStyle = computed((): CSSProperties => {
  const currentWidth = Number.parseFloat(getMenuWidthValue(false));
  return {
    right: props.isSidebarMixed
      ? '0px'
      : `${Math.max(0, sidebarVisualWidth.value - currentWidth)}px`,
  };
});

// 悬浮面板模式下，双列扩展面板"收起"等价于"隐藏"，避免残留空白竖条；
// 重新显示（点击一级菜单/悬停）时自动恢复为完整宽度
watchEffect(() => {
  if (props.panelFloat && extraCollapse.value && extraVisible.value) {
    extraVisible.value = false;
  }
});
watch(extraVisible, (visible) => {
  if (props.panelFloat && visible && extraCollapse.value) {
    extraCollapse.value = false;
  }
});

const style = computed((): CSSProperties => {
  const {
    isSidebarMixed,
    marginTop,
    panelFloat,
    panelGap,
    paddingTop,
    show,
    zIndex,
  } = props;

  return {
    '--scroll-shadow': 'var(--sidebar)',
    ...calcMenuWidthStyle(),
    height: `calc(100% - ${marginTop + (panelFloat ? panelGap * 2 : 0)}px)`,
    marginTop: `${marginTop}px`,
    paddingTop: `${paddingTop}px`,
    zIndex,
    // 悬浮偏移仅在显示时生效，隐藏时保持 left-0 以配合负 margin 完全移出屏幕
    ...(panelFloat && show
      ? { left: `${panelGap}px`, top: `${panelGap}px` }
      : {}),
    ...(isSidebarMixed && extraVisible.value ? { transition: 'none' } : {}),
  };
});

const extraStyle = computed((): CSSProperties => {
  const { extraWidth, panelFloat, panelGap, show, width, zIndex } = props;

  return {
    // The transformed aside is the containing block for this fixed panel.
    left: `${width + (panelFloat ? panelGap : 0)}px`,
    width: extraVisible.value && show ? `${extraWidth}px` : 0,
    zIndex,
  };
});

const extraPanelStyle = computed((): CSSProperties => {
  const { marginTop, panelFloat, panelGap } = props;
  return panelFloat
    ? {
        height: `calc(100% - ${marginTop + panelGap * 2}px)`,
        top: `${marginTop + panelGap}px`,
      }
    : {};
});

const extraTitleStyle = computed((): CSSProperties => {
  const { extraTitleHeight, headerHeight } = props;

  return {
    height: `${extraTitleHeight ?? headerHeight - 1}px`,
  };
});

const contentWidthStyle = computed((): CSSProperties => {
  const { fixedExtra, isSidebarMixed, mixedWidth } = props;
  if (isSidebarMixed && fixedExtra) {
    return { width: `${mixedWidth}px` };
  }
  return {};
});

const contentStyle = computed((): CSSProperties => {
  const { collapseHeight, headerHeight } = props;

  return {
    height: `calc(100% - ${headerHeight + collapseHeight}px)`,
    paddingTop: '8px',
    ...contentWidthStyle.value,
  };
});

const headerStyle = computed((): CSSProperties => {
  const { headerHeight, isSidebarMixed } = props;

  return {
    ...(isSidebarMixed ? { display: 'flex', justifyContent: 'center' } : {}),
    height: `${headerHeight - 1}px`,
    ...contentWidthStyle.value,
  };
});

const extraContentStyle = computed((): CSSProperties => {
  const { collapseHeight, extraTitleHeight, headerHeight } = props;
  const titleHeight = extraTitleHeight ?? headerHeight;
  return {
    height: `calc(100% - ${titleHeight + collapseHeight}px)`,
  };
});

const collapseStyle = computed((): CSSProperties => {
  return {
    height: `${props.collapseHeight}px`,
  };
});

watchEffect(() => {
  extraVisible.value = props.fixedExtra ? true : extraVisible.value;
});

function getMenuWidthValue(isHiddenDom: boolean) {
  const {
    collapseWidth,
    extraWidth,
    mixedWidth,
    fixedExtra,
    isSidebarMixed,
    panelFloat,
    panelGap,
    width,
  } = props;

  const extraVisibleFixed = isSidebarMixed && fixedExtra && extraVisible.value;

  let widthValue =
    width === 0 ? 0 : width + (extraVisibleFixed ? extraWidth : 0);

  if (isHiddenDom && expandOnHovering.value && !expandOnHover.value) {
    widthValue = isSidebarMixed ? mixedWidth : collapseWidth;
  }
  // 悬浮面板模式：占位区域需要额外包含面板两侧以及双列面板之间的间距
  if (isHiddenDom && panelFloat && width > 0) {
    widthValue += panelGap * (extraVisibleFixed ? 3 : 2);
  }

  return `${widthValue}px`;
}

function calcMenuWidthStyle(): CSSProperties {
  const widthValue = getMenuWidthValue(false);
  const currentWidth = Number.parseFloat(widthValue);
  const clippedWidth = props.isSidebarMixed
    ? 0
    : Math.max(0, sidebarVisualWidth.value - currentWidth);
  let transform: CSSProperties['transform'];

  if (props.isMobile) {
    transform = undefined;
  } else if (props.show) {
    transform = 'translate3d(0, 0, 0)';
  } else {
    transform = 'translate3d(-100%, 0, 0)';
  }

  return {
    ...(widthValue === '0px' ? { overflow: 'hidden' } : {}),
    clipPath: `inset(0 ${clippedWidth}px 0 0)`,
    transform,
    width: `${sidebarVisualWidth.value}px`,
  };
}

function handleMouseenter(e: MouseEvent) {
  if (e?.offsetX < 10) {
    return;
  }

  // 未开启和未折叠状态不生效
  if (expandOnHover.value) {
    return;
  }
  if (!expandOnHovering.value) {
    collapse.value = false;
  }
  if (props.isSidebarMixed) {
    isLocked.value = true;
  }
  expandOnHovering.value = true;
}

function handleMouseleave() {
  emit('leave');
  if (props.isSidebarMixed) {
    isLocked.value = false;
  }
  if (expandOnHover.value) {
    return;
  }

  expandOnHovering.value = false;
  collapse.value = true;
  extraVisible.value = false;
}

const { startDrag, endDrag } = useSidebarDrag();

const handleDragSidebar = (e: MouseEvent) => {
  const { isSidebarMixed, collapseWidth, panelFloat, panelGap, width } = props;
  const mixedPanelOffset =
    width + (panelFloat && extraVisible.value ? panelGap : 0);
  const minLimit = isSidebarMixed
    ? mixedPanelOffset + collapseWidth
    : collapseWidth;
  const maxLimit = isSidebarMixed ? mixedPanelOffset + 320 : 320;

  startDrag(
    e,
    {
      min: minLimit,
      max: maxLimit,
    },
    {
      target: asideRef.value,
      dragBar: dragBarRef.value,
    },
    (newWidth) => {
      if (isSidebarMixed) {
        const extraWidth = newWidth - mixedPanelOffset;
        emit('update:width', extraWidth);
        extraCollapse.value = collapse.value = extraWidth <= collapseWidth;
      } else {
        emit('update:width', newWidth);
        collapse.value = extraCollapse.value = newWidth <= collapseWidth;
      }
    },
  );
};

onUnmounted(() => {
  endDrag();
});
</script>

<template>
  <div
    v-if="domVisible"
    :class="theme"
    :style="hiddenSideStyle"
    class="h-full"
  ></div>
  <Transition name="mobile-sidebar">
    <aside
      v-if="!isMobile || !collapse"
      ref="asideRef"
      data-layout-region="sidebar"
      :inert="!show || width === 0"
      :style="style"
      class="fixed left-0 top-0 h-full"
      :class="[
        theme,
        {
          'border-r border-border bg-sidebar transition-[clip-path,transform] duration-300 ease-out':
            !isMobile && !isSidebarMixed,
          'transition-transform duration-300 ease-out':
            !isMobile && isSidebarMixed,
        },
      ]"
      @mouseenter="handleMouseenter"
      @mouseleave="handleMouseleave"
    >
      <div
        class="h-full"
        :class="[
          {
            'bg-sidebar-deep': isSidebarMixed,
            'border-r border-border bg-sidebar': !isSidebarMixed,
          },
          panelFloat
            ? 'border-border overflow-hidden rounded-xl border shadow-sm'
            : '',
        ]"
        :style="{ width: `${width}px` }"
      >
        <SidebarFixedButton
          v-if="!collapse && !isSidebarMixed && showFixedButton"
          v-model:expand-on-hover="expandOnHover"
        />
        <div v-if="slots.logo" :style="headerStyle">
          <slot name="logo"></slot>
        </div>
        <VbenScrollbar :style="contentStyle" shadow shadow-border>
          <slot></slot>
        </VbenScrollbar>

        <div :style="collapseStyle"></div>
        <SidebarCollapseButton
          v-if="showCollapseButton && !isSidebarMixed"
          v-model:collapsed="collapse"
        />
      </div>
      <div
        v-if="isSidebarMixed"
        :class="[
          themeSub,
          {
            'border-l': extraVisible && !panelFloat,
          },
          panelFloat
            ? 'border-border bg-sidebar overflow-hidden rounded-xl border shadow-sm'
            : '',
        ]"
        :style="[extraStyle, extraPanelStyle]"
        class="fixed top-0 h-full overflow-hidden border-r border-border bg-sidebar transition-[left,width] duration-300 ease-out"
      >
        <SidebarCollapseButton
          v-if="isSidebarMixed && expandOnHover"
          v-model:collapsed="extraCollapse"
        />

        <SidebarFixedButton
          v-if="!extraCollapse"
          v-model:expand-on-hover="expandOnHover"
        />
        <div v-if="!extraCollapse" :style="extraTitleStyle" class="pl-2">
          <slot name="extra-title"></slot>
        </div>
        <VbenScrollbar
          :style="extraContentStyle"
          class="border-border py-2"
          shadow
          shadow-border
        >
          <slot name="extra"></slot>
        </VbenScrollbar>
      </div>
      <div
        v-if="draggable"
        ref="dragBarRef"
        :style="dragBarStyle"
        class="absolute inset-y-0 -right-px z-1000 w-0.5 cursor-col-resize hover:bg-primary"
        @mousedown="handleDragSidebar"
      ></div>
    </aside>
  </Transition>
</template>

<style scoped>
.mobile-sidebar-enter-active,
.mobile-sidebar-leave-active {
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.mobile-sidebar-enter-from,
.mobile-sidebar-leave-to {
  transform: translate3d(-100%, 0, 0);
}

@media (prefers-reduced-motion: reduce) {
  .mobile-sidebar-enter-active,
  .mobile-sidebar-leave-active {
    transition-duration: 0ms;
  }
}
</style>
