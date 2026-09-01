<script setup lang="ts">
import type { ProductListProperty } from '../product-list/config';
import type { ProductGroupProperty } from './config';

import type { MallProductGroupApi } from '#/api/mall/product/group';
import type { MallSpuApi } from '#/api/mall/product/spu';

import { computed, onMounted, ref, watch } from 'vue';

import { CommonStatusEnum } from '@vben/constants';

import { Tabs } from 'ant-design-vue';

import { getGroupSpuPage, getSimpleGroupList } from '#/api/mall/product/group';

import ProductList from '../product-list/index.vue';
import {
  buildProductGroupQuery,
  createPreviewProductLoader,
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
    <ProductList :property="productListProperty" :spu-list="spuList" />
  </div>
</template>
