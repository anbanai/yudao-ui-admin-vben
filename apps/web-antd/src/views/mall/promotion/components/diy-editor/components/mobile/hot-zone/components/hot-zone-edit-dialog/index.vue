<script setup lang="ts">
import type { HotZoneItemProperty } from '../../config';
import type { ControlDot } from './controller';

import type { AppLink } from '#/views/mall/promotion/components/app-link-input/data';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button, Image } from 'ant-design-vue';

import { AppLinkSelectDialog } from '#/views/mall/promotion/components';

import {
  CONTROL_DOT_LIST,
  CONTROL_TYPE_ENUM,
  HOT_ZONE_MIN_SIZE,
  useDraggable,
  zoomIn,
  zoomOut,
} from './controller';

/** 热区编辑对话框 */
defineOptions({ name: 'HotZoneEditDialog' });

/** 定义属性 */
const props = defineProps({
  modelValue: {
    type: Array<HotZoneItemProperty>,
    default: () => [],
  },
  imgUrl: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

const formData = ref<HotZoneItemProperty[]>([]);

const [Modal, modalApi] = useVbenModal({
  showCancelButton: false,
  onConfirm() {
    const list = zoomOut(formData.value);
    emit('update:modelValue', list);
    modalApi.close();
  },
});

/** 打开弹窗 */
function open() {
  // 放大
  formData.value = zoomIn(props.modelValue);
  modalApi.open();
}

defineExpose({ open }); // 提供 open 方法，用于打开弹窗

const container = ref<HTMLDivElement>(); // 热区容器

/** 增加热区 */
function handleAdd() {
  formData.value.push({
    width: HOT_ZONE_MIN_SIZE,
    height: HOT_ZONE_MIN_SIZE,
    top: 0,
    left: 0,
  } as HotZoneItemProperty);
}

/** 删除热区 */
function handleRemove(hotZone: HotZoneItemProperty) {
  formData.value = formData.value.filter((item) => item !== hotZone);
}

/** 移动热区 */
function handleMove(item: HotZoneItemProperty, e: MouseEvent) {
  useDraggable(item, e, (left, top, _width, _height, moveWidth, moveHeight) => {
    const { width: containerWidth, height: containerHeight } =
      getContainerSize();
    item.left = clamp(left + moveWidth, 0, containerWidth - item.width);
    item.top = clamp(top + moveHeight, 0, containerHeight - item.height);
  });
}

/** 调整热区大小、位置 */
function handleResize(
  item: HotZoneItemProperty,
  ctrlDot: ControlDot,
  e: MouseEvent,
) {
  useDraggable(item, e, (left, top, width, height, moveWidth, moveHeight) => {
    const { width: containerWidth, height: containerHeight } =
      getContainerSize();
    const types = ctrlDot.types;

    // 水平方向：拖左边缘时固定右边缘，否则固定左边缘
    if (types.includes(CONTROL_TYPE_ENUM.LEFT)) {
      const right = left + width;
      item.left = clamp(left + moveWidth, 0, right - HOT_ZONE_MIN_SIZE);
      item.width = right - item.left;
    } else if (types.includes(CONTROL_TYPE_ENUM.WIDTH)) {
      item.width = clamp(
        width + moveWidth,
        HOT_ZONE_MIN_SIZE,
        containerWidth - left,
      );
    }

    // 垂直方向：拖上边缘时固定下边缘，否则固定上边缘
    if (types.includes(CONTROL_TYPE_ENUM.TOP)) {
      const bottom = top + height;
      item.top = clamp(top + moveHeight, 0, bottom - HOT_ZONE_MIN_SIZE);
      item.height = bottom - item.top;
    } else if (types.includes(CONTROL_TYPE_ENUM.HEIGHT)) {
      item.height = clamp(
        height + moveHeight,
        HOT_ZONE_MIN_SIZE,
        containerHeight - top,
      );
    }
  });
}

/** 获取容器的尺寸 */
function getContainerSize() {
  return {
    width: container.value?.offsetWidth ?? 0,
    height: container.value?.offsetHeight ?? 0,
  };
}

/** 将数值限制在 [min, max] 范围内 */
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

const activeHotZone = ref<HotZoneItemProperty>();
const appLinkDialogRef = ref();

/** 显示 App 链接选择对话框 */
const handleShowAppLinkDialog = (hotZone: HotZoneItemProperty) => {
  activeHotZone.value = hotZone;
  appLinkDialogRef.value.open(hotZone.url);
};

/** 处理 App 链接选择变更 */
const handleAppLinkChange = (appLink: AppLink) => {
  if (!appLink || !activeHotZone.value) {
    return;
  }
  activeHotZone.value.name = appLink.name;
  activeHotZone.value.url = appLink.path;
};
</script>

<template>
  <Modal title="设置热区" class="w-[780px]">
    <div ref="container" class="relative w-750px">
      <Image
        :src="imgUrl"
        :preview="false"
        class="pointer-events-none block w-750px select-none"
      />
      <div
        v-for="(item, hotZoneIndex) in formData"
        :key="hotZoneIndex"
        class="group absolute z-10 flex cursor-move items-center justify-center border text-base opacity-80"
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
        @mousedown="handleMove(item, $event)"
        @dblclick="handleShowAppLinkDialog(item)"
      >
        <span class="pointer-events-none select-none">
          {{ item.name || '双击选择链接' }}
        </span>
        <IconifyIcon
          icon="lucide:x"
          class="absolute right-0 top-0 hidden cursor-pointer rounded-bl-[80%] p-[2px_2px_6px_6px] text-right text-white group-hover:block"
          :style="{ backgroundColor: 'hsl(var(--primary))' }"
          :size="14"
          @click.stop="handleRemove(item)"
        />

        <!-- 8 个控制点 -->
        <span
          class="ctrl-dot absolute z-[11] h-2 w-2 rounded-full bg-white"
          v-for="(dot, dotIndex) in CONTROL_DOT_LIST"
          :key="dotIndex"
          :style="{ ...dot.style, border: 'inherit' }"
          @mousedown="handleResize(item, dot, $event)"
        ></span>
      </div>
    </div>
    <template #prepend-footer>
      <Button @click="handleAdd" type="primary" ghost>
        <IconifyIcon icon="lucide:plus" class="mr-5px" />
        添加热区
      </Button>
    </template>
  </Modal>

  <AppLinkSelectDialog
    ref="appLinkDialogRef"
    @app-link-change="handleAppLinkChange"
  />
</template>

<style scoped>
/* 让图片容器紧贴图片，保证热区边界与图片一致 */
:deep(.ant-image) {
  display: block;
}
</style>
