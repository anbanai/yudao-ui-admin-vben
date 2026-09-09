<!-- 商品发布 - 库存价格 - 属性列表 -->
<script lang="ts" setup>
import type { MallPropertyApi } from '#/api/mall/product/property';
import type { PropertyAndValues } from '#/views/mall/product/spu/components';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Col, Divider, message, Select, Tag } from 'ant-design-vue';

import {
  createPropertyValue,
  getPropertyValueSimpleList,
} from '#/api/mall/product/property';
import { $t } from '#/locales';

defineOptions({ name: 'ProductAttributes' });

const props = withDefaults(defineProps<Props>(), {
  propertyList: () => [],
  changeVersion: 0,
  isDetail: false,
});

const emit = defineEmits<{
  (e: 'change', value: PropertyAndValues[]): void;
}>();

interface Props {
  changeVersion?: number;
  propertyList?: PropertyAndValues[];
  isDetail?: boolean;
}

const inputValue = ref<string[]>([]); // 输入框值（tags 模式使用数组）
const activePropertyId = ref<null | number>(null);
const inputVisible = computed(
  () => (propertyId: number) => activePropertyId.value === propertyId,
); // 输入框显隐控制

interface InputRefItem {
  inputRef?: {
    attributes: {
      id: string;
    };
  };
  focus?: () => void;
}

const inputRef = ref(new Map<number, InputRefItem>()); // 标签输入框 Ref
const attributeList = ref<PropertyAndValues[]>([]); // 商品属性列表
const attributeOptions = ref<MallPropertyApi.PropertyValue[]>([]); // 商品属性值下拉框
const pendingValues = new Set<string>(); // 正在保存的属性值，避免 change 和 blur 重复提交
const attributeOptionsRequestVersion = ref(0);
const propertyRevisions = new Map<number, number>();

function markPropertyRemoved(propertyId: number) {
  propertyRevisions.set(
    propertyId,
    (propertyRevisions.get(propertyId) ?? 0) + 1,
  );
}

function clonePropertyList(list: PropertyAndValues[]): PropertyAndValues[] {
  return list.map((property) => ({
    ...property,
    values: (property.values ?? []).map((value) => ({ ...value })),
  }));
}

function applyPropertyList(nextList: PropertyAndValues[]) {
  const nextPropertyIds = new Set(nextList.map((property) => property.id));
  for (const property of attributeList.value) {
    if (!nextPropertyIds.has(property.id)) {
      markPropertyRemoved(property.id);
    }
  }
  attributeOptionsRequestVersion.value += 1;
  attributeList.value = nextList;
  emit('change', nextList);
}

/** 按属性编号保存输入框引用，避免属性删除后索引错位。 */
function setInputRef(propertyId: number, el: unknown) {
  if (el === null || el === undefined) {
    inputRef.value.delete(propertyId);
    return;
  }
  inputRef.value.set(propertyId, el as InputRefItem);
}

watch(
  () => props.propertyList,
  (data) => {
    if (!data) {
      return;
    }
    const nextPropertyIds = new Set(data.map((property) => property.id));
    for (const property of attributeList.value) {
      if (!nextPropertyIds.has(property.id)) {
        markPropertyRemoved(property.id);
      }
    }
    attributeOptionsRequestVersion.value += 1;
    attributeList.value = clonePropertyList(data);
    activePropertyId.value = null;
    inputValue.value = [];
  },
  {
    deep: true,
    immediate: true,
  },
);

/** 删除属性值 */
function handleCloseValue(propertyId: number, value: PropertyAndValues) {
  const nextList = clonePropertyList(attributeList.value);
  const propertyIndex = nextList.findIndex((item) => item.id === propertyId);
  if (propertyIndex === -1) {
    return;
  }
  const property = nextList[propertyIndex];
  if (!property) {
    return;
  }
  property.values = (property.values ?? []).filter(
    (item) => item.id !== value.id,
  );
  applyPropertyList(nextList);
}

/** 删除属性 */
function handleCloseProperty(item: PropertyAndValues) {
  const nextList = attributeList.value.filter(
    (attribute) => attribute.id !== item.id,
  );
  applyPropertyList(nextList);
}

/** 显示输入框并获取焦点 */
async function showInput(propertyId: number) {
  const property = attributeList.value.find((item) => item.id === propertyId);
  if (!property) {
    return;
  }
  activePropertyId.value = propertyId;
  attributeOptions.value = [];
  inputRef.value.get(property.id)?.focus?.();
  // 获取属性下拉选项
  await getAttributeOptions(property.id);
}

