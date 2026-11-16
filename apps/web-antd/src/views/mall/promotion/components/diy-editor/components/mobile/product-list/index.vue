<script setup lang="ts">
import type { ProductListProperty } from './config';

import type { MallSpuApi } from '#/api/mall/product/spu';

import { computed, onMounted, ref, watch } from 'vue';

import { fenToYuan } from '@vben/utils';

import { Button, Image } from 'ant-design-vue';

import { getGroupSpuPage, getSimpleGroupList } from '#/api/mall/product/group';
import { getSpuDetailList } from '#/api/mall/product/spu';

import {
  getGroupDisplayName,
  getUnavailableGroupIds,
} from '../product-group/availability';
import { createRequestGuard } from '../product-group/utils';
import { buildProductListGroupQuery, orderManualProducts } from './utils';

/** 商品栏 */
defineOptions({ name: 'ProductList' });

const props = defineProps<{
  property: ProductListProperty;
  spuList?: MallSpuApi.Spu[];
}>();

const fetchedSpuList = ref<MallSpuApi.Spu[]>([]);
const displaySpuList = computed(() => props.spuList ?? fetchedSpuList.value);
const loading = ref(false);
const failed = ref(false);
const unavailableNames = ref<string[]>([]);
const requestGuard = createRequestGuard();
const isGroupSource = computed(
  () => props.property.sourceType === 'group' && props.spuList === undefined,
);

async function refreshProducts() {
  const request = requestGuard.next();
  fetchedSpuList.value = [];
  unavailableNames.value = [];
  failed.value = false;
  loading.value = false;
  if (props.spuList !== undefined) return;
  const ids = props.property.spuIds || [];
  const query = buildProductListGroupQuery(props.property);
  if (isGroupSource.value ? query.groupIds.length === 0 : ids.length === 0)
    return;
  loading.value = true;
  try {
    if (isGroupSource.value) {
      const groups = await getSimpleGroupList();
      if (!requestGuard.isCurrent(request)) return;
      const unavailable = getUnavailableGroupIds(query.groupIds, groups);
      unavailableNames.value = unavailable.map((id) =>
        getGroupDisplayName(id, groups),
      );
      query.groupIds = query.groupIds.filter((id) => !unavailable.includes(id));
      // 空分组不能退化为查询全部商品。
      if (query.groupIds.length === 0) return;
      const result = await getGroupSpuPage(query);
      if (requestGuard.isCurrent(request))
        fetchedSpuList.value = result.list || [];
    } else {
      const result = await getSpuDetailList(ids);
      if (requestGuard.isCurrent(request))
        fetchedSpuList.value = orderManualProducts(ids, result);
    }
  } catch {
    if (requestGuard.isCurrent(request)) failed.value = true;
  } finally {
    if (requestGuard.isCurrent(request)) loading.value = false;
  }
}

watch(
  () => [
    props.property.sourceType,
    props.property.spuIds,
    props.property.groupIds,
    props.property.pageSize,
    props.property.sortType,
    props.spuList,
  ],
  refreshProducts,
  {
    immediate: true,
    deep: true,
  },
);

const phoneWidth = ref(375); // 手机宽度
const containerRef = ref(); // 容器
const columns = ref(2); // 商品的列数
const scrollbarWidth = ref('100%'); // 滚动条宽度
const imageSize = ref('0'); // 商品图大小
const gridTemplateColumns = ref(''); // 商品网络列数

/** 计算布局参数 */
watch(
  () => [props.property, phoneWidth, displaySpuList.value.length],
  () => {
    // 计算列数
    columns.value = props.property.layoutType === 'twoCol' ? 2 : 3;
    // 每列的宽度为：（总宽度 - 间距 * (列数 - 1)）/ 列数
    const productWidth =
      (phoneWidth.value - props.property.space * (columns.value - 1)) /
      columns.value;
    // 商品图布局：2列时，左右布局 3列时，上下布局
    imageSize.value = columns.value === 2 ? '64px' : `${productWidth}px`;
    // 根据布局类型，计算行数、列数
    if (props.property.layoutType === 'horizSwiper') {
      // 单行显示
      gridTemplateColumns.value = `repeat(auto-fill, ${productWidth}px)`;
      // 显示滚动条
      scrollbarWidth.value = `${
        productWidth * displaySpuList.value.length +
        props.property.space * Math.max(displaySpuList.value.length - 1, 0)
      }px`;
    } else {
      // 指定列数
      gridTemplateColumns.value = `repeat(${columns.value}, auto)`;
      // 不滚动
      scrollbarWidth.value = '100%';
    }
  },
  { immediate: true, deep: true },
);

