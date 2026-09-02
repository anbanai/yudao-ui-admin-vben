<script setup lang="ts">
import type { ProductGroupProperty } from './config';

import type { MallProductGroupApi } from '#/api/mall/product/group';

import { computed, onMounted, ref, watch } from 'vue';

import { CommonStatusEnum } from '@vben/constants';
import { IconifyIcon } from '@vben/icons';

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
} from 'ant-design-vue';
import VueDraggable from 'vuedraggable';

import { getSimpleGroupList } from '#/api/mall/product/group';
import UploadImg from '#/components/upload/image-upload.vue';
import ColorInput from '#/views/mall/promotion/components/color-input/index.vue';

import ComponentContainerProperty from '../../component-container-property.vue';
import {
  clampProductGroupPageSize,
  normalizeGroupIds,
  orderSelectedGroups,
  PRODUCT_GROUP_LIMIT,
} from './utils';

defineOptions({ name: 'ProductGroupProperty' });

const props = defineProps<{ modelValue: ProductGroupProperty }>();
const emit = defineEmits(['update:modelValue']);
const formData = useVModel(props, 'modelValue', emit);

const groups = ref<MallProductGroupApi.Group[]>([]);
const groupOptions = computed(() =>
  groups.value.map((group) => ({
    label: group.name,
    value: group.id,
    disabled: group.status !== CommonStatusEnum.ENABLE,
  })),
);
const selectedGroups = computed(() =>
  orderSelectedGroups(formData.value.groupIds, groups.value),
);

function getGroupItemKey(groupId: number) {
  return groupId;
}

function getGroupName(groupId: number) {
  return (
    groups.value.find((group) => group.id === groupId)?.name ||
    `分组 ${groupId}`
  );
}

function handleRemoveGroup(groupId: number) {
  const group = groups.value.find((item) => item.id === groupId);
  if (group?.status !== CommonStatusEnum.ENABLE) return;
  formData.value.groupIds = formData.value.groupIds.filter(
    (id) => id !== groupId,
  );
}

function normalizePageSize() {
  formData.value.pageSize = clampProductGroupPageSize(formData.value.pageSize);
}

watch(
  () => formData.value.groupIds,
  (value) => {
    const normalized = normalizeGroupIds(value || []);
    if (normalized.join(',') !== (value || []).join(',')) {
      formData.value.groupIds = normalized;
    }
  },
  { deep: true },
);

onMounted(async () => {
  try {
    groups.value = await getSimpleGroupList();
  } catch {
    groups.value = [];
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
      <Card title="商品分组" class="property-group" :bordered="false">
        <FormItem label="选择分组" required>
          <Select
            v-model:value="formData.groupIds"
            :options="groupOptions"
            :max-tag-count="2"
            :max-count="PRODUCT_GROUP_LIMIT"
            :max-tag-placeholder="() => `已选 ${formData.groupIds.length} 个`"
            allow-clear
            mode="multiple"
            show-search
            option-filter-prop="label"
            placeholder="请选择商品分组"
          />
          <div class="mt-1 text-xs text-muted-foreground">
            最多选择 {{ PRODUCT_GROUP_LIMIT }} 个分组，禁用分组仅保留已有关系
          </div>
        </FormItem>

        <div v-if="selectedGroups.length" class="mt-2">
          <div class="mb-2 text-xs text-muted-foreground">拖动调整菜单顺序</div>
          <VueDraggable
            v-model="formData.groupIds"
            :animation="200"
            :item-key="getGroupItemKey"
            handle=".group-drag-handle"
          >
            <template #item="{ element }">
              <div
                class="mb-2 flex h-9 items-center gap-2 rounded border border-border bg-secondary px-2"
              >
                <IconifyIcon
                  icon="lucide:grip-vertical"
                  class="group-drag-handle cursor-move text-muted-foreground"
                />
                <span class="min-w-0 flex-1 truncate text-sm">
                  {{ getGroupName(element) }}
                </span>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    danger
                    shape="circle"
                    size="small"
                    :disabled="
                      groups.find((item) => item.id === element)?.status !==
                      CommonStatusEnum.ENABLE
                    "
                    @click="handleRemoveGroup(element)"
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

      <Card title="分类样式" class="property-group" :bordered="false">
        <FormItem label="布局" name="menu.layout">
          <RadioGroup v-model:value="formData.menu.layout">
            <Tooltip title="顶部横排" placement="bottom">
              <RadioButton value="horizontal">
                <IconifyIcon icon="lucide:panel-top" class="size-6" />
              </RadioButton>
            </Tooltip>
            <Tooltip title="左侧竖排" placement="bottom">
              <RadioButton value="vertical">
                <IconifyIcon icon="lucide:panel-left" class="size-6" />
              </RadioButton>
            </Tooltip>
          </RadioGroup>
        </FormItem>
        <FormItem label="分类文字" name="menu.color">
          <ColorInput v-model="formData.menu.color" />
        </FormItem>
        <FormItem label="选中文字" name="menu.activeColor">
          <ColorInput v-model="formData.menu.activeColor" />
        </FormItem>
        <FormItem label="菜单背景" name="menu.backgroundColor">
          <ColorInput v-model="formData.menu.backgroundColor" />
        </FormItem>
        <FormItem label="选中背景" name="menu.activeBackgroundColor">
          <ColorInput v-model="formData.menu.activeBackgroundColor" />
        </FormItem>
        <FormItem label="菜单吸顶" name="sticky">
          <Switch v-model:checked="formData.sticky" />
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