/** 定义 success 事件，用于操作成功后的回调 */
async function handleInputConfirm(propertyId: number) {
  // 从数组中取最后一个输入的值（tags 模式下 inputValue 是数组）
  const currentValue = inputValue.value?.[inputValue.value.length - 1]?.trim();

  if (!currentValue) {
    activePropertyId.value = null;
    inputValue.value = [];
    return;
  }

  const pendingKey = `${propertyId}:${currentValue}`;
  if (pendingValues.has(pendingKey)) {
    return;
  }

  // 1. 重复添加校验
  const currentProperty = attributeList.value.find(
    (item) => item.id === propertyId,
  );
  if (!currentProperty) {
    activePropertyId.value = null;
    inputValue.value = [];
    return;
  }
  if (currentProperty.values?.some((item) => item.name === currentValue)) {
    message.warning('已存在相同属性值，请重试');
    activePropertyId.value = null;
    inputValue.value = [];
    return;
  }

  pendingValues.add(pendingKey);

  // 2.1 情况一：属性值已存在，则直接使用并结束
  const existValue = attributeOptions.value.find(
    (item) => item.name === currentValue,
  );
  if (existValue) {
    pendingValues.delete(pendingKey);
    activePropertyId.value = null;
    inputValue.value = [];
    const nextList = clonePropertyList(attributeList.value);
    const propertyIndex = nextList.findIndex((item) => item.id === propertyId);
    if (propertyIndex === -1) {
      return;
    }
    nextList[propertyIndex]?.values?.push({
      id: existValue.id!,
      name: existValue.name,
    });
    applyPropertyList(nextList);
    return;
  }

  // 2.2 情况二：新属性值，则进行保存
  const requestVersion = props.changeVersion;
  const requestPropertyRevision = propertyRevisions.get(propertyId) ?? 0;
  activePropertyId.value = null;
  inputValue.value = [];
  try {
    const id = await createPropertyValue({
      propertyId,
      name: currentValue,
    });
    if (
      requestVersion !== props.changeVersion ||
      requestPropertyRevision !== (propertyRevisions.get(propertyId) ?? 0) ||
      !attributeList.value.some((item) => item.id === propertyId)
    ) {
      return;
    }
    const nextList = clonePropertyList(attributeList.value);
    const propertyIndex = nextList.findIndex((item) => item.id === propertyId);
    if (propertyIndex === -1) {
      return;
    }
    nextList[propertyIndex]?.values?.push({
      id,
      name: currentValue,
    });
    message.success($t('ui.actionMessage.operationSuccess'));
    applyPropertyList(nextList);
  } catch {
    message.error($t('ui.actionMessage.operationFailed'));
  } finally {
    pendingValues.delete(pendingKey);
  }
}

/** 获取商品属性下拉选项 */
async function getAttributeOptions(propertyId: number) {
  const requestVersion = ++attributeOptionsRequestVersion.value;
  try {
    const options = await getPropertyValueSimpleList(propertyId);
    if (
      requestVersion === attributeOptionsRequestVersion.value &&
      attributeList.value.some((item) => item.id === propertyId)
    ) {
      attributeOptions.value = options;
    }
  } catch {
    if (requestVersion === attributeOptionsRequestVersion.value) {
      attributeOptions.value = [];
    }
  }
}
</script>

<template>
  <Col v-for="attribute in attributeList" :key="attribute.id">
    <Divider class="my-3" />
    <div class="mt-2 flex flex-wrap items-center gap-2">
      <span class="mx-1">属性名：</span>
      <Tag
        :closable="!isDetail"
        class="mx-1"
        color="success"
        @close="handleCloseProperty(attribute)"
      >
        {{ attribute.name }}
      </Tag>
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-2">
      <span class="mx-1">属性值：</span>
      <Tag
        v-for="value in attribute.values"
        :key="value.id"
        :closable="!isDetail"
        class="mx-1"
        @close="handleCloseValue(attribute.id, value)"
      >
        {{ value?.name }}
      </Tag>
      <Select
        v-show="inputVisible(attribute.id)"
        :id="`input${attribute.id}`"
        :ref="(el) => setInputRef(attribute.id, el)"
        v-model:value="inputValue"
        allow-clear
        mode="tags"
        :max-tag-count="1"
        :filter-option="true"
        size="small"
        style="width: 100px"
        @blur="handleInputConfirm(attribute.id)"
        @change="handleInputConfirm(attribute.id)"
        @keyup.enter="handleInputConfirm(attribute.id)"
      >
        <Select.Option
          v-for="item2 in attributeOptions"
          :key="item2.id"
          :value="item2.name"
        >
          {{ item2.name }}
        </Select.Option>
      </Select>
      <Tag
        v-if="!isDetail"
        v-show="!inputVisible(attribute.id)"
        @click="showInput(attribute.id)"
        class="mx-1 border-dashed bg-muted"
      >
        <div class="flex items-center">
          <IconifyIcon class="mr-2" icon="lucide:plus" />
          添加
        </div>
      </Tag>
    </div>
  </Col>
</template>
