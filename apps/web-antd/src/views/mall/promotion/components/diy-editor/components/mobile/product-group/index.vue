<script setup lang="ts">
import type { ProductListProperty } from '../product-list/config';
import type { ProductGroupProperty } from './config';

import type { MallProductGroupApi } from '#/api/mall/product/group';
import type { MallSpuApi } from '#/api/mall/product/spu';

import { computed, onMounted, ref, watch } from 'vue';

import { CommonStatusEnum } from '@vben/constants';

import { getGroupSpuPage, getSimpleGroupList } from '#/api/mall/product/group';

import ProductList from '../product-list/index.vue';
import {
  buildProductGroupQuery,
  createPreviewProductLoader,
  normalizeProductGroupProperty,
  orderSelectedGroups,
} from './utils';

defineOptions({ name: 'ProductGroup' });

const props = defineProps<{ property: ProductGroupProperty }>();

const availableGroups = ref<MallProductGroupApi.Group[]>([]);
const activeKey = ref('');
const spuList = ref<MallSpuApi.Spu[]>([]);

const selectedGroups = computed(() =>
  orderSelectedGroups(props.property.groupIds, availableGroups.value),
);
const tabs = computed(() => [
  ...(props.property.showAll && selectedGroups.value.length > 0
    ? [{ id: 'all', name: '全部' }]
    : []),
  ...selectedGroups.value.map((group) => ({
    id: String(group.id),
    name: group.name,
  })),
]);
const showTabs = computed(() => tabs.value.length > 1);
const menu = computed(() => normalizeProductGroupProperty(props.property).menu);
const isVerticalMenu = computed(
  () => showTabs.value && menu.value.layout === 'vertical',
);
const productListProperty = computed(
  () => ({ ...props.property, spuIds: [] }) as ProductListProperty,
);
const queryProperty = computed(() => ({
  ...props.property,
  groupIds: selectedGroups.value.map((group) => group.id as number),
}));
type ProductGroupQuery = ReturnType<typeof buildProductGroupQuery>;
const productLoader = createPreviewProductLoader<
  MallSpuApi.Spu,
  ProductGroupQuery
>(async (query) => {
  const result = await getGroupSpuPage(query);
  return result.list || [];
});

async function loadActiveTab() {
  const tabKey = activeKey.value;
  if (!tabKey) {
    spuList.value = [];
    return;
  }
  const result = await productLoader.load(
    tabKey,
    buildProductGroupQuery(
      queryProperty.value,
      tabKey === 'all' ? 'all' : Number(tabKey),
    ),
  );
  if (result.accepted && activeKey.value === tabKey) {
    spuList.value = result.list;
  }
}

function resetProducts() {
  productLoader.reset();
  const firstTab = tabs.value[0];
  const nextKey = firstTab?.id || '';
  if (activeKey.value === nextKey) {
    void loadActiveTab();
  } else {
    activeKey.value = nextKey;
  }
}

function getMenuItemStyle(tabId: string) {
  const active = activeKey.value === tabId;
  return {
    backgroundColor: active
      ? menu.value.activeBackgroundColor
      : menu.value.backgroundColor,
    color: active ? menu.value.activeColor : menu.value.color,
    fontWeight: active ? '600' : '400',
  };
}

watch(activeKey, () => void loadActiveTab());
watch(
  () => [
    props.property.groupIds,
    props.property.pageSize,
    props.property.showAll,
    props.property.sortType,
  ],
  resetProducts,
  { deep: true },
);

onMounted(async () => {
  try {
    const groups = await getSimpleGroupList();
    availableGroups.value = groups.filter(
      (group) => group.status === CommonStatusEnum.ENABLE,
    );
  } catch {
    availableGroups.value = [];
  }
  resetProducts();
});
</script>

<template>
  <div
    class="product-group min-h-[30px] w-full"
    :class="{ 'product-group--vertical': isVerticalMenu }"
  >
    <nav
      v-if="showTabs"
      aria-label="商品分组"
      class="product-group-menu relative z-20 isolate"
      :class="[
        isVerticalMenu
          ? 'product-group-menu--vertical'
          : 'product-group-menu--horizontal',
        property.sticky ? 'sticky top-0' : '',
      ]"
      :style="{ backgroundColor: menu.backgroundColor }"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="product-group-menu__item"
        :aria-current="activeKey === tab.id ? 'page' : undefined"
        :style="getMenuItemStyle(tab.id)"
        @click="activeKey = tab.id"
      >
        {{ tab.name }}
      </button>
    </nav>
    <div class="product-group__content min-w-0 flex-1">
      <ProductList
        :key="menu.layout"
        :property="productListProperty"
        :spu-list="spuList"
      />
    </div>
  </div>
</template>

<style scoped>
.product-group--vertical {
  display: flex;
  align-items: stretch;
}

.product-group-menu--horizontal {
  display: flex;
  width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid rgb(0 0 0 / 6%);
}

.product-group-menu--horizontal::-webkit-scrollbar {
  display: none;
}

.product-group-menu--vertical {
  flex-shrink: 0;
  align-self: flex-start;
  width: 88px;
  max-height: 100dvh;
  overflow-y: auto;
}

.product-group-menu__item {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 8px 16px;
  font-size: 13px;
  line-height: 20px;
  letter-spacing: 0;
  cursor: pointer;
  outline: 0;
  border: 0;
}

.product-group-menu--horizontal .product-group-menu__item {
  flex-shrink: 0;
  white-space: nowrap;
}

.product-group-menu--vertical .product-group-menu__item {
  width: 100%;
  padding-right: 8px;
  padding-left: 8px;
  overflow-wrap: anywhere;
}
</style>
