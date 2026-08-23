import type { CSSProperties } from 'vue';

import type { HotZoneItemProperty } from '../../config';

export const HOT_ZONE_MIN_SIZE = 100; // 热区的最小宽高

export interface HotZoneContainerSize {
  width: number;
  height: number;
}

/** 控制的类型 */
export enum CONTROL_TYPE_ENUM {
  LEFT,
  TOP,
  WIDTH,
  HEIGHT,
}

/** 定义热区的控制点 */
export interface ControlDot {
  position: string;
  types: CONTROL_TYPE_ENUM[];
  style: CSSProperties;
}

/** 热区的 8 个控制点 */
export const CONTROL_DOT_LIST = [
  {
    position: '左上角',
    types: [
      CONTROL_TYPE_ENUM.LEFT,
      CONTROL_TYPE_ENUM.TOP,
      CONTROL_TYPE_ENUM.WIDTH,
      CONTROL_TYPE_ENUM.HEIGHT,
    ],
    style: { left: '-5px', top: '-5px', cursor: 'nwse-resize' },
  },
  {
    position: '上方中间',
    types: [CONTROL_TYPE_ENUM.TOP, CONTROL_TYPE_ENUM.HEIGHT],
    style: {
      left: '50%',
      top: '-5px',
      cursor: 'n-resize',
      transform: 'translateX(-50%)',
    },
  },
  {
    position: '右上角',
    types: [
      CONTROL_TYPE_ENUM.TOP,
      CONTROL_TYPE_ENUM.WIDTH,
      CONTROL_TYPE_ENUM.HEIGHT,
    ],
    style: { right: '-5px', top: '-5px', cursor: 'nesw-resize' },
  },
  {
    position: '右侧中间',
    types: [CONTROL_TYPE_ENUM.WIDTH],
    style: {
      right: '-5px',
      top: '50%',
      cursor: 'e-resize',
      transform: 'translateX(-50%)',
    },
  },
  {
    position: '右下角',
    types: [CONTROL_TYPE_ENUM.WIDTH, CONTROL_TYPE_ENUM.HEIGHT],
    style: { right: '-5px', bottom: '-5px', cursor: 'nwse-resize' },
  },
  {
    position: '下方中间',
    types: [CONTROL_TYPE_ENUM.HEIGHT],
    style: {
      left: '50%',
      bottom: '-5px',
      cursor: 's-resize',
      transform: 'translateX(-50%)',
    },
  },
  {
    position: '左下角',
    types: [
      CONTROL_TYPE_ENUM.LEFT,
      CONTROL_TYPE_ENUM.WIDTH,
      CONTROL_TYPE_ENUM.HEIGHT,
    ],
    style: { left: '-5px', bottom: '-5px', cursor: 'nesw-resize' },
  },
  {
    position: '左侧中间',
    types: [CONTROL_TYPE_ENUM.LEFT, CONTROL_TYPE_ENUM.WIDTH],
    style: {
      left: '-5px',
      top: '50%',
      cursor: 'w-resize',
      transform: 'translateX(-50%)',
    },
  },
] as ControlDot[];

// region 热区的缩放
export const HOT_ZONE_SCALE_RATE = 2; // 热区的缩放比例

/** 缩小：缩回适合手机屏幕的大小 */
export function zoomOut(list?: HotZoneItemProperty[]) {
  return (
    list?.map((hotZone) => ({
      ...hotZone,
      left: hotZone.left / HOT_ZONE_SCALE_RATE,
      top: hotZone.top / HOT_ZONE_SCALE_RATE,
      width: hotZone.width / HOT_ZONE_SCALE_RATE,
      height: hotZone.height / HOT_ZONE_SCALE_RATE,
    })) || []
  );
}

/** 放大：作用是为了方便在电脑屏幕上编辑 */
export function zoomIn(list?: HotZoneItemProperty[]) {
  return (
    list?.map((hotZone) => ({
      ...hotZone,
      left: hotZone.left * HOT_ZONE_SCALE_RATE,
      top: hotZone.top * HOT_ZONE_SCALE_RATE,
      width: hotZone.width * HOT_ZONE_SCALE_RATE,
      height: hotZone.height * HOT_ZONE_SCALE_RATE,
    })) || []
  );
}

/** 修正历史数据，确保热区不会落到编辑图片之外。 */
export function normalizeHotZones(
  list: HotZoneItemProperty[] = [],
  container: HotZoneContainerSize,
) {
  return list.map((hotZone) => {
    const width = normalizeDimension(hotZone.width, container.width);
    const height = normalizeDimension(hotZone.height, container.height);
    const left = normalizePosition(hotZone.left, container.width, width);
    const top = normalizePosition(hotZone.top, container.height, height);

    return { ...hotZone, left, top, width, height };
  });
}

function normalizeDimension(value: number, containerSize: number) {
  const numericValue = toFiniteNumber(value, HOT_ZONE_MIN_SIZE);
  if (containerSize <= 0) {
    return Math.max(HOT_ZONE_MIN_SIZE, numericValue);
  }
  return clamp(
    numericValue,
    HOT_ZONE_MIN_SIZE,
    Math.max(HOT_ZONE_MIN_SIZE, containerSize),
  );
}

function normalizePosition(value: number, containerSize: number, size: number) {
  const numericValue = toFiniteNumber(value, 0);
  if (containerSize <= 0) {
    return numericValue;
  }
  return clamp(numericValue, 0, Math.max(0, containerSize - size));
}

function toFiniteNumber(value: number, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

/** 将数值限制在 [min, max] 范围内。 */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// endregion

/**
 * 封装热区拖拽
 *
 * 注：为什么不使用vueuse的useDraggable。在本场景下，其使用方式比较复杂
 * @param hotZone 热区
 * @param downEvent 鼠标按下事件
 * @param callback 回调函数
 */
export const useDraggable = (
  hotZone: HotZoneItemProperty,
  downEvent: MouseEvent,
  callback: (
    left: number,
    top: number,
    width: number,
    height: number,
    moveWidth: number,
    moveHeight: number,
  ) => void,
) => {
  // 阻止事件冒泡、默认行为（避免拖拽时选中文本）
  downEvent.stopPropagation();
  downEvent.preventDefault();

  // 移动前的鼠标坐标
  const { clientX: startX, clientY: startY } = downEvent;
  // 移动前的热区坐标、大小
  const { left, top, width, height } = hotZone;

  // 监听鼠标移动
  const handleMouseMove = (e: MouseEvent) => {
    // 移动宽度
    const moveWidth = e.clientX - startX;
    // 移动高度
    const moveHeight = e.clientY - startY;
    // 移动回调
    callback(left, top, width, height, moveWidth, moveHeight);
  };

  // 松开鼠标后，结束拖拽
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};
