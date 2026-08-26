<script setup lang="ts">
import type { ProductGroupProperty } from './config';

import type { MallCategoryApi } from '#/api/mall/product/category';

import { computed, onMounted, ref, watch } from 'vue';

import { CommonStatusEnum } from '@vben/constants';
import { IconifyIcon } from '@vben/icons';
import { handleTree } from '@vben/utils';

import { useVModel } from '@vueuse/core';
import {
  Button,
  Card,
  Checkbox,
  Form,
  FormItem,
  InputNumber,
  RadioButton,
  RadioGroup,
  Select,
  Slider,
  Switch,
  Tooltip,
  TreeSelect,
} from 'ant-design-vue';
import VueDraggable from 'vuedraggable';

import { getCategoryList } from '#/api/mall/product/category';
import UploadImg from '#/components/upload/image-upload.vue';
import { ColorInput } from '#/views/mall/promotion/components';

import ComponentContainerProperty from '../../component-container-property.vue';
import {
  clampProductGroupPageSize,
  normalizeCategoryIds,
  normalizeTreeSelectCategoryIds,
  orderSelectedCategories,
  PRODUCT_GROUP_CATEGORY_LIMIT,
} from './utils';

defineOptions({ name: 'ProductGroupProperty' });

const props = defineProps<{ modelValue: ProductGroupProperty }>();
const emit = defineEmits(['update:modelValue']);
const formData = useVModel(props, 'modelValue', emit);

const categories = ref<MallCategoryApi.Category[]>([]);
const categoryTree = computed(() =>
  handleTree([...categories.value], 'id', 'parentId'),
);
const selectedCategories = computed(() =>
  orderSelectedCategories(formData.value.categoryIds, categories.value),
);
const selectedCategoryIds = computed({
  get: () => formData.value.categoryIds,
  set: (value: unknown[]) => {
    formData.value.categoryIds = normalizeTreeSelectCategoryIds(value || []);
  },
});

function getCategoryItemKey(categoryId: number) {
  return categoryId;
}

function getCategoryName(categoryId: number) {
  return (
    categories.value.find((category) => category.id === categoryId)?.name ||
    `分类 ${categoryId}`
  );
}

function handleRemoveCategory(categoryId: number) {
  formData.value.categoryIds = formData.value.categoryIds.filter(
    (id) => id !== categoryId,
  );
}

function normalizePageSize() {
  formData.value.pageSize = clampProductGroupPageSize(formData.value.pageSize);
}

watch(
  () => formData.value.categoryIds,
  (value) => {
    const normalized = normalizeCategoryIds(value || []);
    if (normalized.join(',') !== (value || []).join(',')) {
      formData.value.categoryIds = normalized;
    }
  },
  { deep: true },
);

onMounted(async () => {
  try {
    const data = await getCategoryList({ status: CommonStatusEnum.ENABLE });
    categories.value = data.filter(
      (category) => category.status === CommonStatusEnum.ENABLE,
    );
  } catch {
    categories.value = [];
  }
});
</script>

