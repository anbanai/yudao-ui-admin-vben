<script setup lang="ts">
import type { ProductListProperty } from '../product-list/config';
import type { ProductCategoryProperty } from './config';

import type { MallCategoryApi } from '#/api/mall/product/category';
import type { MallSpuApi } from '#/api/mall/product/spu';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { CommonStatusEnum } from '@vben/constants';

import { Empty, Skeleton, Tabs } from 'ant-design-vue';

import { getCategoryList } from '#/api/mall/product/category';
import { getSpuPage } from '#/api/mall/product/spu';

import ProductList from '../product-list/index.vue';
import {
  buildProductCategoryQuery,
  createProductCategoryPreviewLoader,
  getProductCategoryPreviewState,
  orderSelectedCategories,
} from './utils';

defineOptions({ name: 'ProductCategory' });

const props = defineProps<{ property: ProductCategoryProperty }>();

const availableCategories = ref<MallCategoryApi.Category[]>([]);
const activeKey = ref('');
const spuList = ref<MallSpuApi.Spu[]>([]);
const isLoading = ref(false);
const hasLoaded = ref(false);
const categoryLoadFailed = ref(false);
const loadFailed = ref(false);
let mounted = true;
let refreshGeneration = 0;
let categoryRequest: Promise<boolean> | undefined;

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
const showTabs = computed(() => tabs.value.length > 1);
const previewState = computed(() =>
  getProductCategoryPreviewState({
    categoryCount: selectedCategories.value.length,
    failed: categoryLoadFailed.value || loadFailed.value,
    hasLoaded: hasLoaded.value,
    loading: isLoading.value,
    productCount: spuList.value.length,
  }),
);
const productListProperty = computed(
  () => ({ ...props.property, spuIds: [] }) as ProductListProperty,
);
const queryProperty = computed(() => ({
  ...props.property,
  categoryIds: selectedCategories.value.map(
    (category) => category.id as number,
  ),
}));
type ProductCategoryQuery = ReturnType<typeof buildProductCategoryQuery>;
const productLoader = createProductCategoryPreviewLoader<
  MallSpuApi.Spu,
  ProductCategoryQuery
>(async (query) => {
  const result = await getSpuPage(query);
  return result.list || [];
});

async function loadActiveTab() {
  const tabKey = activeKey.value;
  if (!tabKey) {
    spuList.value = [];
    isLoading.value = false;
    hasLoaded.value = true;
    loadFailed.value = false;
    return;
  }
  isLoading.value = true;
  hasLoaded.value = false;
  loadFailed.value = false;
  const result = await productLoader.load(
    tabKey,
    buildProductCategoryQuery(
      queryProperty.value,
      tabKey === 'all' ? 'all' : Number(tabKey),
    ),
  );
  if (result.accepted && mounted && activeKey.value === tabKey) {
    spuList.value = result.list;
    isLoading.value = false;
    hasLoaded.value = true;
    loadFailed.value = result.failed;
  }
}

function resetProducts() {
  productLoader.reset();
  spuList.value = [];
  isLoading.value = false;
  hasLoaded.value = false;
  loadFailed.value = false;
  const firstTab = tabs.value[0];
  const nextKey = firstTab?.id || '';
  if (activeKey.value === nextKey) {
    void loadActiveTab();
  } else {
    activeKey.value = nextKey;
  }
}

function loadCategories() {
  if (categoryRequest) return categoryRequest;
  categoryLoadFailed.value = false;
  isLoading.value = true;
  hasLoaded.value = false;
  const request = (async () => {
    try {
      const categories = await getCategoryList({
        status: CommonStatusEnum.ENABLE,
      });
      if (!mounted) return false;
      availableCategories.value = categories.filter(
        (category) => category.status === CommonStatusEnum.ENABLE,
      );
      return true;
    } catch {
      if (!mounted) return false;
      availableCategories.value = [];
      categoryLoadFailed.value = true;
      isLoading.value = false;
      hasLoaded.value = true;
      loadFailed.value = true;
      return false;
    }
  })();
  categoryRequest = request;
  void request.finally(() => {
    if (categoryRequest === request) categoryRequest = undefined;
  });
  return request;
}

async function resetCategoryProducts(forceCategoryLoad = false) {
  const generation = ++refreshGeneration;
  if (
    (forceCategoryLoad || categoryLoadFailed.value || categoryRequest) &&
    !(await loadCategories())
  ) {
    return;
  }
  if (!mounted || generation !== refreshGeneration) return;
  resetProducts();
}

watch(activeKey, () => void loadActiveTab());
watch(
  () => [
    props.property.categoryIds,
    props.property.pageSize,
    props.property.showAll,
    props.property.sortType,
  ],
  () => void resetCategoryProducts(),
  { deep: true },
);

onMounted(() => {
  void resetCategoryProducts(true);
});
onUnmounted(() => {
  mounted = false;
  refreshGeneration += 1;
  productLoader.reset();
});
</script>

<template>
  <div class="min-h-[30px] w-full">
    <div
      v-if="showTabs"
      class="relative z-20 isolate bg-white"
      :class="property.sticky ? 'sticky top-0' : ''"
    >
      <Tabs v-model:active-key="activeKey" size="small" :animated="false">
        <Tabs.TabPane v-for="tab in tabs" :key="tab.id" :tab="tab.name" />
      </Tabs>
    </div>
    <div v-if="previewState === 'loading'" class="p-4">
      <Skeleton active :paragraph="{ rows: 2 }" />
    </div>
    <Empty
      v-else-if="previewState === 'failed'"
      description="商品加载失败"
      class="py-8"
    />
    <Empty
      v-else-if="previewState === 'emptyCategory'"
      description="暂无可用分类"
      class="py-8"
    />
    <Empty
      v-else-if="previewState === 'emptyProduct'"
      description="该分类暂无商品"
      class="py-8"
    />
    <ProductList v-else :property="productListProperty" :spu-list="spuList" />
  </div>
</template>
