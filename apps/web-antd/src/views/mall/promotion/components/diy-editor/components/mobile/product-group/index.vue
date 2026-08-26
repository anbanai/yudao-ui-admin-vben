<script setup lang="ts">
import type { ProductListProperty } from '../product-list/config';
import type { ProductGroupProperty } from './config';

import type { MallCategoryApi } from '#/api/mall/product/category';
import type { MallSpuApi } from '#/api/mall/product/spu';

import { computed, onMounted, ref, watch } from 'vue';

import { CommonStatusEnum } from '@vben/constants';

import { Tabs } from 'ant-design-vue';

import { getCategoryList } from '#/api/mall/product/category';
import { getSpuPage } from '#/api/mall/product/spu';

import ProductList from '../product-list/index.vue';
import {
  buildProductGroupQuery,
  createPreviewProductLoader,
  orderSelectedCategories,
} from './utils';

defineOptions({ name: 'ProductGroup' });

const props = defineProps<{ property: ProductGroupProperty }>();

const availableCategories = ref<MallCategoryApi.Category[]>([]);
const activeKey = ref('');
const spuList = ref<MallSpuApi.Spu[]>([]);

const selectedCategories = computed(() =>
  orderSelectedCategories(
    props.property.categoryIds,
    availableCategories.value,
  ),
);
const tabs = computed(() => [
  ...(props.property.showAll && selectedCategories.value.length > 0
    ? [{ id: 'all', name: '全部' }]
    : []),
  ...selectedCategories.value.map((category) => ({
    id: String(category.id),
    name: category.name,
  })),
]);
const productListProperty = computed(
  () => ({ ...props.property, spuIds: [] }) as ProductListProperty,
);
const queryProperty = computed(() => ({
  ...props.property,
  categoryIds: selectedCategories.value.map(
    (category) => category.id as number,
  ),
}));
type ProductGroupQuery = ReturnType<typeof buildProductGroupQuery>;
const productLoader = createPreviewProductLoader<
  MallSpuApi.Spu,
  ProductGroupQuery
>(async (query) => {
  const result = await getSpuPage(query);
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

watch(activeKey, () => void loadActiveTab());
watch(
  () => [
    props.property.categoryIds,
    props.property.pageSize,
    props.property.showAll,
    props.property.sortType,
  ],
  resetProducts,
  { deep: true },
);

onMounted(async () => {
  try {
    const categories = await getCategoryList({
      status: CommonStatusEnum.ENABLE,
    });
    availableCategories.value = categories.filter(
      (category) => category.status === CommonStatusEnum.ENABLE,
    );
  } catch {
    availableCategories.value = [];
  }
  resetProducts();
});
</script>

<template>
  <div class="min-h-[30px] w-full">
    <div
      v-if="tabs.length"
      class="relative z-20 isolate bg-white"
      :class="property.sticky ? 'sticky top-0' : ''"
    >
      <Tabs v-model:active-key="activeKey" size="small" :animated="false">
        <Tabs.TabPane v-for="tab in tabs" :key="tab.id" :tab="tab.name" />
      </Tabs>
    </div>
    <ProductList :property="productListProperty" :spu-list="spuList" />
  </div>
</template>