<template>
  <ComponentContainerProperty v-model="formData.style">
    <Form
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
      :model="formData"
    >
      <Card title="商品分类" class="property-group" :bordered="false">
        <FormItem label="选择分类" required>
          <TreeSelect
            v-model:value="selectedCategoryIds"
            :tree-data="categoryTree"
            :field-names="{ children: 'children', label: 'name', value: 'id' }"
            :max-tag-count="2"
            :max-tag-placeholder="() => `已选 ${selectedCategoryIds.length} 个`"
            allow-clear
            multiple
            show-search
            tree-checkable
            tree-check-strictly
            tree-default-expand-all
            placeholder="请选择商品分类"
          />
          <div class="mt-1 text-xs text-gray-500">
            最多选择 {{ PRODUCT_GROUP_CATEGORY_LIMIT }} 个分类
          </div>
        </FormItem>

        <div v-if="selectedCategories.length" class="mt-2">
          <div class="mb-2 text-xs text-gray-500">拖动调整菜单顺序</div>
          <VueDraggable
            v-model="formData.categoryIds"
            :animation="200"
            :item-key="getCategoryItemKey"
            handle=".category-drag-handle"
          >
            <template #item="{ element }">
              <div
                class="mb-2 flex h-9 items-center gap-2 rounded border border-gray-200 bg-secondary px-2"
              >
                <IconifyIcon
                  icon="lucide:grip-vertical"
                  class="category-drag-handle cursor-move text-gray-400"
                />
                <span class="min-w-0 flex-1 truncate text-sm">
                  {{ getCategoryName(element) }}
                </span>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    danger
                    shape="circle"
                    size="small"
                    @click="handleRemoveCategory(element)"
                  >
                    <template #icon>
                      <IconifyIcon icon="lucide:x" />
                    </template>
                  </Button>
                </Tooltip>
              </div>
            </template>
          </VueDraggable>
        </div>

        <FormItem label="显示全部" name="showAll">
          <Switch v-model:checked="formData.showAll" />
        </FormItem>
        <FormItem label="菜单吸顶" name="sticky">
          <Switch v-model:checked="formData.sticky" />
        </FormItem>
        <FormItem label="商品数量" name="pageSize">
          <InputNumber
            v-model:value="formData.pageSize"
            :min="1"
            :max="50"
            class="w-full"
            @blur="normalizePageSize"
          />
        </FormItem>
        <FormItem label="商品排序" name="sortType">
          <Select
            v-model:value="formData.sortType"
            :options="[
              { label: '综合排序', value: 'default' },
              { label: '最新上架', value: 'latest' },
              { label: '销量优先', value: 'sales' },
              { label: '价格升序', value: 'priceAsc' },
              { label: '价格降序', value: 'priceDesc' },
            ]"
          />
        </FormItem>
      </Card>

      <Card title="商品样式" class="property-group" :bordered="false">
        <FormItem label="布局" name="layoutType">
          <RadioGroup v-model:value="formData.layoutType">
            <Tooltip title="双列" placement="bottom">
              <RadioButton value="twoCol">
                <IconifyIcon
                  icon="fluent:text-column-two-24-filled"
                  class="size-6"
                />
              </RadioButton>
            </Tooltip>
            <Tooltip title="三列" placement="bottom">
              <RadioButton value="threeCol">
                <IconifyIcon
                  icon="fluent:text-column-three-24-filled"
                  class="size-6"
                />
              </RadioButton>
            </Tooltip>
            <Tooltip title="水平滑动" placement="bottom">
              <RadioButton value="horizSwiper">
                <IconifyIcon icon="system-uicons:carousel" class="size-6" />
              </RadioButton>
            </Tooltip>
          </RadioGroup>
        </FormItem>
        <FormItem label="商品名称" name="fields.name.show">
          <div class="flex gap-2">
            <ColorInput v-model="formData.fields.name.color" />
            <Checkbox v-model:checked="formData.fields.name.show" />
          </div>
        </FormItem>
        <FormItem label="商品价格" name="fields.price.show">
          <div class="flex gap-2">
            <ColorInput v-model="formData.fields.price.color" />
            <Checkbox v-model:checked="formData.fields.price.show" />
          </div>
        </FormItem>
      </Card>

      <Card title="角标" class="property-group" :bordered="false">
        <FormItem label="显示角标" name="badge.show">
          <Switch v-model:checked="formData.badge.show" />
        </FormItem>
        <FormItem
          v-if="formData.badge.show"
          label="角标图片"
          name="badge.imgUrl"
        >
          <UploadImg
            v-model="formData.badge.imgUrl"
            height="44px"
            width="72px"
            :show-description="false"
          >
            <template #tip>建议尺寸：36 * 22</template>
          </UploadImg>
        </FormItem>
      </Card>

      <Card title="圆角与间距" class="property-group" :bordered="false">
        <FormItem label="上圆角" name="borderRadiusTop">
          <Slider
            v-model:value="formData.borderRadiusTop"
            :max="100"
            :min="0"
          />
        </FormItem>
        <FormItem label="下圆角" name="borderRadiusBottom">
          <Slider
            v-model:value="formData.borderRadiusBottom"
            :max="100"
            :min="0"
          />
        </FormItem>
        <FormItem label="间隔" name="space">
          <Slider v-model:value="formData.space" :max="100" :min="0" />
        </FormItem>
      </Card>
    </Form>
  </ComponentContainerProperty>
</template>
