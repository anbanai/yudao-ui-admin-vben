<script lang="ts" setup>
import type { MallCategoryApi } from '#/api/mall/product/category';

import { computed, onMounted, ref } from 'vue';

import { handleTree } from '@vben/utils';

import { TreeSelect } from 'ant-design-vue';

import { getCategoryList } from '#/api/mall/product/category';

/** 商品分类选择组件 */
defineOptions({ name: 'ProductCategorySelect' });

const props = defineProps({
  modelValue: {
    type: [Number, Array<number>],
    default: undefined,
  }, // 选中的 ID
  multiple: {
    type: Boolean,
    default: false,
  }, // 是否多选
  parentId: {
    type: Number,
    default: undefined,
  }, // 上级品类的编号
});

/** 分类选择 */
const emit = defineEmits<{
  categorySelected: [category?: { id: number; name: string }];
  'update:modelValue': [value?: number | number[]];
}>();

type CategoryTree = MallCategoryApi.Category & { children?: CategoryTree[] };
type SelectedCategory = { id: number; name: string };

const categoryList = ref<CategoryTree[]>([]); // 分类树

/** 选中的分类 ID */
const selectCategoryId = computed({
  get: () => {
    return props.modelValue;
  },
  set: (val: number | number[] | undefined) => {
    emit('update:modelValue', val);
    const category = findCategory(categoryList.value, val);
    emit('categorySelected', category);
  },
});

function findCategory(
  list: CategoryTree[],
  value?: number | number[],
): SelectedCategory | undefined {
  if (value === undefined || Array.isArray(value)) {
    return undefined;
  }
  for (const category of list) {
    if (category.id === value && typeof category.id === 'number') {
      return { id: category.id, name: category.name };
    }
    const child: SelectedCategory | undefined = findCategory(
      category.children || [],
      value,
    );
    if (child) {
      return child;
    }
  }
  return undefined;
}

/** 初始化 */
onMounted(async () => {
  const data = await getCategoryList({
    parentId: props.parentId,
  });
  categoryList.value = handleTree(data, 'id', 'parentId') as CategoryTree[];
});
</script>
<template>
  <TreeSelect
    v-model:value="selectCategoryId"
    :tree-data="categoryList"
    :field-names="{
      children: 'children',
      label: 'name',
      value: 'id',
    }"
    :multiple="multiple"
    :tree-checkable="multiple"
    class="w-full"
    placeholder="请选择商品分类"
    allow-clear
    tree-default-expand-all
  />
</template>