/** 初始化 */
onMounted(() => {
  phoneWidth.value = containerRef.value?.offsetWidth || 375;
});
</script>
<template>
  <div class="z-10 min-h-[30px] w-full" ref="containerRef">
    <div
      v-if="isGroupSource"
      class="mb-2 flex items-center justify-between text-xs text-muted-foreground"
    >
      <span>分组商品实时预览</span>
      <Button
        size="small"
        type="link"
        :loading="loading"
        @click.stop="refreshProducts"
      >
        刷新
      </Button>
    </div>
    <div
      v-if="unavailableNames.length"
      class="mb-2 text-xs text-amber-600"
      role="status"
    >
      以下分组不可展示：{{ unavailableNames.join('、') }}
    </div>
    <div
      v-if="loading"
      class="p-4 text-center text-sm text-muted-foreground"
      role="status"
    >
      商品加载中…
    </div>
    <div v-else-if="failed" class="p-4 text-center text-sm" role="alert">
      商品加载失败
      <Button type="link" size="small" @click.stop="refreshProducts">
        重试
      </Button>
    </div>
    <div
      v-else-if="!displaySpuList.length"
      class="p-4 text-center text-sm text-muted-foreground"
    >
      {{
        isGroupSource && !property.groupIds?.length
          ? '请选择商品分组'
          : '暂无可展示商品'
      }}
    </div>
    <!-- 商品网格 -->
    <div
      class="grid overflow-x-auto"
      :style="{
        gridGap: `${property.space}px`,
        gridTemplateColumns,
        width: scrollbarWidth,
      }"
    >
      <!-- 商品 -->
      <div
        class="relative box-content flex flex-row flex-wrap overflow-hidden bg-background"
        :style="{
          borderTopLeftRadius: `${property.borderRadiusTop}px`,
          borderTopRightRadius: `${property.borderRadiusTop}px`,
          borderBottomLeftRadius: `${property.borderRadiusBottom}px`,
          borderBottomRightRadius: `${property.borderRadiusBottom}px`,
        }"
        v-for="(spu, index) in displaySpuList"
        :key="index"
      >
        <!-- 角标 -->
        <div
          v-if="property.badge.show"
          class="absolute left-0 top-0 z-10 items-center justify-center"
        >
          <Image
            :src="property.badge.imgUrl"
            :preview="false"
            class="h-[26px] w-[38px] object-cover"
          />
        </div>
        <!-- 商品封面图 -->
        <Image
          :src="spu.picUrl"
          :style="{ width: imageSize, height: imageSize, objectFit: 'cover' }"
          :preview="false"
        />
        <div
          class="box-border flex flex-col gap-2 p-2"
          :class="[
            {
              'w-[calc(100%-64px)]': columns === 2,
              'w-full': columns === 3,
            },
          ]"
        >
          <!-- 商品名称 -->
          <div
            v-if="property.fields.name.show"
            class="truncate text-xs"
            :style="{ color: property.fields.name.color }"
          >
            {{ spu.name }}
          </div>
          <div>
            <!-- 商品价格 -->
            <span
              v-if="property.fields.price.show"
              class="text-xs"
              :style="{ color: property.fields.price.color }"
            >
              ￥{{ fenToYuan(spu.price || 0) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="isGroupSource && property.showMore && displaySpuList.length"
      class="mt-2 text-center text-xs text-muted-foreground"
    >
      查看更多 ›
    </div>
  </div>
</template>
