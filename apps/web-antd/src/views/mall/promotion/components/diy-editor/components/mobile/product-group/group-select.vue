<script setup lang="ts">
import type { MallProductGroupApi } from '#/api/mall/product/group';

import { computed, onMounted, ref } from 'vue';

import { Alert, Button, Select } from 'ant-design-vue';

import { getSimpleGroupList } from '#/api/mall/product/group';

import {
  getGroupDisplayName,
  getUnavailableGroupIds,
  isStorefrontGroup,
} from './availability';
import { PRODUCT_GROUP_LIMIT } from './utils';

const props = defineProps<{ modelValue?: number[]; single?: boolean }>();
const emit = defineEmits<{
  change: [id: number, name: string];
  loaded: [groups: MallProductGroupApi.Group[]];
  'update:modelValue': [ids: number[]];
}>();
const groups = ref<MallProductGroupApi.Group[]>([]);
const loading = ref(false);
const error = ref(false);
const loaded = ref(false);
const selectedIds = computed(() => props.modelValue || []);
const unavailableIds = computed(() =>
  loaded.value ? getUnavailableGroupIds(selectedIds.value, groups.value) : [],
);
const options = computed(() => [
  ...groups.value
    .filter((group) => isStorefrontGroup(group))
    .map((group) => ({
      label: group.name,
      value: group.id,
      disabled:
        !props.single &&
        selectedIds.value.length >= PRODUCT_GROUP_LIMIT &&
        !selectedIds.value.includes(group.id!),
    })),
  ...unavailableIds.value.map((id) => ({
    label: getGroupDisplayName(id, groups.value),
    value: id,
    disabled: true,
  })),
]);

async function refresh() {
  loading.value = true;
  error.value = false;
  try {
    groups.value = await getSimpleGroupList();
    loaded.value = true;
    emit('loaded', groups.value);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function change(value: unknown) {
  let ids: number[] = [];
  if (Array.isArray(value)) {
    ids = value.filter((id): id is number => typeof id === 'number');
  } else if (typeof value === 'number') {
    ids = [value];
  }
  // 保留已选失效项，必须由运营主动移除；不自动替换为其他分组。
  if (ids.length > PRODUCT_GROUP_LIMIT) return;
  emit('update:modelValue', ids);
  const group = groups.value.find((item) => item.id === ids[0]);
  if (props.single && group && isStorefrontGroup(group))
    emit('change', group.id!, group.name);
}

function remove(id: number) {
  emit(
    'update:modelValue',
    selectedIds.value.filter((value) => value !== id),
  );
}

onMounted(refresh);
</script>

<template>
  <Select
    :value="single ? selectedIds[0] : selectedIds"
    :mode="single ? undefined : 'multiple'"
    :options="options"
    :loading="loading"
    :disabled="loading || error"
    :max-tag-count="2"
    allow-clear
    show-search
    option-filter-prop="label"
    placeholder="请选择公开且启用的商品分组"
    class="w-full"
    @change="change"
  />
  <div class="mt-1 text-xs text-muted-foreground">
    {{
      single
        ? '仅展示公开且启用的分组'
        : `最多选择 ${PRODUCT_GROUP_LIMIT} 个公开且启用的分组`
    }}
    <Button type="link" size="small" :loading="loading" @click="refresh">
      刷新
    </Button>
  </div>
  <Alert
    v-if="error"
    type="error"
    show-icon
    message="分组加载失败，请刷新重试；已有选择已保留"
  />
  <Alert
    v-else-if="unavailableIds.length"
    type="warning"
    show-icon
    message="以下分组不会在商城展示，请主动移除或恢复分组状态"
  >
    <template #description>
      <div
        v-for="id in unavailableIds"
        :key="id"
        class="flex items-center justify-between gap-1"
      >
        <span>{{ getGroupDisplayName(id, groups) }}</span>
        <Button danger type="link" size="small" @click="remove(id)">
          移除
        </Button>
      </div>
    </template>
  </Alert>
</template>
